// import { SupabaseClient } from "jsr:@supabase/supabase-js@2"; // Removed
import { getFacebookMediaUrl, downloadMedia, uploadMediaToSupabase } from "./process_media_transfer.ts";
import { insertMessageInputMediaTag, insertUsedTokens } from "../database_queries/sql_inserts.ts";
import { FlowContext } from "../types/type_flow.ts";

export async function processImageMessage(
    supabase: any,
    message: any,
    facebookToken: string,
    openaiApiKey: string,
    context: FlowContext,
    senderNumber: string,
    contactId: string,
    conversationId: string
): Promise<{ dbContent: string, aiContent: string }> {
    const imageId = message.image.id;
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");

    // Construct filename similar to n8n: image_NUMBER_ACCOUNT_ZAIP_INBOX_CONV_CONTACT_TIME.jpg
    const filename = `image_${senderNumber}_1_1_1_${conversationId}_${contactId}_${timestamp}.jpg`;
    const path = `imagens_api_oficial/${filename}`;



    // 1. Get URL and Download
    const fbUrl = await getFacebookMediaUrl(imageId, facebookToken);
    const blob = await downloadMedia(fbUrl, facebookToken);

    // 2. Upload to Supabase
    const publicUrl = await uploadMediaToSupabase(supabase, "publico", path, blob, "image/jpeg");


    // 3. Call OpenAI Vision
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "gpt-4o-mini", // Using mini as per n8n flow usually, or standard
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Rescreva de maneira resumido o que contem na imagem, considerando o contexto da conversa para fazer sentido."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: publicUrl,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 1000
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    const description = data.choices[0].message.content;

    // 4. Logar Tokens
    const tokenError = await insertUsedTokens(supabase, {
        _id_contact: contactId,
        _id_conversation: conversationId,
        usage_type: "Imagem para Texto",
        ai_model: data.model,
        tokens_total_used: data.usage.total_tokens,
        tokens_input_used: data.usage.prompt_tokens,
        tokens_output_used: data.usage.completion_tokens,
        tokens_reasoning_used: data.usage.completion_tokens_details?.reasoning_tokens || 0,
        tokens_audio_used: 0 // Não é áudio
    });

    if (tokenError) {
        throw new Error(`Failed to log tokens in processImageMessage: ${tokenError.message}`);
    }

    return {
        dbContent: publicUrl,
        aiContent: `O usuário enviou uma imagem, utilize esta informação para responder o usuário considerando o contexto da conversa. Leia a descrição da imagem: '${(description as string) || ""}'`
    };
}
