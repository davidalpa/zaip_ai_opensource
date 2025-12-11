// Replaces view_main_flow_summary with direct join
//
export async function selectViewMainFlowSummary(supabase: any, senderNumber: string, receiverNumber: string) {
    const { data: contact, error: contactError } = await supabase
        .from("zaip_contacts")
        .select("_id_contact, status")
        .eq("phone_complete", senderNumber)
        .maybeSingle();

    if (contactError || !contact) {
        return { data: null, error: contactError || "Contato não encontrado", query: "select_contact" };
    }

    const { data: conversation, error: convError } = await supabase
        .from("zaip_conversations")
        .select("*")
        .eq("_id_contact", contact._id_contact)
        .eq("status", "ativo")
        .order("date_created", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!conversation) {
        // If no active conversation found, return contact data but without conversation (simulating view)
        return { data: { ...contact, contact_status: contact.status, conversation_status: null }, error: null, query: "select_conversation" };
    }

    const result = {
        ...conversation,
        conversation_status: conversation.status,
        contact_status: contact.status,
        contact_id: contact._id_contact
    };

    return { data: result, error: convError, query: "direct_join" };
}



// ========== Conversa (Última) ==========
//
// Objetivo: Buscar a última conversa de um contato em um inbox
// Tabela: zaip_conversations
//
// SQL Planejado:
// SELECT * FROM zaip_conversations
// WHERE _id_contact = '${contactId}'
// ORDER BY date_created DESC
// LIMIT 1;
//
// Typescript Utilizado:
// ========== Conversa (Última) ==========
export async function selectLastConversation(supabase: any, contactId: string) {
    const sql_query = `
SELECT * FROM zaip_conversations
        WHERE _id_contact = '${contactId}'
        ORDER BY date_created DESC
        LIMIT 1;
`;
    const { data, error } = await supabase
        .from("zaip_conversations")
        .select("*")
        .eq("_id_contact", contactId)
        .order("date_created", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) (error as any).message = `Erro ao buscar última conversa: ${(error as any).message}`;
    return { data, error, query: sql_query };
}

// ========== Dados da Conta Zaip ==========
//
// Objetivo: Buscar dados da conta Zaip
// Tabela: zaip_zaips_data
//
// SQL Planejado:
// SELECT * FROM zaip_zaips_data
// WHERE _id_account = '${accountId}'
// LIMIT 1;
//
// Typescript Utilizado:
// ========== Legacy: Removed Multi-Tenant/Inbox Selects ==========
// selectZaipData, selectZaipModel, selectZaipProcess, selectInboxCredential
// Removed to align with single-tenant schema using 7 core tables.
// Functions kept as stubs/mocks if strictly needed by TS imports, or removed.
// Assuming callers are refactored or these are pure dead code now.





// ========== Última Mensagem ==========
//
// Objetivo: Buscar última mensagem enviada pelo contato
// Tabela: zaip_messages
//
// SQL Planejado:
// SELECT _id_conversation, _id_message, type, date_time, message
// FROM zaip_messages
// WHERE _id_conversation = '${conversationId}'
// AND type = 'Enviado pelo Contato'
// ORDER BY date_time DESC
// LIMIT 1;
//
// Typescript Utilizado:
// ========== Última Mensagem ==========
export async function selectLatestMessage(
    supabase: any,
    conversationId: string
) {
    const sql_query = `
SELECT * FROM zaip_messages WHERE _id_conversation = '${conversationId}' AND type = 'Enviado pelo Contato' ORDER BY date_time DESC LIMIT 1;
`;
    const { data, error } = await supabase
        .from("zaip_messages")
        .select("*") // simplified select
        .eq("_id_conversation", conversationId)
        .eq("type", "Enviado pelo Contato")
        .order("date_time", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) (error as any).message = `Erro ao buscar última mensagem: ${(error as any).message}`;

    return { data, error, query: sql_query };
}

// ========== Buscar Contato por Telefone ==========
export async function selectContactByPhone(supabase: any, phone: string) {
    const { data, error } = await supabase
        .from("zaip_contacts")
        .select("*")
        .eq("phone_complete", phone)
        .maybeSingle();
    return { data, error };
}
