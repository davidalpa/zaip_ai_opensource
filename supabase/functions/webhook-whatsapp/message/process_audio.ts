// import { SupabaseClient } from "jsr:@supabase/supabase-js@2"; // Removed
import { getFacebookMediaUrl, downloadMedia, uploadMediaToSupabase } from "./process_media_transfer.ts";
import { insertMessageInputMediaTag, insertUsedTokens } from "../database_queries/sql_inserts.ts";
import { FlowContext } from "../types/type_flow.ts";

export async function processAudioMessage(
    supabase: any,
    message: any,
    facebookToken: string,
    openaiApiKey: string,
    context: FlowContext,
    senderNumber: string,
    contactId: string,
    conversationId: string
): Promise<{ dbContent: string, aiContent: string }> {
    const audioId = message.audio.id;
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");

    // Construct filename: audio_NUMBER_ACCOUNT_ZAIP_INBOX_CONV_CONTACT_TIME.ogg
    const filename = `audio_${senderNumber}_1_1_1_${conversationId}_${contactId}_${timestamp}.ogg`;
    const path = `audios_api_oficial/${filename}`;



    // 1. Get URL and Download
    const fbUrl = await getFacebookMediaUrl(audioId, facebookToken);
    const blob = await downloadMedia(fbUrl, facebookToken);

    // 2. Upload to Supabase
    const publicUrl = await uploadMediaToSupabase(supabase, "publico", path, blob, "audio/ogg");


    // 3. Call OpenAI Whisper
    // Note: Whisper API requires multipart/form-data with the file
    const formData = new FormData();
    formData.append("model", "whisper-1");
    formData.append("file", blob, "audio.ogg"); // OpenAI needs a filename
    formData.append("language", "pt");
    formData.append("prompt", "Transcreva o audio que está em Português do Brasil. Escreva sem formatação especial.");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI Whisper API error: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    const transcription = data.text;

    // 4. Log Tokens (Whisper doesn't return token usage in the same way, but we can log the event)
    // The n8n flow logs 'tokens_audio_used' if available, or just logs the event.
    // Whisper is charged by minute, not token. But we can log 0 or estimate.
    // The n8n JSON shows 'tokens_audio_used' mapping from response if available.
    // Standard Whisper response: { text: "..." }
    // Detailed JSON might give duration.
    // for now we log 0 tokens but register usage type.

    const tokenError = await insertUsedTokens(supabase, {
        _id_contact: contactId,
        _id_conversation: conversationId,
        usage_type: "Audio para Texto",
        ai_model: "whisper-1",
        tokens_total_used: 0,
        tokens_input_used: 0,
        tokens_output_used: 0,
        tokens_audio_used: 0 // Placeholder
    });

    if (tokenError) {
        throw new Error(`Failed to log tokens in processAudioMessage: ${tokenError.message}`);
    }

    return {
        dbContent: publicUrl,
        aiContent: (transcription as string) || ""
    };
}
