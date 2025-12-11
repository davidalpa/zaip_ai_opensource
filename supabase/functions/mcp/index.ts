// index.ts — MCP server (Supabase Edge) → Internal RAG (pgvector + OpenAI)
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ALLOWED, DESCRIPTIONS, INPUT_SCHEMAS, OUTPUT_SCHEMA_MIN } from "./tools.ts";
import { KNOWLEDGE_BASE_DATA, VECTOR_CONFIG } from "./vector_config.ts";
import { RAG_PROMPTS } from "./prompts_rag.ts";

const MCP_TOKEN = Deno.env.get("MCP_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

// Tools for deduplication (short time window)
// Since we removed update tools, we might not need this anymore unless get_* tools need dedup.
// Keeping strictly empty if no tools require dedup for now.
const DEDUP_TOOLS = new Set<string>([]);
const DEDUP_TTL_MS = 3000;
const recentToolCalls = new Map();

// Helper: JSON response with CORS
function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*"
    }
  });
}

// Argument Validation
function validateArgs(args: any, schema: any): string | null {
  if (!schema) return null;
  if (!args || typeof args !== "object") args = {};

  if (schema.additionalProperties === false) {
    const allowed = new Set(Object.keys(schema.properties || {}));
    const argKeys = Object.keys(args);
    for (const k of argKeys) {
      if (!allowed.has(k)) return `unexpected field: ${k}`;
    }
  }

  if (Array.isArray(schema.required)) {
    for (const r of schema.required) {
      if (!(r in args)) return `missing field: ${r}`;
    }
  }

  const props = schema.properties || {};
  for (const k of Object.keys(props)) {
    const def = props[k];
    const val = args[k];

    if (def?.minLength && typeof val === "string") {
      if (val.trim().length < def.minLength) return `${k} must have at least ${def.minLength} chars`;
    }
    if (def?.enum && val != null) {
      if (!def.enum.includes(val)) return `${k} must be one of: ${def.enum.join(", ")}`;
    }
  }
  return null;
}

function getMethodKind(method: string) {
  const m = String(method || "").toLowerCase();
  if (/(^|[^\w])initialize([^\w]|$)/.test(m)) return "initialize";
  if (/tools[^a-z]*list/.test(m)) return "list";
  if (/(tools\/|)(call|invoke|execute)/i.test(m)) return "call";
  return null;
}

function stableArgsKey(args: any) {
  try {
    if (!args || typeof args !== "object") return String(args);
    const keys = Object.keys(args).sort();
    const obj: any = {};
    for (const k of keys) obj[k] = args[k];
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

// --- RAG & Vector Logic ---

async function createEmbedding(text: string) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.replace(/\n/g, " ")
    })
  });
  const data = await res.json();
  if (data?.error) throw new Error(`OpenAI Embedding Error: ${data.error.message}`);
  return data.data[0].embedding;
}

async function createEmbeddingsBatch(texts: string[]) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts.map(t => t.replace(/\n/g, " "))
    })
  });
  const data = await res.json();
  if (data?.error) throw new Error(`OpenAI Embedding Error: ${data.error.message}`);
  return data.data.map((d: any) => d.embedding);
}

function chunkText(text: string): string[] {
  const { Chunk_Size, Chunk_Overlap, Split_Code } = VECTOR_CONFIG;

  if (Split_Code === 'markdown') {
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const para of paragraphs) {
      if ((currentChunk.length + para.length) > Chunk_Size) {
        if (currentChunk) chunks.push(currentChunk.trim());
        // Simple overlap attempt: keep last N characters? 
        // For markdown, we prioritize clean paragraph breaks over exact overlap, 
        // so we reset currentChunk to para. 
        currentChunk = para;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + para;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
  }

  // Fallback to strict character chunking with overlap
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + Chunk_Size, text.length);
    chunks.push(text.slice(start, end));
    start += (Chunk_Size - Chunk_Overlap);
  }
  return chunks;
}

// Logger type definition
type Logger = (msg: string, data?: any) => void;

async function refreshKnowledgeBase(supabase: any, log: Logger) {
  log("Starting knowledge base refresh...");

  // 1. Delete all existing records
  const { error: delError, count: delCount } = await supabase.from("zz_vector").delete().neq("id", 0);
  if (delError) {
    log("Delete error", delError);
    throw new Error(`Delete failed: ${delError.message}`);
  }
  log(`Deleted ${delCount} existing records.`);

  const allChunks: { content: string, metadata: any }[] = [];

  // 2. Fragment existing data
  for (const item of KNOWLEDGE_BASE_DATA) {
    for (const [key, value] of Object.entries(item)) {
      if (typeof value !== "string" || !value.trim()) continue;

      const chunks = chunkText(value);
      chunks.forEach(c => {
        allChunks.push({
          content: c,
          metadata: { source_key: key, original_length: value.length } // Minimal metadata
        });
      });
    }
  }

  log(`Total chunks generated: ${allChunks.length}. Starting batch processing...`);

  // 3. Batch Process (Embed + Insert)
  const { Embedding_Batch_Size } = VECTOR_CONFIG;
  let insertedChunks = 0;

  for (let i = 0; i < allChunks.length; i += Embedding_Batch_Size) {
    const batch = allChunks.slice(i, i + Embedding_Batch_Size);
    const textBatch = batch.map(b => b.content);

    log(`Processing batch ${i / Embedding_Batch_Size + 1}: ${batch.length} items.`);

    try {
      const embeddings = await createEmbeddingsBatch(textBatch);

      const rows = batch.map((b, idx) => ({
        content: b.content,
        metadata: b.metadata,
        embedding: embeddings[idx]
      }));

      const { error: insError } = await supabase.from("zz_vector").insert(rows);

      if (insError) {
        log(`Failed to insert batch starting at ${i}`, insError);
      } else {
        insertedChunks += rows.length;
      }

    } catch (err) {
      log(`Error processing batch starting at ${i}`, err);
    }
  }

  log(`Refresh complete. Inserted: ${insertedChunks}/${allChunks.length}.`);
  return `Knowledge base refreshed. Processed ${allChunks.length} chunks, inserted ${insertedChunks} successfully.`;
}

async function searchKnowledgeBase(supabase: any, query: string) {
  const [embedding] = await createEmbeddingsBatch([query]);

  const { data: documents, error } = await supabase.rpc("match_d", {
    query_embedding: embedding,
    match_count: 5, // Top 5 chunks
    filter: {}
  });


  if (error) throw new Error(`Vector match failed: ${error.message}`);


  const context = documents.map((d: any) => `[Source: ${d.metadata?.source_key || 'unknown'}]\n${d.content}`).join("\n\n---\n\n");


  return context || "No relevant information found in knowledge base.";

}


// --- Main Handler ---

Deno.serve(async (req: Request) => {
  const logs: { timestamp: string; message: string; data?: any }[] = [];
  let logType = "ERROR"; // Default to error
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Centralized Helper Log
  const log: Logger = (msg: string, data?: any) => {
    const entry = { timestamp: new Date().toISOString(), message: msg, data };
    logs.push(entry);
    console.log(`[MCP] ${msg}`, data ? JSON.stringify(data) : "");
  };

  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version"
        }
      });
    }

    log("Incoming Request", { method: req.method, url: req.url });
    log("Env Check", { url: !!SUPABASE_URL, key: !!SUPABASE_SERVICE_ROLE_KEY, token: !!MCP_TOKEN });

    // Auth
    const auth = req.headers.get("authorization") ?? "";
    if (!MCP_TOKEN || auth !== `Bearer ${MCP_TOKEN}`) {
      log("Auth Failed", { expected_prefix: `Bearer ${MCP_TOKEN.substring(0, 3)}...`, got: auth.substring(0, 10) });
      return json({ code: 401, message: "Unauthorized" }, 401);
    }

    if (req.method !== "POST") return json({ code: 405, message: "Method Not Allowed" }, 405);

    // Parse Body
    let body: any;
    try {
      body = await req.json();
      log("Body Parsed", { method: body?.method, tool: body?.params?.name });
    } catch (e: any) {
      log("JSON Parse Error", e.message);
      return json({ code: 400, message: "Bad JSON" }, 400);
    }

    const { id, method, params } = body ?? {};
    const kind = getMethodKind(method);

    // Dispatch
    if (kind === "initialize") {
      log("Initializing Session");
      logType = "SUCCESS";
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          serverInfo: { name: "zaip-mcp-rag", version: "edge-rag-1" },
          capabilities: { tools: {} }
        }
      });
    }

    if (kind === "list") {
      log("Listing Tools");
      const list = [...ALLOWED, "admin_refresh_knowledge"];
      const tools = list.map((name) => ({
        name,
        description: DESCRIPTIONS[name] || (name === "admin_refresh_knowledge" ? "Re-indexa a base de conhecimento vetorial." : ""),
        inputSchema: INPUT_SCHEMAS[name] ?? { type: "object", additionalProperties: true },
        outputSchema: OUTPUT_SCHEMA_MIN
      }));
      logType = "SUCCESS";
      return json({ jsonrpc: "2.0", id, result: { tools } });
    }

    if (kind === "call") {
      const name = params?.name;
      const args = params?.arguments ?? {};
      log(`Calling Tool: ${name}`);

      // Validate Tool Existence
      if (!name || (!ALLOWED.includes(name) && name !== "admin_refresh_knowledge")) {
        log("Tool not found", name);
        return json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Tool not found" } });
      }

      // Schema Validation
      if (ALLOWED.includes(name)) {
        const vErr = validateArgs(args, INPUT_SCHEMAS[name]);
        if (vErr) {
          log("Schema Validation Error", vErr);
          return json({
            jsonrpc: "2.0", id, result: {
              content: [{ type: "text", text: JSON.stringify({ ok: false, error: `args validation: ${vErr}` }) }],
              is_error: true
            }
          });
        }
      }

      // Deduplication Logic
      if (DEDUP_TOOLS.has(name)) {
        const now = Date.now();
        const key = `${name}:${stableArgsKey(args)}`;
        const last = recentToolCalls.get(key) ?? 0;
        if (now - last < DEDUP_TTL_MS) {
          log("Dedup tool call", name);
          return json({
            jsonrpc: "2.0", id, result: {
              content: [{ type: "text", text: JSON.stringify({ ok: true, dedup: true, tool: name }) }],
              is_error: false
            }
          });
        }
        recentToolCalls.set(key, now);
      }

      // Execution
      try {
        let resultText = "";

        if (name === "admin_refresh_knowledge") {
          resultText = await refreshKnowledgeBase(supabase, log);
          logType = "SUCCESS";
        }
        else if (name === "get_company_informations" || name.startsWith("get_")) {
          const query = args.input || "";
          log("RAG Search Query", query);

          const ragConfig = RAG_PROMPTS[name] || { query_prefix: "", result_instruction: "" };
          const enhancedQuery = `${ragConfig.query_prefix} ${query}`.trim();
          const context = await searchKnowledgeBase(supabase, enhancedQuery);
          const finalOutput = `${context}\n\n[SYSTEM NOTE]: ${ragConfig.result_instruction}`;

          resultText = JSON.stringify({
            ok: true,
            info: finalOutput,
            note: `Information retrieved for ${name} using RAG.`
          });
          logType = "SUCCESS";
        }
        else {
          // Fallback
          resultText = JSON.stringify({ ok: false, error: "Tool implementation missing" });
        }

        return json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: resultText }],
            is_error: false
          }
        });

      } catch (execErr: any) {
        log("Tool Execution Error", execErr.message);
        return json({
          jsonrpc: "2.0", id, result: {
            content: [{ type: "text", text: JSON.stringify({ ok: false, error: execErr.message }) }],
            is_error: true
          }
        });
      }
    }

    return json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } });

  } catch (globalErr: any) {
    log("Global Exception", globalErr.message);
    return json({ code: 500, message: "Internal Server Error" }, 500);
  } finally {
    // Flush logs to DB
    if (logs.length > 0) {
      console.log("LOG: Flushing logs to DB...", logType);
      try {
        await supabase.from("log_mcp").insert({
          type: logType,
          json: logs
        });
      } catch (logErr) {
        console.error("LOG: Failed to write to log_mcp", logErr);
      }
    }
  }
});

