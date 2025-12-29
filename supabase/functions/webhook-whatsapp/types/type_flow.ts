
export interface FlowContext {
    // Identifiers (Static from Config or DB)
    _id_contact: string;
    _id_conversation: string;

    // Status (DB/State)
    conversation_status: string;
    contact_status: string;

    // Contact Data (DB)
    contact_phone: string;
    contact_step_process?: string;

    // Counters & Limits (Safe Defaults/Config)
    messages_today_count: number;
    conversations_this_month_count: number;

    // Dates
    conversation_date_created: string;
    inbox_credentials_date_created?: string;

    // Integration IDs
    facebook_phone_number_id: string;

    // AI & Process Config (Config/DB mix)
    current_step?: number;
    step_process?: string;

    process_prompt?: string;

    // AI Settings (Config)
    ai_audio_response?: string;
    ai_audio_model?: string;
    ai_prompt?: string;
    ai_language?: string;
    ai_name?: string;
    ai_zaip_model_name?: string;
    ai_gpt_model?: string;
    openai_conversation_id: string | null;
    openai_temperature?: number;
    ai_last_extra_prompt?: string;
    ai_comercial_process?: string;
    ai_other_info?: string;
    ai_gender?: string;

    // Company Info (Config)
    company_name?: string;
    company_core_business?: string;
    company_products_segments?: string;
    company_products_summary?: string;
    company_differential?: string;
    company_url_website?: string;
    company_url_scheduling?: string;
    company_url_support?: string;
    company_url_terms?: string;
    company_url_privacy?: string;

    // Legacy/Unused (kept optional for compatibility if needed, but discouraged)
    whatsapp_number?: string;
    facebook_token?: string;
    openai_apikey?: string;
    state_process?: string;
    script_name_last_used?: string;
    // IMPORTANT: added for compatibility with prompt files
    inbox_whatsapp_number?: string;
}

// Alias for compatibility with Prompt Files that use ViewMainFlowSummary
export type ViewMainFlowSummary = FlowContext;

export interface IdentificationResult {
    senderNumber: string;
    receiverNumber: string;
    context: FlowContext | null;
    contextType: "full" | "inbox" | "none";
    errors?: any[];
}

export interface SessionResult {
    contactId: string;
    conversationId: string;
    openaiConversationId: string | null;
    agentDetails: any;
    zaipAgent: any;
    zaipModel: any;
    zaipData: any;
    isNewContact?: boolean;
    isNewConversation?: boolean;
    conversationStatus?: string;

    // State from DB
    state_process?: any;
    script_name_last_used?: string;
    current_step?: number;
    step_process?: string;

    errors?: any[];
}

export interface StepLog {
    step: string;
    status: "success" | "error" | "skipped" | "pending" | "info";
    data?: any;
    error?: any;
}

export interface FlowState {
    // Configuration & Clients
    supabase: any;
    conf: {
        startTime: number;
        facebookPhoneNumberId: string;
        storagePublicUrl: string;
        mcpServerUrl?: string;
        mcpServerLabel?: string;
        tokens: {
            mcp: string;
            // metaApi: string;
            facebook?: string;
            openai?: string;
        };
    };

    // Execution Data (Source of Truth)
    data: {
        rawBody: any;
        eventType: string;
        field: string;

        // Identifiers
        contactId?: string;
        conversationId?: string;
        messageId?: string;
        openaiConversationId?: string;
        facebookPhoneNumberId?: string;
        incomingMessageId?: string;

        // Phone Numbers
        senderNumber?: string;
        receiverNumber?: string;

        // Content
        content: {
            messageBody?: string;
            aiResponse?: string;
            messagesToSend?: string[];
            openaiInput?: any;
            openaiOutput?: any;
            slots?: any;
            reason?: string;
            script_name_last_used?: string;
        };

        // Context Objects
        context?: FlowContext;
        contextType?: "full" | "inbox" | "none";
        session?: SessionResult;
        processData?: any;

        // Status Flags
        isNewContact?: boolean;
        isNewConversation?: boolean;
        contactStatus?: string;
        conversationStatus?: string;

        // Process Info
        stepProcess?: string;
        processType?: string;
        finalStatus?: string;
        finalOutput?: string;
    };

    // Logging
    logs: {
        timestamp: string;
        status: string;
        steps: StepLog[];
        errors: any[];
        performance_ms?: number;
        performance_seg?: number;
        performance_min?: number;
        performance_first_response_seg?: number;
        // Legacy/Flat fields for final output mapping
        info?: string;
        actions?: string[];
        warnings?: string[];
        account_update_info?: any;
    };
}
