import {
    InsertContactParams,
    InsertConversationParams,
    InsertMessageInputParams,
    InsertMessageInputMediaTagParams,
    InsertMessageOutputParams,
    TokenUsageParams,
    InsertContactActivityParams,
    InsertOpenAIRequestParams,
    InsertLogConversationStepParams
} from "../types/type_database.ts";

// ========== Contact ==========
//
// Objective: Create or update contact
// Table: zaip_contacts
//
// Planned SQL:
// INSERT INTO zaip_contacts (
//     _id_contact,
//     name,
//     phone_complete,
//     ddd,
//     ddi,
//     phone
// ) VALUES (
//     '${params._id_contact}',
//     '${params.name}',
//     '${params.phone_complete}',
//     '${params.ddd}',
//     '${params.ddi}',
//     '${params.phone}'
// ) RETURNING *;
//
// Typescript Used:
export async function insertContact(
    supabase: any,
    name: string,
    phone: string
) {
    // Phone parsing
    // Example: 5521999999999
    // DDI: 55 (0-2)
    // DDD: 21 (2-4)
    // Phone: 999999999 (4-13)

    const ddi = phone.slice(0, 2);
    const ddd = phone.slice(2, 4);
    const phoneLocal = phone.slice(4, 13); // or slice(4) if size varies

    const { data, error } = await supabase
        .from("zaip_contacts")
        .insert([
            {
                name: name,
                phone_complete: phone,
                ddd: ddd,
                ddi: ddi,
                phone: phoneLocal,
                status: "ativo"
            }
        ])
        .select()
        .single();

    if (error) {
        const errorObj = {
            message: (error as any).message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code
        };
        throw { message: `Error inserting contact into zaip_contacts: ${(error as any).message}`, details: errorObj };
    }

    return data;
}

// ========== Conversation ==========
//
// Objective: Create new conversation
// Table: zaip_conversations
//
// Planned SQL:
// INSERT INTO zaip_conversations (
//     _id_contact, 
//     status
// ) VALUES (
//     '${params._id_contact}', 
//     'ativo'
// ) RETURNING *;
//
// Typescript Used:
export async function insertConversation(
    supabase: any,
    contactId: string
) {
    const { data, error } = await supabase
        .from("zaip_conversations")
        .insert([
            {
                _id_contact: contactId,
                status: "ativo"
            }
        ])
        .select()
        .single();

    if (error) {
        const errorObj = {
            message: (error as any).message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code
        };
        throw { message: `Error inserting conversation into zaip_conversations: ${(error as any).message}`, details: errorObj };
    }

    return data;
}

// ========== Message (Input) ==========
//
// Objective: Insert message received from contact
// Table: zaip_messages
//
// Planned SQL:
// INSERT INTO zaip_messages (
//     _id_contact, 
//     _id_conversation, 
//     type, 
//     message, 
//     _id_group_message
// ) VALUES (
//     '${params._id_contact}', 
//     '${params._id_conversation}', 
//     'Enviado pelo Contato', 
//     '${params.message}', 
//     '${idGroupMessage}'
// );
//
// Typescript Used:
export async function insertMessageInput(
    supabase: any,
    params: InsertMessageInputParams
) {
    const idGroupMessage = `${params._id_conversation}${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;

    const { data, error } = await supabase
        .from("zaip_messages")
        .insert([{
            _id_contact: params._id_contact,
            _id_conversation: params._id_conversation,
            type: "Enviado pelo Contato",
            message: params.message,
            _id_group_message: idGroupMessage
        }])
        .select("_id_message")
        .single();

    if (error) {
        (error as any).message = `Error inserting text message (Input) into zaip_messages: ${(error as any).message}`;
        throw error;
    }
    return data;
}

// ========== Message (Input - Media) ==========
//
// Objective: Insert media message received from contact
// Table: zaip_messages
//
// Planned SQL:
// INSERT INTO zaip_messages (
//     _id_contact, 
//     _id_conversation, 
//     type, 
//     message, 
//     _id_group_message
// ) VALUES (
//     '${params._id_contact}', 
//     '${params._id_conversation}', 
//     'Enviado pelo Contato', 
//     '${params.message}', 
//     '${idGroupMessage}'
// );
//
// Typescript Used:
export async function insertMessageInputMediaTag(
    supabase: any,
    params: InsertMessageInputMediaTagParams
) {
    const idGroupMessage = `${params._id_conversation}${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;

    const { data, error } = await supabase
        .from("zaip_messages")
        .insert([{
            _id_contact: params._id_contact,
            _id_conversation: params._id_conversation,
            type: "Enviado pelo Contato",
            message: params.message,
            _id_group_message: idGroupMessage
        }])
        .select("_id_message")
        .single();

    if (error) {
        (error as any).message = `Error inserting media message (Tag) into zaip_messages: ${(error as any).message}`;
        throw error;
    }
    return data;
}

// ========== Message (Output) ==========
//
// Objective: Insert message sent by AI
// Table: zaip_messages
//
// Planned SQL:
// INSERT INTO zaip_messages (
//     _id_contact, 
//     _id_conversation, 
//     type, 
//     message, 
//     _id_group_message
// ) VALUES (
//     '${params._id_contact}', 
//     '${params._id_conversation}', 
//     'Enviado pela IA', 
//     '${params.message}', 
//     '${idGroupMessage}'
// );
//
// Typescript Used:
export async function insertMessageOutput(
    supabase: any,
    params: InsertMessageOutputParams
) {
    const idGroupMessage = `${params._id_conversation}${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}`;

    const { data, error } = await supabase
        .from("zaip_messages")
        .insert([{
            _id_contact: params._id_contact,
            _id_conversation: params._id_conversation,
            type: "Enviado pela IA",
            message: params.message,
            _id_group_message: idGroupMessage,
            tokens_total_used: params.tokens_total_used || 0,
            tokens_input_used: params.tokens_input_used || 0,
            tokens_output_used: params.tokens_output_used || 0,
            tokens_cached_used: params.tokens_cached_used || 0,
            tokens_reasoning_used: params.tokens_reasoning_used || 0,
            ai_gpt_model: params.ai_gpt_model || null,
            ai_audio_model: params.ai_audio_model || null,
            ai_audio_response: params.ai_audio_response || null
        }])
        .select()
        .single();

    if (error) {
        (error as any).message = `Error inserting response message (Output) into zaip_messages: ${(error as any).message}`;
        throw error;
    }
    return data;
}

// ========== Token Usage ==========
//
// Objective: Log token usage
// Table: log_openai_requests (aggregated)
//
// Planned SQL:
// INSERT INTO log_openai_requests (
//     type,
//     json,
//     _id_contact,
//     _id_conversation
// ) VALUES (
//     'USAGE',
//     '${usageJson}',
//     '${params._id_contact}',
//     '${params._id_conversation}'
// );
//
// Typescript Used:
export async function insertUsedTokens(supabase: any, params: TokenUsageParams) {
    // Embed token consumption in log_openai_requests as USAGE event
    const usageJson = {
        usage_type: params.usage_type,
        ai_model: params.ai_model,
        total: params.tokens_total_used,
        input: params.tokens_input_used,
        output: params.tokens_output_used,
        cached: params.tokens_cached_used || 0,
        reasoning: params.tokens_reasoning_used || 0,
        audio: params.tokens_audio_used || 0
    };
    const { error } = await supabase
        .from("log_openai_requests")
        .insert([{ type: "USAGE", json: usageJson, _id_contact: params._id_contact, _id_conversation: params._id_conversation }]);

    if (error) {
        (error as any).message = `Error logging token usage: ${(error as any).message}`;
        return error;
    }
    return null;
}

// ========== Contact Activity ==========
//
// Objective: Log contact activity
// Table: log_contact_activities
//
// Planned SQL:
// INSERT INTO log_contact_activities (
//     activity_type, 
//     activity_title, 
//     activity_describe, 
//     _id_contact, 
//     _id_conversation
// ) VALUES (
//     '${params.activity_type}', 
//     '${params.activity_title}', 
//     '${params.activity_describe}', 
//     '${params._id_contact}', 
//     '${params._id_conversation}'
// ) RETURNING *;
//
// Typescript Used:
export async function insertContactActivity(
    supabase: any,
    activityType: string,
    activityTitle: string,
    activityDescribe: string,
    idContact: string,
    idAccount: string,
    idConversation: string
) {
    const params: InsertContactActivityParams = {
        activity_type: activityType,
        activity_title: activityTitle,
        activity_describe: activityDescribe,
        _id_contact: idContact,
        _id_conversation: idConversation
    };

    const { data, error } = await supabase
        .from("log_contact_activities")
        .insert([params])
        .select()
        .single();

    if (error) {
        (error as any).message = `Error inserting contact activity (${activityType}): ${(error as any).message}`;
        return { data: null, error };
    }
    return { data, error: null };
}

// ========== Meta Integration ==========
//
// Objective: Log processed data from Meta integration
// Table: zaip_meta_integrations
//
// Planned SQL:
// INSERT INTO zaip_meta_integrations (
//     json,
//     type,
//     wa_id,
//     phone_number_id,
//     business_id,
//     phone_number,
//     message,
//     "from",
//     message_template_id
// ) VALUES (
//     ...
// ) RETURNING *;
//
// Typescript Used:
// Removed: insertMetaIntegration (not used in single-tenant mode)

// ========== Webhook Meta Log (jsonb) ==========
//
// Objective: Log Meta events in jsonb
// Table: log_meta_whebhook
//
// Main fields: json (jsonb), type, wa_id, phone_number_id, business_id, phone_number, message, from, message_template_id
export async function insertWebhookMetaLog(
    supabase: any,
    params: {
        json: any,
        type?: string,
        wa_id?: string,
        phone_number_id?: string,
        business_id?: string,
        phone_number?: string,
        message?: string,
        from?: string,
        message_template_id?: string
    }
) {
    const { error } = await supabase
        .from("log_meta_whebhook")
        .insert([{
            json: params.json,
            type: params.type,
            wa_id: params.wa_id,
            phone_number_id: params.phone_number_id,
            business_id: params.business_id,
            phone_number: params.phone_number,
            message: params.message,
            from: params.from,
            message_template_id: params.message_template_id
        }]);

    if (error) {
        (error as any).message = `Error inserting into log_meta_whebhook: ${(error as any).message}`;
        return error;
    }
    return null;
}

// ========== OpenAI Requests ==========
//
// Objective: Log OpenAI requests (INPUT/OUTPUT)
// Table: log_openai_requests
//
// Planned SQL:
// INSERT INTO zaip_openai_requests (
//     type,
//     json,
//     _id_contact,
//     _id_conversation
// ) VALUES (
//     '${params.type}',
//     '${params.json}',
//     '${params._id_contact}',
//     '${params._id_conversation}'
// ) RETURNING *;
//
// Typescript Used:
export async function insertOpenAIRequest(
    supabase: any,
    params: InsertOpenAIRequestParams
) {
    const dataToInsert: any = {
        type: params.type,
        json: params.json,
        _id_contact: params._id_contact,
        _id_conversation: params._id_conversation
    };

    const { error } = await supabase
        .from("log_openai_requests")
        .insert([dataToInsert]);

    if (error) {
        (error as any).message = `Error inserting into log_openai_requests (${params.type}): ${(error as any).message}`;
        return error;
    }
    return null;
}

// ========== Webhook Result Log ==========
//
// Objective: Log final execution result (GENERAL LOG)
// Table: log_results
//
// Planned SQL:
// INSERT INTO log_results (
//     type,
//     status,
//     output,
//     json,
//     _id_contact,
//     _id_conversation
// ) VALUES (
//     '${params.type}',
//     '${params.status}',
//     '${params.output}',
//     '${params.json}',
//     '${params._id_contact}',
//     '${params._id_conversation}'
// ) RETURNING *;
//
// Typescript Used:
import { InsertWebhookResultLogParams } from "../types/type_database.ts";

export async function insertWebhookResultLog(
    supabase: any,
    params: InsertWebhookResultLogParams
) {
    const { error } = await supabase
        .from("log_results")
        .insert([{
            type: params.type,
            status: params.status,
            output: params.output,
            json: params.json,
            _id_contact: params._id_contact,
            _id_conversation: params._id_conversation,
            slots: params.slots,
            reason: params.reason,
            script_name_last_used: params.script_name_last_used,
            input: params.input
        }]);

    if (error) {
        (error as any).message = `Error inserting into log_results: ${(error as any).message}`;
        return error;
    }
    return null;
}

// ========== Log Conversation Steps ==========
//
// Objective: Log conversation step/status changes
// Table: log_conversations_steps
//
// Typescript Used:
export async function insertLogConversationStep(
    supabase: any,
    params: InsertLogConversationStepParams
) {
    const { error } = await supabase
        .from("log_conversations_steps")
        .insert([{
            _id_group_message: params._id_group_message,
            _id_contact: params._id_contact,
            _id_conversation: params._id_conversation,
            current_step: params.current_step,
            step_process: params.step_process,
            state_process: JSON.stringify(params.state_process),
            input: params.input,
            output: params.output,
            reason: params.reason,
            script_name_last_used: params.script_name_last_used
        }]);

    if (error) {
        (error as any).message = `Error inserting into log_conversations_steps: ${(error as any).message}`;
        return error;
    }
    return null;
}
