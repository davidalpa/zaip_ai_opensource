import { insertMessageOutput, insertUsedTokens } from "../database_queries/sql_inserts.ts";
import { FlowState } from "../types/type_flow.ts";
import { FACEBOOK_API_VERSION, STORAGE_PUBLIC_URL } from "../index.ts";

export async function sendWhatsappMessage(
    facebookToken: string,
    phoneNumberId: string,
    to: string,
    bodyText: string,
    storagePublicUrl?: string
): Promise<{ success: boolean; messageId?: string; error?: any }> {
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${phoneNumberId}/messages`;

    // Check for media types based on URL patterns
    const storageUrl = storagePublicUrl || STORAGE_PUBLIC_URL || "";

    // Helper to check if string is a valid media URL in our storage
    const isValidMedia = (url: string, type: string) => {
        if (!url || typeof url !== 'string') return false;
        // Check 1: Must contain storage base URL (if configured)
        if (storageUrl && !url.startsWith(storageUrl)) {
            // Optional strict check
        }
        // Check 2: Must contain specific regex "/send/{type}/"
        return url.includes(`/send/${type}/`);
    };

    const isImage = isValidMedia(bodyText, "image");
    const isAudio = isValidMedia(bodyText, "audio");
    const isFile = isValidMedia(bodyText, "file");
    const isVideo = isValidMedia(bodyText, "video");
    const isSticker = isValidMedia(bodyText, "sticker");

    let body: any;

    if (isImage) {
        body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "image",
            image: {
                link: bodyText
            }
        };
    } else if (isAudio) {
        body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "audio",
            audio: {
                link: bodyText
            }
        };
    } else if (isFile) {
        // Extract filename from URL if possible, or use default
        const filename = bodyText.split("/").pop() || "Arquivo";
        body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "document",
            document: {
                link: bodyText,
                filename: filename
            }
        };
    } else if (isVideo) {
        body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "video",
            video: {
                link: bodyText
            }
        };
    } else if (isSticker) {
        body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "sticker",
            sticker: {
                link: bodyText
            }
        };
    } else {
        body = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: to,
            type: "text",
            text: {
                preview_url: true,
                body: bodyText
            }
        };
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${facebookToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `Status: ${response.status} - ${errorText}` };
        }

        const responseData = await response.json();
        const messageId = responseData.messages?.[0]?.id;
        return { success: true, messageId };
    } catch (err) {
        return { success: false, error: `Error sending WhatsApp message (fetch): ${(err as any).message || err}` };
    }
}

export async function sendWhatsappStatus(
    facebookToken: string,
    phoneNumberId: string,
    to: string,
    action: "typing_on" | "typing_off",
    messageId?: string // Kept for signature compatibility but not used for typing
): Promise<{ success: boolean; error?: any }> {
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${phoneNumberId}/messages`;

    let body: any;

    if (action === "typing_on") {
        if (!messageId) {
            return { success: false, error: "messageId is mandatory for typing_on status (custom payload)" };
        }
        body = {
            messaging_product: "whatsapp",
            status: "read",
            message_id: messageId,
            typing_indicator: {
                type: "text"
            }
        };
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${facebookToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `Status: ${response.status} - ${errorText}` };
        }
        return { success: true };
    } catch (err) {
        return { success: false, error: `Error sending WhatsApp status (fetch): ${(err as any).message || err}` };
    }
}

function calculateTypingDelay(text: string): number {
    const contagemCaracteres = text.length;
    let delay = 3;

    if (contagemCaracteres <= 20) {
        delay = 1;
    } else if (contagemCaracteres <= 60) {
        delay = 2;
    } else if (contagemCaracteres <= 200) {
        delay = 3;
    }

    // Random Jitter of +/- 0.2s
    const jitter = Math.random() * 0.4 - 0.2;
    delay = delay + jitter;

    // Clamp between 1 and 4 seconds (Meta timeout is ~4s)
    delay = Math.max(1, Math.min(4, delay));

    return parseFloat(delay.toFixed(2));
}

export async function markMessageAsRead(
    facebookToken: string,
    phoneNumberId: string,
    messageId: string
): Promise<boolean> {
    const url = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${phoneNumberId}/messages`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${facebookToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                status: "read",
                message_id: messageId
            }),
        });

        return response.ok;
    } catch {
        return false;
    }
}

export async function sendResponseMessages(
    state: FlowState
): Promise<{ success: boolean; messageIds: string[]; errors?: any[] }> {
    const errors: any[] = [];
    const messageIds: string[] = [];

    const messages = state.data.content.messagesToSend || [];
    const facebookToken = state.conf.tokens.facebook || "";
    // Use context field or state field. Context is safer as it's the source.
    const phoneNumberId = (state.data.context as any)?.facebook_phone_number_id || state.data.facebookPhoneNumberId || "";
    const to = state.data.senderNumber || "";
    const incomingMessageId = state.data.incomingMessageId;

    if (!facebookToken || !phoneNumberId || !to) {
        let missing = "";
        if (!facebookToken) missing += "facebookToken ";
        if (!phoneNumberId) missing += "phoneNumberId ";
        if (!to) missing += "recipientNumber";
        return { success: false, messageIds: [], errors: [`Missing required credentials: ${missing.trim()}`] };
    }

    // --------------------------------------------------------------------------------
    // REMOVED: Global "mark as read" at the start.
    // Now we do this per message to try to simulate "typing" (via status read)
    // or just to ensure the correct delay between messages.
    // --------------------------------------------------------------------------------
    // if (incomingMessageId) {
    //    await markMessageAsRead(facebookToken, phoneNumberId, incomingMessageId);
    // }

    for (const msg of messages) {
        if (msg && msg.trim()) {
            // Check for media types based on URL patterns
            const storageUrl = (state.conf as any)?.storagePublicUrl || STORAGE_PUBLIC_URL || "";

            const isValidMedia = (url: string, type: string) => {
                if (!url || typeof url !== 'string') return false;
                return url.includes(`/send/${type}/`); // Validate storageUrl prefix if necessary
            };

            const isImage = isValidMedia(msg, "image");
            const isAudio = isValidMedia(msg, "audio");
            const isFile = isValidMedia(msg, "file");
            const isVideo = isValidMedia(msg, "video");
            const isSticker = isValidMedia(msg, "sticker");
            const isMedia = isImage || isAudio || isFile || isVideo || isSticker;

            if (isMedia) {
                // Media: Send directly (no delay/typing)
                const result = await sendWhatsappMessage(
                    facebookToken,
                    phoneNumberId,
                    to,
                    msg,
                    storageUrl
                );

                if (!result.success) {
                    errors.push({ step: "send_whatsapp_media", message: msg, error: `Failed to send media: ${result.error}` });
                } else if (result.messageId) {
                    messageIds.push(result.messageId);
                    if (!state.logs.performance_first_response_seg) {
                        state.logs.performance_first_response_seg = parseFloat(((performance.now() - state.conf.startTime) / 1000).toFixed(2));
                    }
                }
            } else {
                // Texto: Delay + Typing + Enviar Texto

                // 1. Calcular Delay Dinâmico (Baseado no tamanho DESTA mensagem)
                const delay = calculateTypingDelay(msg);

                // 2. Tentar enviar "Digitando..." (Status Read/Typing)
                // Nota: O status "read" só funciona uma vez por messageId. 
                // For subsequent messages (2, 3...) it will fail or be ignored, 
                // mas o mais importante aqui é o DELAY abaixo.
                if (incomingMessageId && incomingMessageId.trim() !== "") {
                    // We don't retry here to not block flow if already read.
                    // Just try to send the signal.
                    try {
                        await sendWhatsappStatus(facebookToken, phoneNumberId, to, "typing_on", incomingMessageId);
                    } catch (e) {
                        // Ignore typing error (probably already read)
                    }
                }

                // 3. Wait Delay (Strictly)
                // This guarantees conversation pace, even if visual "typing" fails.
                await new Promise(resolve => setTimeout(resolve, delay * 1000));

                // 4. Send Message
                const result = await sendWhatsappMessage(
                    facebookToken,
                    phoneNumberId,
                    to,
                    msg,
                    storageUrl
                );

                if (!result.success) {
                    errors.push({ step: "send_whatsapp_message", message: msg, error: `Failed to send text message: ${result.error}` });
                } else if (result.messageId) {
                    messageIds.push(result.messageId);
                    if (!state.logs.performance_first_response_seg) {
                        state.logs.performance_first_response_seg = parseFloat(((performance.now() - state.conf.startTime) / 1000).toFixed(2));
                    }
                }
            }

            // 6. Extra Buffer between messages (500ms)
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    return { success: errors.length === 0, messageIds, errors: errors.length > 0 ? errors : undefined };
}
