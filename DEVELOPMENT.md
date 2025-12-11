# Development Guide — WhatsApp Webhook (Edge Function)

This document is the **technical source of truth** for the `webhook-whatsapp` Edge Function.  
It explains the architecture, execution flow, design principles, and critical implementation details behind the WhatsApp → Supabase → OpenAI orchestration.

---

# 1. Core Architecture & Engineering Principles

The system follows a **modular step-based architecture**, prioritizing clarity, debuggability, and production reliability.

### Core Principles

1. **Linear Orchestration**
   - `index.ts` is the conductor.
   - No business logic is placed here; it only routes, validates, and dispatches processing.

2. **Database Isolation**
   - No SQL inside controllers or steps.
   - All reads/writes exist in `database_queries/` (`sql_selects`, `sql_inserts`, `sql_updates`).

3. **Dependency Injection**
   - The Supabase client is instantiated only once (in `index.ts`).
   - It is passed downward into steps for clean scope control.

4. **Media Dual-Entry Rule**
   - Every audio/image message creates **two records**:
     - Original media URL (history fidelity)
     - Transcription/description (AI context)

5. **Strict Env Isolation**
   - Only `index.ts` reads environment variables.
   - All other modules receive configuration using parameters, not `Deno.env`.

6. **Model Context Protocol (MCP) Integration**
   - Tool calls, RAG queries, and extended capabilities are handled by `process_openai_api_response.ts`.
   - Supports internal MCP (RAG) or external MCP servers (e.g., n8n).

7. **Strong Type Safety**
   - All structures, payloads, and return values use interfaces from `types/`.

---

# 2. File & Module Structure

### 📂 Root (Orchestration Layer)

#### `index.ts` — *The Conductor*
- Entry point (`Deno.serve`).
- Immediately returns `200 OK` to WhatsApp to avoid timeouts.
- Dispatches full processing to `EdgeRuntime.waitUntil`.
- Centralizes all environment variable loading.

#### `event_router.ts` — *The Router*
- Determines whether the event is:
  - `messages` → conversational flow
  - `account_update`, `message_template_status_update`, etc. → audit logging only
- Normalizes payload format and prevents undefined-field crashes.

---

### 📂 `message/` — Conversational Engine

Contains the full **5-step pipeline**:

| Step | File | Responsibility |
|------|------|----------------|
| 1 | `step_1_identification.ts` | Identify channel, inbox, and phone number |
| 2 | `step_2_session.ts` | Manage Contact + Conversation session |
| 3 | `step_3_message_type.ts` | Process text/media and persist messages |
| 4 | `step_4_ai_response.ts` | Build prompt, run AI, call MCP tools |
| 5 | `step_5_send_whatsapp_message.ts` | Send reply bubbles via WhatsApp Graph API |

Utilities:
- `message_controller.ts`: Calls steps in strict order.
- `process_openai_api_response.ts`: Tool handling, RAG, reasoning control.
- `create_prompt.ts`: Dynamic prompt composition.

---

### 📂 `database_queries/` — Data Layer

100% of SQL lives here:

- `sql_selects.ts`
- `sql_inserts.ts`
- `sql_updates.ts`

This ensures:
- SRP (Single Responsibility Principle)
- Maximum reusability
- Clean TypeScript signatures

---

### 📂 `config/` — Funnel, Steps, and Agents

- `steps_config.ts`
  - Maps **funnel stages**, step transitions, and prompt packets.
  - Defines agent switching logic.
- `agent_config.ts`
  - MCP toggle (`enable_mcp`)
  - Tool allowlist (`mcp_allowed_tools`)
  - Model-specific reasoning configs

---

### 📂 `prompts/` — AI Instruction Layer

Each prompt is a TypeScript module:

- `prompt_instructions_agent_*.ts` — System prompts for each agent persona.
- `prompt_step_packet_*.ts` — Step Packet definitions (scripts + extraction rules).

---

### 📂 `types/` — Strong Typing

Centralized TypeScript interfaces:

- `FlowState`
- `SessionResult`
- `ContactRecord`
- `ConversationRecord`
- `StepPacket`
- etc.

---

# 3. Execution Flow (Step-by-Step)

### Pre-Processing (before Step 1)

1. **Immediate 200 OK response**  
   WhatsApp requires ultra-fast ACK; all processing runs asynchronously.

2. **Background Execution**  
   Via `EdgeRuntime.waitUntil`.

3. **Payload Validation**  
   Reject early if message or sender info is missing.

4. **Reset Command (`#LIMPAR`)**  
   Clears conversation state and terminates early.

---

## Step 1 — Identification

**Goal:**  
Resolve which inbox and phone number the webhook belongs to.

**Rules:**
- The `phone_number_id` must exist in `zaip_inbox`.
- If inbox not found → CRITICAL ERROR.

---

## Step 2 — Session Management

**Goals:**

- Ensure valid:
  - Contact (`zaip_contacts`)
  - Conversation (`zaip_conversations`)
- Load:
  - `step_process`
  - `state_process`

**7-Day Rule:**
- If last message > 7 days → open a new conversation ID.

**Thread ID:**
- Manages per-session OpenAI Thread for message history.

---

## Step 3 — Message Processing & Persistence

**Goal:**  
Normalize content and persist it to the database.

**Rules:**

- **Debounce:** Avoid double-processing using incoming message ID.
- **Media:** 
  - Save raw URL entry.
  - Create second entry with transcription.
  - Use transcription ID for downstream flow to avoid loops.
- **Privacy:**  
  Only the transcription enters AI context.

---

## Step 4 — Artificial Intelligence (Dynamic Orchestration)

**Goal:**  
Generate an AI response respecting funnel stage, step logic, and agent persona.

### Mechanics

- Build dynamic prompt using:
  - Agent Instruction (`getInstructionPrompt`)
  - Step Packet (`getProcessPrompt`)
  - Conversation history
  - RAG (if triggered via MCP)

- Send “typing…” signal to WhatsApp using Graph API.

### Logging

OpenAI interaction is fully persisted in:

- `log_openai_requests.inputs`
- `log_openai_requests.outputs`
- Token usage

---

## Step 5 — Sending Messages

**Goal:** Deliver message(s) to the user via WhatsApp Graph API.

Rules:

- Long responses are split into chat bubbles.
- Typing indicator simulates human-like delays.
- Messages are automatically marked as “read”.

---

# 4. Funnel Stages (Conversation Pipeline)

The conversation automatically advances through funnel stages based on step completion.

Mappings between:

- `current_step`
- `step_process` (funnel stage)

are defined in `steps_config.ts`.

---

# 5. Event Routing (Webhook)

`event_router.ts` handles event classification:

### Supported Events

| Event Type | Behavior |
|------------|----------|
| `messages` | Routed to AI pipeline |
| `message_echoes` | Logged only |
| `account_update` | Logged only |
| `message_template_status_update` | Logged only |
| `phone_number_quality_update` | Logged only |

Also handles:
- **GET handshake** (`hub.challenge`)
- **Raw logging** to `log_meta_whebhook`

---

# 6. Environment Variables

Read **exclusively** in `index.ts`.

### Required

- `SUPABASE_PROJECT_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `FACEBOOK_ACCESS_TOKEN`
- `FACEBOOK_API_VERSION`
- `FACEBOOK_PHONE_NUMBER_ID`
- `FACEBOOK_WEBHOOK_CODE_VERIFY`

### Optional / Advanced

- `STORAGE_PUBLIC_URL`
- `MCP_TOKEN`
- `MCP_SERVER_URL`
- `MCP_SERVER_LABEL` (default: `zaip-mcp-n8n`)

---

# 7. Error Handling & Observability

### Centralized Log Strategy

- All steps log into a shared `executionLog`.
- Final output printed as one JSON blob (for log scrapers).
- Stored in `log_results`.

### Golden Rules

- No scattered `console.log`.  
  Use `logStep(...)`.

### Error Classification

#### ⛔ Critical Errors
Flow stops immediately.

Examples:
- Invalid payload  
- Missing inbox  
- OpenAI API failure  
- Session creation failure  

#### ⚠️ Non-Critical Errors
Flow continues, error is logged.

Examples:
- Failed secondary log  
- Failed message insertion (after already sent)  

---

# 8. Log Tables

- `log_results` — Full execution summary
- `log_openai_requests` — Inputs/outputs/tokens
- `log_meta_whebhook` — Raw WhatsApp events
- `log_mcp` — Tool calls, vector search, auth

---

# 9. Deployment

### Manual Deploy

```bash
supabase functions deploy --no-verify-jwt
```

### CI/CD (GitHub Actions)

Workflow included:
`.github/workflows/deploy-edgefunctions.yml`

Push to `main` → auto-deploy.

---

# 10. MCP Architecture & Internal RAG

The system supports a **fully modular MCP pipeline**, allowing flexibility between internal and external tools.

### 10.1 Concept

* Webhook is **MCP-agnostic**.
* Tool execution depends on `MCP_SERVER_URL`.
* Can target:

  * Internal MCP function (default)
  * External n8n workflow
  * Any MCP server

---

## 10.2 Internal RAG (Supabase pgvector)

The repository includes a full internal RAG engine:

* Static KB: `knowledge_base.ts`
* Vector DB: `zz_vector`
* Embeddings: OpenAI `text-embedding-3-small`
* RPC Search: `match_d`

Flow:

1. AI triggers tool (e.g. `get_company_informations`)
2. MCP generates embedding
3. Calls RPC `match_d`
4. Returns relevant chunks
5. Chunks are injected into AI context

---

## 10.3 KB Auto-Refresh

KB must be re-embedded after every change.

### Manual Refresh (recommended)

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/mcp" \
  -H "Authorization: Bearer <MCP_TOKEN>" \
  -d '{"jsonrpc": "2.0", "method": "call", "id": "manual-refresh", "params": { "name": "admin_refresh_knowledge" }}'
```

### Automatic Refresh (optional)

Uncomment refresh step in `.github/workflows/deploy-edgefunctions.yml`.

---

# End of Document

This guide reflects the **intended production-ready design** of the WhatsApp → Supabase → OpenAI orchestration layer.

For architectural expansions or questions, consult `DEVELOPMENT.md` or open an issue in the repository.
