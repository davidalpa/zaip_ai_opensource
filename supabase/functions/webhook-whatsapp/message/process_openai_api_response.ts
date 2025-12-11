// OpenAI Responses API call via fetch (no SDK),
// with debug logs and robust output text extraction.

import { MCP_SERVER_URL, MCP_SERVER_LABEL, MCP_ALLOWED_TOOLS, ENABLE_MCP } from "../index.ts";
import { AgentConfig } from "../config/agent_config.ts";

export interface ZaipLLMParams {
    input: string | any[];
    conversation: string;
    apiKey?: string;
    mcpToken?: string;
    model?: string;
    temperature?: number;
    instructions: string;
    allowedTools?: string[];
    systemMessage: string;
    reasoningEffort?: string;
    reasoningVerbosity?: string;
    onBeforeRequest?: (body: any) => Promise<void>;
}

export interface ZaipLLMResult {
    outputText: string | null;
    raw: unknown;
    requestBody?: any;
    debugInfo?: any;
}

export async function callZaipLLM(
    params: ZaipLLMParams,
): Promise<ZaipLLMResult> {
    const {
        input,
        conversation,
        apiKey,
        mcpToken = "",
        model = "gpt-5-mini",
        temperature,
        instructions,
        allowedTools,
        systemMessage,
        reasoningEffort,
        reasoningVerbosity,
        onBeforeRequest,
    } = params;


    const conversationId = conversation.trim();

    // Prepare input (array or string)
    let inputPayload: any[] = [];
    if (Array.isArray(input)) {
        inputPayload = input;
    } else {
        inputPayload = [
            {
                role: "system",
                content: [
                    {
                        type: "input_text",
                        text: systemMessage,
                    },
                ],
            },
            {
                role: "user",
                content: [
                    {
                        type: "input_text",
                        text: typeof input === "string" ? input : JSON.stringify(input),
                    },
                ],
            },
        ];
    }

    // GPT-5 vs Others Logic (Reasoning vs Temperature)
    const isGpt5 = model.includes("gpt-5");
    const reasoningConfig = isGpt5 ? { effort: reasoningEffort ?? AgentConfig.openai_reasoning_effort } : undefined;
    const temperatureConfig = !isGpt5 ? (temperature ?? AgentConfig.openai_temperature) : undefined;

    // Tools dinâmicas
    const toolsList = allowedTools ?? MCP_ALLOWED_TOOLS;

    // 5) Build Responses API body
    const requestBody: any = {
        model: model,
        conversation: conversationId,
        instructions,
        input: inputPayload,
    };

    // Inject Tools ONLY if MCP is enabled and tools are available
    if (ENABLE_MCP && toolsList && toolsList.length > 0) {
        requestBody.tools = [
            {
                type: "mcp",
                server_label: MCP_SERVER_LABEL,
                server_url: MCP_SERVER_URL,
                headers: {
                    Authorization: `Bearer ${mcpToken}`,
                },
                allowed_tools: MCP_ALLOWED_TOOLS,
                require_approval: AgentConfig.mcp_require_approval,
            },
        ];
        requestBody.tool_choice = "auto";
        requestBody.parallel_tool_calls = false;
        requestBody.max_tool_calls = 3;
    }


    if (isGpt5) {
        requestBody.reasoning = reasoningConfig;
        requestBody.text = {
            verbosity: reasoningVerbosity ?? AgentConfig.openai_reasoning_verbosity,
            format: { type: "json_object" },
        };
    } else if (temperatureConfig !== undefined) {
        requestBody.temperature = temperatureConfig;
    }

    // Hook: Execute onBeforeRequest if provided
    if (onBeforeRequest) {
        try {
            await onBeforeRequest(requestBody);
        } catch (e) {
            // console.error("Error in onBeforeRequest hook:", e);
            // We don't block the flow if logging fails, or do we?
            // User request implies logging is important. But blocking the AI call due to log failure might be bad.
            // I'll log error and proceed.
        }
    }

    // 6) Call Responses API
    const url = "https://api.openai.com/v1/responses";
    let resp;
    try {
        resp = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
    } catch (e) {
        (e as any).requestBody = requestBody;
        throw e;
    }

    if (!resp.ok) {
        const errorText = await resp.text();
        // Throw error with details to be captured and logged at the end
        const err = new Error(`OpenAI API Error: ${resp.status} - ${errorText}`);
        (err as any).requestBody = requestBody;
        throw err;
    }

    const data: any = await resp.json();

    // 7) Extração robusta do texto

    let outputText: string | null = null;

    // Tenta iterar sobre todos os itens de output (pode haver reasoning antes da message)
    if (Array.isArray(data?.output)) {
        for (const item of data.output) {
            // If item has content (array), try to extract text
            if (item && Array.isArray(item.content)) {
                for (const c of item.content) {
                    // Case 1: c.text is string
                    if (typeof c?.text === "string") {
                        outputText = c.text;
                        break;
                    }
                    // Caso 2: c.text.value é string
                    if (c?.text && typeof c.text.value === "string") {
                        outputText = c.text.value;
                        break;
                    }
                    // Caso 3: c.output_text é string
                    if (typeof c?.output_text === "string") {
                        outputText = c.output_text;
                        break;
                    }
                }
            }
            // If text found, stop searching in other output items
            if (outputText) break;
        }
    }

    // Fallback: campo agregado output_text no topo
    if (!outputText && typeof data?.output_text === "string") {
        outputText = data.output_text;
    }

    // Fallback: Estrutura Padrão Chat Completion (choices[0].message.content)
    if (!outputText && Array.isArray(data?.choices) && data.choices.length > 0) {
        const content = data.choices[0].message?.content;
        if (typeof content === "string") {
            outputText = content;
        }
    }



    return {
        outputText: typeof outputText === "string" ? outputText : null,
        raw: data,
        requestBody: requestBody, // Added for upstream log
        debugInfo: {
            model: model,
            requestBody: JSON.stringify(requestBody, null, 2)
        }
    };
}

// Helper to read error text without breaking if body was already consumed
async function safeReadText(resp: Response): Promise<string> {
    try {
        return await resp.text();
    } catch {
        return "<no-body>";
    }
}

export async function appendUserMessageToOpenAI(
    apiKey: string,
    conversationId: string,
    messageContent: string
): Promise<void> {
    const url = "https://api.openai.com/v1/messages";

    const body = {
        conversation_id: conversationId,
        role: "user",
        content: [
            {
                type: "input_text",
                text: messageContent
            }
        ]
    };

    const resp = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`OpenAI Append Message Error: ${resp.status} - ${errorText}`);
    }
}
