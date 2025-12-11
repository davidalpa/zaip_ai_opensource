
export interface InsertContactParams {
    _id_contact: string;
    name: string;
    phone_complete: string;
    ddd: string;
    ddi: string;
    phone: string;
}

export interface InsertConversationParams {
    _id_contact: string;
}

export interface InsertMessageInputParams {
    _id_contact: string;
    _id_conversation: string;
    message: string;
}

export interface InsertMessageInputMediaTagParams {
    _id_contact: string;
    _id_conversation: string;
    message: string;
}

export interface InsertMessageOutputParams {
    _id_contact: string;
    _id_conversation: string;
    message: string;
    tokens_total_used?: number;
    tokens_input_used?: number;
    tokens_output_used?: number;
    tokens_cached_used?: number;
    tokens_reasoning_used?: number;
    ai_gpt_model?: string;
    ai_audio_model?: string;
    ai_audio_response?: string;
}

export interface TokenUsageParams {
    _id_contact: string;
    _id_conversation: string;
    usage_type: string;
    ai_model: string;
    tokens_total_used: number;
    tokens_input_used: number;
    tokens_output_used: number;
    tokens_cached_used?: number;
    tokens_reasoning_used?: number;
    tokens_audio_used?: number;
}

export interface InsertContactActivityParams {
    activity_type: string;
    activity_title: string;
    activity_describe: string;
    _id_contact: string;
    _id_conversation: string;
}

export interface UpdateConversationParams {
    _id_conversation: string;
    openai_conversation_id: string;
}



export interface InsertOpenAIRequestParams {
    type: "INPUT" | "OUTPUT" | "ERROR";
    json: any;
    _id_contact?: string;
    _id_conversation?: string;
}

export interface InsertWebhookResultLogParams {
    type: "SUCCESS" | "ERROR" | "STEP";
    status?: string | null;
    output?: string | null;
    json?: any;
    _id_contact?: string;
    _id_conversation?: string;
    slots?: string | null;
    reason?: string | null;
    script_name_last_used?: string | null;
    input?: string | null;
}

export interface InsertLogConversationStepParams {
    _id_group_message?: string;
    _id_contact: string;
    _id_conversation: string;
    current_step: number;
    step_process: string;
    state_process: any;
    input: string;
    output: string;
    reason: string;
    script_name_last_used: string;
}
