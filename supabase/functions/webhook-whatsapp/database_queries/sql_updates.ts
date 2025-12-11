

// Planned SQL:
// UPDATE zaip_conversations
// SET openai_conversation_id = '${openaiConversationId}'
// WHERE _id_conversation = '${conversationId}';
//
// Typescript Used:
export async function updateConversationOpenAIId(
    supabase: any,
    conversationId: string,
    openaiConversationId: string
) {
    const { error } = await supabase
        .from("zaip_conversations")
        .update({ openai_conversation_id: openaiConversationId })
        .eq("_id_conversation", conversationId);

    if (error) {
        (error as any).message = `Failed to update openai_conversation_id: ${error.message}`;
        return error;
    }
    return null;
}


