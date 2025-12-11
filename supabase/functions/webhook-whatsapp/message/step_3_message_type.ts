
import { WhatsAppWebhookBody } from "../types/type_webhook.ts";
import { FlowContext, FlowState, SessionResult } from "../types/type_flow.ts";
import { insertMessageInput, insertMessageInputMediaTag } from "../database_queries/sql_inserts.ts";

export async function processMessage(
    body: WhatsAppWebhookBody,
    context: FlowContext,
    agentDetails: any,
    senderNumber: string,
    contactId: string,
    conversationId: string,
    supabase: any,
    facebookToken?: string,
    openaiApiKey?: string
): Promise<{ aiContent: string; insertedMessageId?: string; errors?: any[] }> {
    const errors: any[] = [];
    const messageData = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const messageType = messageData?.type;
    let dbContent = "";
    let aiContent = "";

    if (messageType === "text") {
        const text = messageData?.text?.body || "";
        dbContent = text;
        aiContent = text;
    } else if (messageType === "image") {
        try {
            const { processImageMessage } = await import("./process_image.ts");
            const fbToken = facebookToken;
            const openaiKey = openaiApiKey || agentDetails?.openai_apikey;

            if (fbToken && openaiKey) {
                const result = await processImageMessage(
                    supabase,
                    messageData,
                    fbToken,
                    openaiKey,
                    context,
                    senderNumber,
                    contactId,
                    conversationId
                );
                dbContent = result.dbContent;
                aiContent = result.aiContent;
            } else {
                const err = "Error: Incomplete API configuration to process image.";
                dbContent = err;
                aiContent = err;
                errors.push({ step: "process_image", error: err });
            }
        } catch (e) {
            const err = "Erro ao processar imagem.";
            dbContent = err;
            aiContent = err;
            errors.push({ step: "process_image_catch", error: `Erro ao processar imagem (catch): ${(e as any).message || e}` });
        }
    } else if (messageType === "audio") {
        try {
            const { processAudioMessage } = await import("./process_audio.ts");
            const fbToken = facebookToken;
            const openaiKey = openaiApiKey || agentDetails?.openai_apikey;

            if (fbToken && openaiKey) {
                const result = await processAudioMessage(
                    supabase,
                    messageData,
                    fbToken,
                    openaiKey,
                    context,
                    senderNumber,
                    contactId,
                    conversationId
                );
                dbContent = result.dbContent;
                aiContent = result.aiContent;
            } else {
                const err = "Erro: Configuração de API incompleta para processar áudio.";
                dbContent = err;
                aiContent = err;
                errors.push({ step: "process_audio", error: err });
            }
        } catch (e) {
            const err = "Erro ao processar áudio.";
            dbContent = err;
            aiContent = err;
            errors.push({ step: "process_audio_catch", error: `Erro ao processar áudio (catch): ${(e as any).message || e}` });
        }
    } else if (messageType === "video") {
        const msg = "O usuário enviou um vídeo e você não pode ver por conta da plataforma que utiliza para realizar o atendimento";
        dbContent = msg;
        aiContent = msg;
    } else if (messageType === "document" || messageType === "file") {
        const msg = "O usuário enviou um arquivo e você não pode baixar para ver por conta da plataforma que utiliza para realizar o atendimento";
        dbContent = msg;
        aiContent = msg;
    } else if (messageType === "location") {
        const msg = "O usuário enviou uma localização e você não pode ver por conta da plataforma que utiliza para realizar o atendimento";
        dbContent = msg;
        aiContent = msg;
    } else {
        const msg = `Mensagem do tipo ${messageType} recebida.`;
        dbContent = msg;
        aiContent = msg;
    }

    // 1. Insert original message (Text or Media with URL)
    let insertedMessageId = null;
    try {
        let result;
        if (messageType === "audio" || messageType === "image") {
            // If media, use TAG insert (with URL)
            result = await insertMessageInputMediaTag(supabase, {
                _id_contact: contactId,
                _id_conversation: conversationId,
                message: dbContent
            });
        } else {
            // If text or others, use normal insert
            result = await insertMessageInput(supabase, {
                _id_contact: contactId,
                _id_conversation: conversationId,
                message: dbContent
            });
        }
        if (result && result._id_message) {
            insertedMessageId = result._id_message;
        }
    } catch (error) {
        errors.push({ step: "insert_message_input_original", error: `Erro ao inserir mensagem original: ${(error as any).message || error}` });
    }

    // 2. If Media (Audio/Image), also insert transcription as a new message (Normal input)
    if ((messageType === "audio" || messageType === "image") && aiContent) {
        try {
            const resultTranscription = await insertMessageInput(supabase, {
                _id_contact: contactId,
                _id_conversation: conversationId,
                message: aiContent // Inserts transcription/description
            });
            // CRITICAL UPDATE: If transcription inserted, THIS becomes the latest ID
            // This prevents Step 6 (Debounce) from failing thinking it's a new message
            if (resultTranscription && resultTranscription._id_message) {
                insertedMessageId = resultTranscription._id_message;
            }
        } catch (error) {
            errors.push({ step: "insert_message_input_transcription", error: `Erro ao inserir transcrição da mensagem: ${(error as any).message || error}` });
        }
    }

    return { aiContent, insertedMessageId, errors: errors.length > 0 ? errors : undefined };
}
