import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
export type { SupabaseClient };
import { identifyEventType, routeIncomingEvent } from "./event_router.ts";
import { FlowState, StepLog } from "./types/type_flow.ts";
import { insertWebhookResultLog } from "./database_queries/sql_inserts.ts";
import { AgentConfig } from "./config/agent_config.ts";
import { Langfuse } from "npm:langfuse";

export const langfuse = new Langfuse({
    publicKey: Deno.env.get("LANGFUSE_PUBLIC_KEY"),
    secretKey: Deno.env.get("LANGFUSE_SECRET_KEY"),
    baseUrl: Deno.env.get("LANGFUSE_BASE_URL"),
    flushAt: 1,
    release: "v1.0", // ou versão do seu app
    environment: "production"
});

// =================================================================
// WEBHOOK AND API CONFIGURATION
// =================================================================
import { ENVS } from "./config/env_config.ts";

// =================================================================
// WEBHOOK AND API CONFIGURATION
// =================================================================
// Configs are now centralized in config/env_config.ts
export const {
    FACEBOOK_API_VERSION,
    FACEBOOK_WEBHOOK_CODE_VERIFY,
    FACEBOOK_WEBHOOK_URL,
    FACEBOOK_PHONE_NUMBER_ID,
    MCP_SERVER_URL,
    ENABLE_MCP,
    MCP_SERVER_LABEL,
    MCP_ALLOWED_TOOLS,
    STORAGE_PUBLIC_URL,
    SUPABASE_PROJECT_ID,
    SUPABASE_URL
} = ENVS;

const supabaseUrl = ENVS.SUPABASE_URL || `https://${ENVS.SUPABASE_PROJECT_ID}.supabase.co`;

if (supabaseUrl === "https://.supabase.co") {
    console.error("CRITICAL ERROR: Supabase URL invalid. Missing SUPABASE_PROJECT_ID or SUPABASE_URL.");
}

const supabaseKey = ENVS.SUPABASE_SERVICE_ROLE_KEY;
const mcpToken = ENVS.MCP_TOKEN;
const openaiApiKey = ENVS.OPENAI_API_KEY;
const facebookAccessToken = ENVS.FACEBOOK_ACCESS_TOKEN;
const supabase = createClient(supabaseUrl, supabaseKey);

Deno.serve(async (req: Request) => {
    // 0. Webhook Verification Handler (GET)
    if (req.method === "GET") {
        const url = new URL(req.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        const verifyToken = FACEBOOK_WEBHOOK_CODE_VERIFY;

        if (mode === "subscribe" && token === verifyToken) {
            return new Response(challenge, { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
    }

    // Capture start time and headers immediately
    const startTime = performance.now();
    const headers = Object.fromEntries(req.headers.entries());

    // 1. Read Raw Body Immediately
    let rawBody: any;
    try {
        rawBody = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ ok: false, status: "JSON Error", output: "Invalid JSON Body" }), { status: 400 });
    }

    // 2. Define Background Processing Logic
    const processEvent = async () => {
        // Initialize FlowState
        let state: FlowState = {
            supabase: supabase,
            conf: {
                startTime: startTime,
                facebookPhoneNumberId: FACEBOOK_PHONE_NUMBER_ID,
                storagePublicUrl: STORAGE_PUBLIC_URL,
                mcpServerUrl: MCP_SERVER_URL,
                mcpServerLabel: MCP_SERVER_LABEL,
                tokens: {
                    mcp: mcpToken,
                    facebook: facebookAccessToken,
                    openai: openaiApiKey
                }
            },
            data: {
                rawBody: rawBody,
                eventType: "unknown",
                field: "unknown",
                content: {}
            },
            logs: {
                timestamp: new Date().toISOString(),
                status: "pending",
                steps: [],
                errors: [],
                performance_seg: 0,
                performance_min: 0,
                // Add debug info
                info: `Headers: ${JSON.stringify(headers)}`
            },
        };

        let stepCounter = 1;
        const logStep = (step: string, status: StepLog["status"], data?: any, error?: any) => {
            const stepName = `${stepCounter}. ${step}`;
            stepCounter++;
            state.logs.steps.push({
                step: stepName,
                status,
                data: data === undefined ? "none" : data,
                error: error === undefined ? "none" : error
            });
        };

        try {
            logStep("init_background", "success", { method: req.method });

            // Debug Environment Variables (Presence Check)
            const envCheck = {
                facebookToken: state.conf.tokens.facebook ? "Exists (Length: " + state.conf.tokens.facebook.length + ")" : "Missing",
                openaiKey: state.conf.tokens.openai ? "Exists" : "Missing",
                mcpToken: state.conf.tokens.mcp ? "Exists" : "Missing",
                projectId: ENVS.SUPABASE_PROJECT_ID || "derived",
                supabaseUrl: ENVS.SUPABASE_URL ? "Exists" : "Missing"
            };
            logStep("init_env", "success", envCheck);

            // Extract WAMID for Debugging
            const wamid = rawBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
            if (wamid) {
                state.logs.info = (state.logs.info || "") + ` | WAMID: ${wamid}`;
            }

            logStep("read_body", "success", { preview: JSON.stringify(state.data.rawBody).substring(0, 500) });

            // 2. Extract Event Type
            const { eventType, field, body } = identifyEventType(state.data.rawBody);
            state.data.eventType = eventType;
            state.data.field = field;

            logStep("extract_event_type", "success", { eventType, field });

            // 3.1 Process Meta Integration and Triage
            await routeIncomingEvent(state, body, logStep);

        } catch (err) {
            state.logs.status = "critical_error";
            state.logs.errors.push(String(err));
            logStep("critical_error", "error", null, String(err));
        } finally {
            // Force error status if there are errors but status is success
            if (state.logs.errors.length > 0 && state.logs.status === "success") {
                state.logs.status = "error";
            }

            const endTime = performance.now();
            const durationMs = endTime - startTime;
            state.logs.performance_ms = durationMs;
            const performance_seg = parseFloat((durationMs / 1000).toFixed(2));
            const performance_min = parseFloat((durationMs / 60000).toFixed(2));

            state.logs.performance_seg = performance_seg;
            state.logs.performance_min = performance_min;

            const now = new Date();
            const isoString = now.toISOString();
            const timestampId = isoString.replace(/[-:T]/g, "").slice(0, 14);

            // Create a sanitized log for output
            // Ensure script_name_last_used is present even if not in content
            const scriptNameLastUsed = state.data.content.script_name_last_used || "None";

            const isFullLog = state.logs.status === "success" ||
                state.logs.status === "error" ||
                state.logs.status === "critical_error" ||
                state.logs.status.startsWith("skipped_");

            const baseLog = {
                date_time: isoString,
                status: state.logs.status,
                _id_contact: state.data.contactId,
                _id_conversation: state.data.conversationId,
                _id_group_message: state.data.conversationId
                    ? `${state.data.conversationId}${timestampId}`
                    : null,
                performance_first_response_seg: state.logs.performance_first_response_seg,
                performance_seg: state.logs.performance_seg,
                performance_min: state.logs.performance_min,
                errors: state.logs.errors,
            };

            let sanitizedLog: any;

            if (isFullLog) {
                sanitizedLog = {
                    ...baseLog,
                    step_process: state.data.stepProcess,
                    current_step: (state.data.context as any)?.current_step,

                    message_body_preview: state.data.content.messageBody?.substring(0, 100),
                    message: state.data.content.messageBody,
                    ai_response: state.data.content.aiResponse,
                    reason: state.data.content.reason,
                    slots: state.data.content.slots,
                    script_name_last_used: scriptNameLastUsed,
                    messages_to_send: state.data.content.messagesToSend,
                    contact_status: state.data.contactStatus,
                    conversation_status: state.data.conversationStatus,
                    steps: state.logs.steps,
                    ...(state.logs.actions && { actions: state.logs.actions }),
                    ...(state.logs.warnings && { warnings: state.logs.warnings }),
                    ...(state.logs.account_update_info && { account_update_info: state.logs.account_update_info }),
                    ...(state.logs.info && { info: state.logs.info })
                };
            } else {
                sanitizedLog = {
                    ...baseLog,
                    ...(state.logs.info && { info: state.logs.info })
                };
            }

            console.log(`GENERAL LOG [${state.data.eventType}] [${state.logs.status}]:`, sanitizedLog);

            // Save LOG GERAL to database
            const SUCCESS_STATUSES = [
                "success",
                "debounced",
                "reset_completed",
                "ignored_status_update",
                "early_return_payload_validation",
                "success_account_update"
            ];

            // Check if status indicates success (and allow skipped rules to be success if no errors)
            const isStatusSuccess = SUCCESS_STATUSES.includes(state.logs.status) ||
                (state.logs.status.startsWith("skipped_") && state.logs.errors.length === 0);

            // FORCE Error Type if logic failed or explicitly requested
            const logType = (isStatusSuccess && state.logs.errors.length === 0) ? "SUCCESS" : "ERROR";

            // Fallback Input Extraction (Robust)

            const rawInput = state.data.rawBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
            const fallbackInput = rawInput ? (rawInput.type === 'text' ? rawInput.text?.body : `[Media: ${rawInput.type}]`) : null;
            const finalInput = state.data.content.messageBody || fallbackInput;

            try {
                await insertWebhookResultLog(state.supabase, {
                    type: logType,
                    status: state.logs.status,
                    output: state.data.finalOutput,
                    json: sanitizedLog,
                    _id_contact: state.data.contactId,
                    _id_conversation: state.data.conversationId,
                    slots: state.data.content.slots,
                    reason: state.data.content.reason || "No reason",
                    script_name_last_used: scriptNameLastUsed,
                    input: finalInput
                });
            } catch (err) {
                console.error("Log DB Error:", err);
            }

            // Explicit cleanup
            (state as any) = null;

            // Langfuse Flush
            await langfuse.flushAsync();
        }
    };

    // 3. Return Success Immediately
    const response = new Response(JSON.stringify({ ok: true, status: "processing_background" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });

    // 4. Trigger Background Processing
    if ((globalThis as any).EdgeRuntime) {
        (globalThis as any).EdgeRuntime.waitUntil(processEvent());
    } else {
        // Fallback for local testing: fire and forget (or log error)
        processEvent().catch(console.error);
    }

    return response;
});
