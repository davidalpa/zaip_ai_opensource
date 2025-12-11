
import { WhatsAppWebhookBody } from "../types/type_webhook.ts";
import { FlowState, SessionResult, FlowContext } from "../types/type_flow.ts";
import { insertContact, insertConversation } from "../database_queries/sql_inserts.ts";
import { selectLastConversation, selectContactByPhone } from "../database_queries/sql_selects.ts";
import { createConversationOpenAI } from "./create_conversation.ts";

export async function ensureSession(
    context: FlowContext,
    contextType: "full" | "inbox" | "none",
    body: WhatsAppWebhookBody,
    supabase: any,
    openaiApiKey?: string
): Promise<SessionResult> {

    const errors: any[] = [];

    // 1. Ensure Contact
    let contactId = (context as any)._id_contact;
    let isNewContact = false;

    if (!contactId) {
        // Try to extract profile name
        let profileName = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || "Não Definido";
        profileName = profileName.replace(/\s+/g, ' ').replace(/\n/g, '').trim() || "Não Definido";
        const phoneNumber = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from;

        if (phoneNumber) {
            try {
                // Check if exists first
                const { data: existingContact, error: findError } = await selectContactByPhone(supabase, phoneNumber);

                if (existingContact) {
                    contactId = existingContact._id_contact;
                    isNewContact = false;
                } else {
                    const newContact = await insertContact(
                        supabase,
                        profileName,
                        phoneNumber
                    );
                    if (newContact) {
                        contactId = newContact._id_contact;
                        isNewContact = true;
                    }
                }
            } catch (createError) {
                errors.push({ step: "session_create_contact", error: `Erro ao criar contato: ${(createError as any).message || createError}` });
            }
        }
    }

    if (!contactId) {
        return {
            contactId: "",
            conversationId: "",
            openaiConversationId: null,
            agentDetails: null,
            zaipAgent: null,
            zaipModel: null,
            zaipData: null,
            errors: [...errors, "Critical Failure: Contact ID not found or created"]
        };
    }

    // 2. Build Agent Details and Account Data from Context (View)

    const zaipId = "1";

    const agentDetails = {
        _id_zaips: zaipId,
        name: context.ai_name,
        openai_apikey: context.openai_apikey,
        ai_gpt_model: context.ai_gpt_model,
        ai_model: context.ai_gpt_model, // Alias
        openai_temperature: context.openai_temperature,
        ai_prompt: context.ai_prompt,
        ai_audio_response: context.ai_audio_response,
        ai_audio_model: context.ai_audio_model,
        ai_last_extra_prompt: context.ai_last_extra_prompt,
        ai_gender: context.ai_gender,
        // Add other fields if necessary
    };

    const zaipData = {
        _id_account: "1",
        company_name: context.company_name,
        company_core_business: context.company_core_business,
        company_products_segments: context.company_products_segments,
        company_products_summary: context.company_products_summary,
        company_differential: context.company_differential,
        company_url_website: context.company_url_website,
        company_url_scheduling: context.company_url_scheduling,
        company_url_support: context.company_url_support,
        company_url_terms: context.company_url_terms,
        company_url_privacy: context.company_url_privacy,
    };

    // 3. Ensure Conversation (7-day Rule)
    let conversationId: string | null = null;
    let conversationStatus: string | undefined = undefined;
    let openaiConversationId: string | null = null;
    let isNewConversation = false;

    // Fetch latest conversation
    const { data: lastConversation, error: lastConvError, query: sql_query_last_conv } = await selectLastConversation(supabase, contactId);

    if (lastConvError) errors.push({ step: "session_fetch_last_conversation", error: `Erro ao buscar última conversa: ${(lastConvError as any).message || lastConvError}`, query: sql_query_last_conv });

    if (lastConversation) {
        const lastDate = new Date(lastConversation.conversation_date_created);
        const diffDays = (new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24);

        if (diffDays > 7) {
            // Conversation > 7 days. Will create a new one.
            // Leave conversationId null to create new
        } else {
            conversationId = lastConversation._id_conversation;
            conversationStatus = lastConversation.status;
            openaiConversationId = lastConversation.openai_conversation_id;

            // Extract State
            if (lastConversation.state_process) {
                // Ensure it's passed if exists
                (agentDetails as any).state_process = lastConversation.state_process;
            }
            if (lastConversation.script_name_last_used) {
                (agentDetails as any).script_name_last_used = lastConversation.script_name_last_used;
            }
            // Extract Step Info
            if (lastConversation.current_step) {
                (agentDetails as any).current_step = lastConversation.current_step;
            }
            if (lastConversation.step_process) {
                (agentDetails as any).step_process = lastConversation.step_process;
            }
        }
    }

    if (!conversationId) {
        try {
            const newConv = await insertConversation(
                supabase,
                contactId
            );
            if (newConv) {
                conversationId = newConv._id_conversation;
                isNewConversation = true;
                conversationStatus = "ativo";
                // Default new conversation step
                (agentDetails as any).current_step = 1;
                (agentDetails as any).step_process = "1 - Atendimento Iniciado";
            }
        } catch (e) {
            errors.push({ step: "session_create_conversation", error: `Erro ao criar conversa: ${(e as any).message || e}` });
        }
    }

    if (!conversationId) {
        return {
            contactId: contactId,
            conversationId: "",
            openaiConversationId: null,
            agentDetails: agentDetails,
            zaipAgent: agentDetails, // Alias
            zaipModel: null, // Deprecated/Merged
            zaipData: zaipData,
            errors: [...errors, "Critical Failure: Conversation ID not found or created"]
        };
    }

    // 4. Ensure OpenAI Thread
    if (!openaiConversationId) {
        try {
            const apiKey = openaiApiKey || (context as any).openai_apikey;

            if (apiKey) {
                openaiConversationId = await createConversationOpenAI(
                    supabase,
                    apiKey,
                    conversationId,
                    contactId
                );
            } else {
                errors.push({ step: "session_create_openai_thread", error: "OpenAI API Key not found in context" });
            }
        } catch (error) {
            errors.push({ step: "session_create_openai_thread", error: `Erro ao criar thread OpenAI: ${(error as any).message || error}` });
        }
    }

    return {
        contactId,
        conversationId,
        openaiConversationId,
        agentDetails,
        zaipAgent: agentDetails,
        zaipModel: null,
        zaipData,
        isNewContact,
        isNewConversation,
        conversationStatus,
        // State
        state_process: (agentDetails as any).state_process,
        script_name_last_used: (agentDetails as any).script_name_last_used,
        current_step: (agentDetails as any).current_step,
        step_process: (agentDetails as any).step_process,

        errors: errors.length > 0 ? errors : undefined
    };
}
