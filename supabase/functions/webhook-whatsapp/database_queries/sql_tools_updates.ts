import { SupabaseClient } from "../index.ts";
import { insertWebhookResultLog, insertLogConversationStep } from "./sql_inserts.ts";

export interface LogContext {
    contactId: string;
}

export async function updateContactName(supabase: SupabaseClient, contactId: string, name: string) {
    const { error } = await supabase
        .from("zaip_contacts")
        .update({ name: name })
        .eq("_id_contact", contactId);
    return error;
}

export async function updateCompanyNameAndArea(supabase: SupabaseClient, contactId: string, companyName: string, companyArea: string) {
    const { error } = await supabase
        .from("zaip_contacts")
        .update({ company_name: companyName, company_area: companyArea })
        .eq("_id_contact", contactId);
    return error;
}

export async function updatePipelineStage(
    supabase: SupabaseClient,
    conversationId: string,
    stage: string,
    customInput?: any
) {
    const { error } = await supabase
        .from("zaip_conversations")
        .update({ step_process: stage })
        .eq("_id_conversation", conversationId);

    return error;
}

export async function updateStepConversation(
    supabase: SupabaseClient,
    conversationId: string,
    step: number,
    logContext: LogContext,
    slots: any = {},
    stepProcess?: string,
    scriptNameLastUsed?: string,
    stepLogParams?: {
        input?: string;
        output?: string;
        reason?: string;
        idGroupMessage?: string;
    }
) {
    let updatePayload: any = {
        current_step: step,
        script_name_last_used: scriptNameLastUsed
    };
    let finalState = {};

    // If slots are provided, we need to merge them with the existing state
    if (slots && Object.keys(slots).length > 0) {
        const { data: currentData, error: selectError } = await supabase
            .from("zaip_conversations")
            .select("state_process")
            .eq("_id_conversation", conversationId)
            .maybeSingle();

        if (!selectError) {
            let currentState = currentData?.state_process || {};

            // Ensure currentState is an object
            if (typeof currentState === 'string') {
                try {
                    currentState = JSON.parse(currentState);
                } catch {
                    currentState = {};
                }
            }

            // Merge new slots
            finalState = { ...currentState, ...slots };
            updatePayload.state_process = finalState;
        }
    }

    const { error } = await supabase
        .from("zaip_conversations")
        .update(updatePayload)
        .eq("_id_conversation", conversationId);

    if (!error) {
        // Use new specific step log if data is available, otherwise fallback to generic log (or just skip if preferred)
        // User requested: "Crie um log que salve na tabela 'log_conversations_steps' sempre que mudar o current_step"
        try {
            if (stepLogParams) {
                await insertLogConversationStep(supabase, {
                    _id_contact: logContext.contactId,
                    _id_conversation: conversationId,
                    current_step: step,
                    step_process: stepProcess || "", // Ensure string
                    state_process: finalState,
                    script_name_last_used: scriptNameLastUsed || "",
                    input: stepLogParams.input || "",
                    output: stepLogParams.output || "",
                    reason: stepLogParams.reason || "",
                    _id_group_message: stepLogParams.idGroupMessage
                });
            } else {
                // Legacy/Fallback log if new params aren't passed (optional)
                await insertWebhookResultLog(supabase, {
                    type: "STEP",
                    json: { current_step: step, state_process: finalState, step_process: stepProcess },
                    _id_contact: logContext.contactId,
                    _id_conversation: conversationId
                });
            }
        } catch (logErr) {
            console.error("Critical Warning: Failed to insert log in updateStepConversation, but DB update succeeded.", logErr);
            // We DO NOT rethrow, to preserve the conversation state update.
        }
    }

    return error;
}





export async function inativateConversation(supabase: SupabaseClient, conversationId: string) {
    const { error } = await supabase
        .from("zaip_conversations")
        .update({ status: "inativo" })
        .eq("_id_conversation", conversationId);
    return error;
}
