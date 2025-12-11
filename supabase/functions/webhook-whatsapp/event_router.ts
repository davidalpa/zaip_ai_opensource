import { handleMessageEvent } from "./message/message_controller.ts";
import { FlowState, StepLog } from "./types/type_flow.ts";
import { insertWebhookMetaLog } from "./database_queries/sql_inserts.ts";

export function identifyEventType(rawBody: any): { eventType: string, field: string, body: any } {
    let body = rawBody;
    let eventType = "unknown";
    let field = "unknown";

    if (Array.isArray(rawBody) && rawBody.length > 0 && rawBody[0].body) {
        body = rawBody[0].body;
    } else if (rawBody.content && rawBody.content.json) {
        body = rawBody.content.json;
    } else if (rawBody.field && rawBody.value) {
        body = {
            object: "whatsapp_business_account",
            entry: [{
                id: "unknown",
                changes: [rawBody]
            }]
        };
    }

    if (body.entry?.[0]?.changes?.[0]) {
        field = body.entry[0].changes[0].field;
        eventType = field;
    }

    return { eventType, field, body };
}

export async function routeIncomingEvent(
    state: FlowState,
    body: any,
    logStep: (step: string, status: StepLog["status"], data?: any, error?: any) => void
): Promise<Response> {
    try {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        if (!value) {
            state.logs.errors.push({ error: "Payload inválido para routeIncomingEvent", payload: JSON.stringify(body, null, 2) });
            return new Response(JSON.stringify({ ok: false, status: "Payload Error", output: "Payload inválido" }), { status: 400 });
        }

        let data: any = {
            json: body,
            type: state.data.eventType,
            // Default values
            wa_id: null,
            phone_number_id: null,
            business_id: null,
            phone_number: null,
            message: null,
            from: null,
            message_template_id: null
        };

        // Mapeamento baseado no n8n
        switch (state.data.eventType) {
            case "messages":
                data.wa_id = value.contacts?.[0]?.wa_id;
                data.phone_number_id = value.metadata?.phone_number_id;
                data.from = value.messages?.[0]?.from;
                data.message = value.messages?.[0]?.text?.body;
                data.phone_number = value.metadata?.display_phone_number;
                break;

            case "account_update":
                data.wa_id = value.waba_info?.waba_id;
                data.business_id = value.waba_info?.owner_business_id;
                break;

            case "message_echoes":
                data.phone_number_id = value.metadata?.phone_number_id;
                data.phone_number = value.metadata?.display_phone_number;
                data.message = value.message_echoes?.[0]?.text?.body;
                data.from = value.message_echoes?.[0]?.from;
                break;

            case "smb_message_echoes":
                data.phone_number_id = value.metadata?.phone_number_id;
                data.message = value.message_echoes?.[0]?.text?.body;
                data.from = value.message_echoes?.[0]?.from;
                data.phone_number = value.metadata?.display_phone_number;
                break;

            case "message_template_quality_update":
            case "message_template_status_update":
            case "message_template_components_update":
            case "template_category_update":
            case "template_correct_category_detection":
                data.message_template_id = value.message_template_id;
                break;

            case "payment_configuration_update":
                // Apenas json e type
                break;

            case "phone_number_name_update":
            case "phone_number_quality_update":
                data.phone_number = value.display_phone_number;
                break;

            case "user_preferences":
                data.wa_id = value.user_preferences?.[0]?.wa_id;
                data.phone_number_id = value.metadata?.phone_number_id;
                data.phone_number = value.metadata?.display_phone_number;
                break;

            case "business_status_update":
            case "business_capability_update":
                // Apenas json e type
                break;

            default:
                // Para tipos desconhecidos, salvamos pelo menos o JSON e o Tipo
                break;
        }


        // Filter out status updates for "messages" event type
        // If it's a message event but has no messages array (likely a status update), skip logging to DB
        let shouldLogToDb = true;
        if (state.data.eventType === "messages") {
            // Check for explicit message content (must have 'from' field)
            const hasMessageContent = value.messages &&
                value.messages.length > 0 &&
                value.messages[0].from;

            // Check for status update indicators
            const isStatusUpdate = value.statuses && value.statuses.length > 0;

            if (isStatusUpdate || !hasMessageContent) {
                shouldLogToDb = false;
            }
        }

        // Persistir log bruto em jsonb (fallback para eventos não-mensagem; opcional para mensagens)
        if (state.data.eventType !== "messages" || shouldLogToDb) {
            const logErr = await insertWebhookMetaLog(state.supabase, {
                json: body,
                type: state.data.eventType,
                wa_id: data.wa_id,
                phone_number_id: data.phone_number_id,
                business_id: data.business_id,
                phone_number: data.phone_number,
                message: data.message,
                from: data.from,
                message_template_id: data.message_template_id
            });

            if (logErr) {
                state.logs.errors.push({ step: "insert_log_meta_whebhook", error: logErr });
                logStep("insert_log_meta_whebhook", "error", null, logErr);
            } else {
                logStep("insert_log_meta_whebhook", "success");
            }
        } else {
            logStep("insert_log_meta_whebhook", "skipped", { reason: "status_update_ignored" });
        }


        // 4. Switch de Triagem de Eventos
        return await dispatchEvent(
            state,
            body,
            logStep
        );
    } catch (error) {
        state.logs.errors.push({ step: "routeIncomingEvent", error: `Erro ao rotear evento: ${(error as any).message || error}` });
        return new Response(JSON.stringify({ ok: false, error: (error as any).message }), { status: 500 });
    }
}

export async function dispatchEvent(
    state: FlowState,
    body: any,
    logStep: (step: string, status: StepLog["status"], data?: any, error?: any) => void
): Promise<Response> {
    // Somente processar eventos de "messages"; demais ficam como fallback já logado
    if (state.data.eventType === "messages") {
        return await handleMessageEvent(
            state,
            body,
            logStep
        );
    }

    state.logs.status = "logged_event";
    logStep("fallback_event", "info", { field: state.data.field, eventType: state.data.eventType });
    return new Response(JSON.stringify({
        ok: true,
        status: "Logged Event",
        output: `Evento '${state.data.eventType}' salvo no banco.`
    }), { status: 200 });
}
