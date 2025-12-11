import { updateConversationOpenAIId } from "../database_queries/sql_updates.ts";

export async function createConversationOpenAI(
    supabase: any,
    openaiApiKey: string,
    idConversation: string,
    idContact: string
) {
    // 1. POST para OpenAI
    const response = await fetch("https://api.openai.com/v1/conversations", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            metadata: {
                _id_conversation: String(idConversation),
                _id_contact: String(idContact),
            },
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error creating conversation (Status: ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const openaiConversationId = data.id;

    if (!openaiConversationId) {
        throw new Error("Invalid OpenAI API response: 'id' field missing in conversation creation response.");
    }

    // 2. ATUALIZAR zaip_conversation
    const updateError = await updateConversationOpenAIId(supabase, idConversation, openaiConversationId);

    if (updateError) {
        throw new Error(updateError.message);
    }

    return openaiConversationId;
}
