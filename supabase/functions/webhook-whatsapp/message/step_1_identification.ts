
import { IdentificationResult, FlowContext } from "../types/type_flow.ts";
import { WhatsAppWebhookBody } from "../types/type_webhook.ts";
import { AgentConfig, CompanyInfo } from "../config/agent_config.ts";
import { getProcessPrompt } from "../config/steps_config.ts";

export async function identifyContext(
    body: WhatsAppWebhookBody,
    supabase: any,
    facebookPhoneNumberId: string
): Promise<IdentificationResult> {
    let payload: any = body;

    // Handle array wrapper (e.g. from n8n or specific gateways)
    if (Array.isArray(body) && body[0]?.body) {
        payload = body[0].body;
    } else if (Array.isArray(body)) {
        if (body[0]?.object) {
            payload = body[0];
        }
    }

    let senderNumber = ""; // Contact Number
    let receiverNumber = ""; // Agent/Business Number (phone_number_id)

    // Check standard WhatsApp Webhook structure
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (changes?.field === "messages" && value) {
        // Extract Agent Channel (phone_number_id)
        receiverNumber = value.metadata?.phone_number_id || "";

        // Check Status Update (recipient_id)
        if (value.statuses?.[0]?.recipient_id) {
            senderNumber = value.statuses[0].recipient_id;
        }
        // Check Incoming Message (messages[0].from)
        else if (value.messages?.[0]?.from) {
            senderNumber = value.messages[0].from;
        }
    }

    // Fallback
    if (!senderNumber) {
        if (payload.from && payload.to) {
            senderNumber = payload.from;
            receiverNumber = payload.to;
        } else {
            // Simple fallback
            senderNumber = payload.sender || payload.phone || "";
            receiverNumber = payload.receiver || payload.recipient || "";
        }
    }

    if (!senderNumber) {
        // Return error instead of throw to be handled by caller
        return {
            senderNumber: "",
            receiverNumber: "",
            context: null,
            contextType: "none",
            errors: ["Não foi possível identificar o número do contato (sender/recipient_id)"]
        };
    }

    // Single-tenant: build context directly from config (no database lookups)
    const currentStep = 1;
    const summary: FlowContext = {
        _id_contact: "",
        _id_conversation: "",
        facebook_phone_number_id: facebookPhoneNumberId || receiverNumber,
        whatsapp_number: AgentConfig.whatsapp_number,
        // inbox_whatsapp_number removed
        // inbox_status removed
        // inbox_credential_status removed
        conversation_status: "ativo",
        contact_phone: senderNumber,
        // account_status removed
        messages_today_count: 0,
        conversations_this_month_count: 0,
        contact_status: "ativo",
        conversation_date_created: new Date().toISOString(),
        openai_conversation_id: null,
        current_step: currentStep,
        ai_audio_response: "no",
        ai_audio_model: "openai",
        ai_prompt: "",
        ai_language: AgentConfig.language,
        ai_name: AgentConfig.ai_name,
        ai_zaip_model_name: AgentConfig.ai_gpt_model,
        ai_gpt_model: AgentConfig.ai_gpt_model,
        openai_temperature: AgentConfig.openai_temperature,
        ai_last_extra_prompt: "",
        ai_comercial_process: "",
        ai_other_info: "",
        company_name: CompanyInfo.company_name,
        company_core_business: CompanyInfo.company_core_business,
        company_products_segments: CompanyInfo.company_products_segments,
        company_products_summary: CompanyInfo.company_products_summary,
        company_differential: CompanyInfo.company_differential,
        company_url_website: CompanyInfo.company_url_website,
        company_url_support: CompanyInfo.company_url_support,
        company_url_terms: CompanyInfo.company_url_terms,
        company_url_privacy: CompanyInfo.company_url_privacy,
        step_process: "1 - Atendimento Iniciado",
        process_prompt: getProcessPrompt(currentStep) || "",
        state_process: "",
        contact_step_process: "1 - Contato Ativo",
        ai_gender: "neutro",
        script_name_last_used: "Nenhuma",
    };

    return {
        senderNumber,
        receiverNumber,
        context: summary,
        contextType: "full",
        errors: undefined
    };
}
