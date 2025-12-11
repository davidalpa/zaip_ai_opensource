import { identifyContext } from "./step_1_identification.ts";
import { ensureSession } from "./step_2_session.ts";
import { processMessage } from "./step_3_message_type.ts";
import { executeAiFlow } from "./step_4_ai_response.ts";
import { sendResponseMessages, sendWhatsappMessage } from "./step_5_send_whatsapp_message.ts";
import { callZaipLLM, appendUserMessageToOpenAI } from "./process_openai_api_response.ts";
import { inativateConversation } from "../database_queries/sql_tools_updates.ts";
import { insertMessageOutput, insertUsedTokens, insertConversation, insertContact } from "../database_queries/sql_inserts.ts";
import { selectLatestMessage } from "../database_queries/sql_selects.ts";
import { createConversationOpenAI } from "./create_conversation.ts";
import { FlowState, StepLog, FlowContext } from "../types/type_flow.ts";
import { WhatsAppWebhookBody } from "../types/type_webhook.ts";

// ============================================================================
// HELPER FUNCTIONS (Defined in order of usage in main flow)
// ============================================================================

/**
 * Step 1: Validate Webhook Payload
 * Checks if payload contains a valid WhatsApp message.
 */
async function parseAndValidatePayload(rawBody: any): Promise<WhatsAppWebhookBody | Response> {
    if (!rawBody) {
        return new Response(JSON.stringify({ error: "Corpo vazio" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    const body: WhatsAppWebhookBody = rawBody;

    // Filter non-message events
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ ok: true, message: "Evento de não-mensagem ignorado" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }

    if (!messages[0].from) {
        return new Response(JSON.stringify({ ok: true, message: "Mensagem sem remetente ignorada" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    }

    return body;
}

/**
 * Step 4: Handle #LIMPAR Command
 * Allows user to reset current conversation and start a new one.
 */
async function handleLimpar(
    body: WhatsAppWebhookBody,
    validContactId: string, // <-- Added argument
    context: any,
    senderNumber: string,
    supabase: any,
    facebookToken?: string,
    openaiApiKey?: string
): Promise<{ isLimpar: boolean; errors?: any[] }> {
    const errors: any[] = [];
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const messageType = message?.type;
    const messageBody = message?.text?.body || "";

    if (messageType !== "text" || messageBody.trim().toUpperCase() !== "#LIMPAR") {
        return { isLimpar: false };
    }

    const _contactId = validContactId; // Use valid ID from session
    const _accountId = context._id_account; // single-tenant compat (não usado)
    const _inboxId = context._id_inbox;     // single-tenant compat (não usado)
    const facebookTokenCtx = (context as any).facebook_token;
    const phoneNumberId = (context as any).facebook_phone_number_id;
    const contactPhone = (context as any).contact_phone || senderNumber;
    const openaiApiKeyCtx = (context as any).openai_apikey;

    const resolvedFacebookToken = facebookToken || facebookTokenCtx;
    const resolvedOpenaiKey = openaiApiKey || openaiApiKeyCtx;

    let newConversationId = "";
    let zaipsId = context._id_zaips;

    try {
        const newConv = await insertConversation(supabase, _contactId);
        if (newConv) {
            newConversationId = newConv._id_conversation;
        }

        if (resolvedOpenaiKey && newConversationId) {
            await createConversationOpenAI(supabase, resolvedOpenaiKey, newConversationId, _contactId);
        }

        if (resolvedFacebookToken && phoneNumberId) {
            const msgText = `*STATUS:* Histórico da conversa resetado.\n\nConversa: #${newConversationId} \nContato: #${_contactId}`;
            await sendWhatsappMessage(resolvedFacebookToken, phoneNumberId, contactPhone, msgText);
        }

    } catch (err) {
        errors.push({ step: "handle_limpar_execution", error: `Erro ao executar limpeza: ${(err as any).message || err}` });
    }

    return { isLimpar: true, errors: errors.length > 0 ? errors : undefined };
}

/**
 * Step 7: Validate Business Rules
 * Checks account limits, contact/conversation status, and 7-day rule.
 */
function validateBusinessRules(
    context: FlowContext,
    contextType: "full" | "inbox" | "none",
    conversationId: string | null,
    openaiConversationId: string | null
): { isValid: boolean; isRecent: boolean; validationErrors: any } {
    let isValid = true;
    const errors: string[] = [];

    // Extract values with defaults
    const messagesToday = context.messages_today_count || 0;
    const conversationsMonth = context.conversations_this_month_count || 0;
    const contactStatus = context.contact_status || "ativo";
    const conversationStatus = context.conversation_status; // can be undefined
    const isFullContext = contextType === "full";

    // 1. Limites
    if (messagesToday > 10000) isValid = false; // Hard limit safety

    // 2. Contact Status (only if Full Context)
    if (isFullContext) {
        if (contactStatus !== "ativo") isValid = false;
    } else {
        // If not full, we need at least valid IDs
        if (!conversationId || !openaiConversationId) {
            isValid = false;
        }
    }

    // 3. 7-Day Rule (Cooldown)
    let isRecent = true;
    if (isValid) {
        if (isFullContext && context.conversation_date_created) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const conversationDate = new Date(context.conversation_date_created);
            isRecent = conversationDate >= sevenDaysAgo;
        } else if (!isFullContext && !context.conversation_date_created) {
            // If no date, assume true or false depending on business rule.
            // Here assuming true to not block inbox flow without date.
            isRecent = true;
        }
    }

    // 4. Conversation Status (if exists)
    if (isValid && conversationId && conversationStatus && conversationStatus !== "ativo") {
        isValid = false;
    }

    return {
        isValid,
        isRecent,
        validationErrors: {
            messagesToday,
            conversationsMonth,
            contactStatus,
            conversationStatus
        }
    };
}



/**
 * Final Step: End Request
 * Returns standardized response to webhook.
 */
function endRequest(startTime: number, status: string, output: any): Response {
    return new Response(JSON.stringify({
        ok: true,
        status: status,
        output: output
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
}

// ============================================================================
// MAIN HANDLER: handleMessageEvent
// ============================================================================

/**
 * Main Message Processing Flow
 * 
 * Steps:
 * 1. Validate Payload
 * 2. Identify Context (Inbox/Contact/Conversation)
 * 3. Ensure Session (Contact + Conversation + OpenAI Thread)
 * 4. Handle #LIMPAR Command
 * 5. Process Message Content
 * 6. Debounce (Group rapid messages)
 * 7. Validate Business Rules
 * 8. Execute AI Flow
 * 9. Send WhatsApp Response
 * 10. End Request
 */
export async function handleMessageEvent(
    state: FlowState,
    body: any,
    logStep: (step: string, status: StepLog["status"], data?: any, error?: any) => void
): Promise<Response> {
    logStep("flow_messages", "pending");

    // ========================================================================
    // Step 1: Validar Payload
    // ========================================================================
    const bodyOrResponse = await parseAndValidatePayload(body);
    if (bodyOrResponse instanceof Response) {
        const isStatusUpdate = body?.entry?.[0]?.changes?.[0]?.value?.statuses;
        state.logs.status = isStatusUpdate ? "ignored_status_update" : "early_return_payload_validation";
        logStep("parse_payload", "skipped", { reason: state.logs.status });
        return bodyOrResponse;
    }
    const validatedBody = bodyOrResponse as WhatsAppWebhookBody;
    logStep("parse_payload", "success");

    // ========================================================================
    // Step 2: Identificar Contexto
    // ========================================================================
    const { senderNumber, receiverNumber, context, contextType, errors: idErrors } = await identifyContext(validatedBody, state.supabase, state.conf.facebookPhoneNumberId);
    if (idErrors) state.logs.errors.push(...idErrors);

    if (!context) {
        const errMsg = `Canal não encontrado para sender=${senderNumber}, receiver=${receiverNumber}`;
        state.logs.errors.push(errMsg);
        state.logs.status = "error_channel_not_found";
        logStep("identify_context", "error", { senderNumber, receiverNumber }, "Canal não encontrado");
        return new Response(JSON.stringify({ ok: false, message: "Canal não encontrado" }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Populate State
    state.data.senderNumber = senderNumber;
    state.data.receiverNumber = receiverNumber;
    state.data.context = context;
    state.data.contextType = contextType;
    // Single-tenant: não usar account/inbox/zaip ids
    // state.data.inboxStatus = context.inbox_status; // Removed
    // state.data.accountStatus = context.account_status; // Removed

    // Tokens devem vir do ambiente (state.conf.tokens). Não sobrescrever com valores de contexto do banco.

    if (context) {
        state.data.stepProcess = (context as any).step_process || (context as any).process_name || "1 - Atendimento Iniciado";

    }

    logStep("identify_context", "success", { senderNumber, receiverNumber, contextType, inboxId: "1" });

    const entry = validatedBody.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const incomingMessageId = value?.messages?.[0]?.id || "";
    state.data.incomingMessageId = incomingMessageId;

    if (!incomingMessageId) {
        state.logs.errors.push({ step: "extract_message_id", error: "incomingMessageId is undefined" });
    }

    // ========================================================================
    // Step 3: Garantir Sessão (Contato + Conversa + Thread)
    // ========================================================================
    const session = await ensureSession(context, contextType, validatedBody, state.supabase, state.conf.tokens.openai);
    if (session.errors) state.logs.errors.push(...session.errors);

    if (!session.conversationId) {
        state.logs.errors.push(`Session configuration failed: ContactId=${session.contactId}, ConversationId=${session.conversationId}`);
        state.logs.status = "error_session";
        logStep("ensure_session", "error", null, "Session configuration failed");
        return new Response(JSON.stringify({ ok: false, message: "Session configuration failed" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    state.data.session = session;
    state.data.contactId = session.contactId;
    state.data.conversationId = session.conversationId;
    state.data.openaiConversationId = session.openaiConversationId || undefined;
    state.data.isNewContact = session.isNewContact;
    state.data.isNewConversation = session.isNewConversation;

    // Coalesce Status for New Entities
    state.data.contactStatus = context.contact_status || (session.isNewContact ? "ativo" : undefined);
    state.data.conversationStatus = context.conversation_status || session.conversationStatus || (session.isNewConversation ? "ativo" : undefined);

    logStep("ensure_session", "success", {
        contactId: session.contactId,
        conversationId: session.conversationId,
        isNewContact: session.isNewContact,
        isNewConversation: session.isNewConversation,
        contactStatus: state.data.contactStatus,
        conversationStatus: state.data.conversationStatus
    });

    // ========================================================================
    // Step 4: Tratar Comando #LIMPAR
    // ========================================================================
    // ========================================================================
    // Step 4: Tratar Comando #LIMPAR
    // ========================================================================
    const { isLimpar, errors: limparErrors } = await handleLimpar(
        validatedBody,
        state.data.contactId!, // Pass valid contactId from session
        context,
        senderNumber,
        state.supabase,
        state.conf.tokens.facebook,
        state.conf.tokens.openai
    );
    if (limparErrors) state.logs.errors.push(...limparErrors);

    if (isLimpar) {
        state.logs.status = "reset_completed";
        logStep("handle_limpar", "success", { isLimpar: true });
        return endRequest(state.conf.startTime, "Reset Completed", "Reset completed");
    }
    logStep("handle_limpar", "success", { isLimpar: false });

    // ========================================================================
    // Step 5: Processar Mensagem e Salvar
    // ========================================================================
    const { aiContent: messageBody, insertedMessageId, errors: msgErrors } = await processMessage(
        validatedBody,
        context,
        session.agentDetails,
        senderNumber,
        session.contactId,
        session.conversationId,
        state.supabase,
        state.conf.tokens.facebook,
        state.conf.tokens.openai
    );
    if (msgErrors) state.logs.errors.push(...msgErrors);

    if (!messageBody) {
        state.logs.status = "error_process_message";
        logStep("process_message", "error", null, "Failed to process message (empty body)");
        return new Response(JSON.stringify({ ok: false, message: "Failed to process message" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    state.data.messageId = insertedMessageId;
    state.data.content.messageBody = messageBody; // Added explicit assignment

    logStep("process_message", "success", { messageBodyPreview: messageBody.substring(0, 100), insertedMessageId });

    // ========================================================================
    // Step 6: Debounce (Agrupar Mensagens Rápidas)
    // ========================================================================
    if (session.conversationId && insertedMessageId) {
        logStep("debounce_wait", "pending", { duration_ms: 5000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        logStep("debounce_wait", "success");

        const { data: latestMessage, error: latestMsgError } = await selectLatestMessage(
            state.supabase,
            session.conversationId
        );

        if (latestMsgError) {
            state.logs.errors.push({ step: "debounce_check", error: latestMsgError });
        } else if (latestMessage && latestMessage._id_message !== insertedMessageId) {
            state.logs.status = "debounced";
            state.logs.info = "Debounce: Newer message found, aborting AI execution.";
            logStep("debounce_check", "skipped", {
                reason: "newer_message_found",
                currentId: insertedMessageId,
                latestId: latestMessage._id_message
            });

            if (session.openaiConversationId && state.conf.tokens.openai) {
                try {
                    await appendUserMessageToOpenAI(
                        state.conf.tokens.openai,
                        session.openaiConversationId,
                        messageBody
                    );
                    logStep("append_openai_message", "success");
                } catch (err) {
                    state.logs.errors.push({ step: "append_openai_message", error: `Append Message Failed: ${(err as any).message || err}` });
                    logStep("append_openai_message", "error", null, (err as any).message || err);
                }
            }

            return endRequest(state.conf.startTime, "Agrupando Mensagens", "Foi recebido uma nova mensagem, vamos agrupar elas para responder de uma vez");
        }
        logStep("debounce_check", "success", { result: "continue_execution" });
    } else {
        logStep("debounce_check", "skipped", { reason: "no_conversation_or_message_id" });
    }

    // ========================================================================
    // Step 7: Validar Regras de Negócio
    // ========================================================================
    const { isValid, isRecent, validationErrors } = validateBusinessRules(
        context,
        contextType,
        session.conversationId,
        session.openaiConversationId || null
    );

    if (!isValid) state.data.processData = { validationErrors };

    logStep("validate_rules", isValid ? "success" : "skipped", { isValid, isRecent, validationErrors });

    if (isValid && isRecent && session.openaiConversationId) {
        // ====================================================================
        // Step 8: Executar Fluxo de IA
        // ====================================================================
        logStep("ai_workflow_start", "pending");



        const aiResult = await executeAiFlow(state, logStep);

        if (aiResult.errors) state.logs.errors.push(...aiResult.errors);

        state.data.content.aiResponse = aiResult.aiResponseText || undefined;
        state.data.content.messagesToSend = aiResult.messagesToSend;
        state.data.processData = aiResult.processData;

        state.data.content.openaiInput = aiResult.requestBody;
        state.data.content.openaiOutput = aiResult.rawResponse;

        if (state.data.context) {
            (state.data.context as any).current_step = aiResult.currentStep;
        }

        if (aiResult) {
            state.data.content.slots = (aiResult as any).slots;
            state.data.content.reason = (aiResult as any).reason;
            state.data.content.script_name_last_used = (aiResult as any).script_name_last_used;

            // Inativar Conversa se AI retornou end_conversation=true
            if (state.data.content.slots?.end_conversation === "true") {
                await inativateConversation(state.supabase, state.data.conversationId!);
                state.logs.info = (state.logs.info || "") + " | Conversation Inactivated by AI.";
                logStep("inativate_conversation", "success");
            }
        }

        logStep("ai_workflow_end", "success", {
            messagesToSend: aiResult.messagesToSend
        });

        // ====================================================================
        // Step 9: Enviar Resposta via WhatsApp
        // ====================================================================
        if (state.data.content.messagesToSend && state.data.content.messagesToSend.length > 0) {
            const incomingMessageId = state.data.incomingMessageId;

            if (!incomingMessageId) {
                state.logs.errors.push({
                    step: "extract_message_id",
                    error: "incomingMessageId is undefined"
                });
            }

            const sendResult = await sendResponseMessages(state);

            if (sendResult.errors) {
                state.logs.errors.push(...sendResult.errors);
                logStep("send_whatsapp", "error", null, sendResult.errors);
            }

            // Calculate fractional token usage
            const usage = (state.data.processData as any)?.usage;
            const msgCount = state.data.content.messagesToSend.length;

            let tokensTotal = 0;
            let tokensInput = 0;
            let tokensOutput = 0;
            let tokensCached = 0;
            let tokensReasoning = 0;

            if (usage && msgCount > 0) {
                tokensTotal = Math.round((usage.total_tokens || 0) / msgCount);
                tokensInput = Math.round((usage.prompt_tokens || 0) / msgCount);
                tokensOutput = Math.round((usage.completion_tokens || 0) / msgCount);

                const promptDetails = usage.prompt_tokens_details || {};
                const completionDetails = usage.completion_tokens_details || {};

                tokensCached = Math.round((promptDetails.cached_tokens || 0) / msgCount);
                tokensReasoning = Math.round((completionDetails.reasoning_tokens || 0) / msgCount);
            }

            const dbMessageIds: string[] = [];

            for (const msg of state.data.content.messagesToSend) {
                try {
                    const savedMsg = await insertMessageOutput(state.supabase, {
                        _id_contact: state.data.contactId!,
                        _id_conversation: state.data.conversationId!,
                        message: msg,
                        tokens_total_used: tokensTotal,
                        tokens_input_used: tokensInput,
                        tokens_output_used: tokensOutput,
                        tokens_cached_used: tokensCached,
                        tokens_reasoning_used: tokensReasoning,
                        ai_gpt_model: state.data.session?.agentDetails?.ai_gpt_model || null,
                        ai_audio_model: state.data.session?.agentDetails?.ai_audio_model || null,
                        ai_audio_response: state.data.session?.agentDetails?.ai_audio_response || null
                    });

                    if (savedMsg && savedMsg._id_message) {
                        dbMessageIds.push(savedMsg._id_message);
                    }
                } catch (err) {
                    state.logs.errors.push({ step: "insertMessageOutput", error: `Erro ao salvar mensagem de resposta no banco: ${(err as any).message || err}` });
                }
            }

            if (!sendResult.errors || sendResult.errors.length === 0) {
                logStep("send_whatsapp", "success", {
                    count: state.data.content.messagesToSend.length,
                    whatsappMessageIds: sendResult.messageIds,
                    dbMessageIds: dbMessageIds
                });
            }
        } else {
            state.logs.info = "Nenhuma mensagem para enviar (IA não gerou resposta ou erro)";
            logStep("send_whatsapp", "skipped", { reason: "no_messages_to_send" });
        }

        // Log Token Usage
        if ((state.data.processData as any)?.usage) {
            const tokenError = await insertUsedTokens(state.supabase, {
                _id_contact: state.data.contactId!,
                _id_conversation: state.data.conversationId!,
                usage_type: "chat_completion",
                ai_model: state.data.session?.agentDetails?.ai_gpt_model || "unknown",
                tokens_total_used: (state.data.processData as any).usage.total_tokens,
                tokens_input_used: (state.data.processData as any).usage.prompt_tokens,
                tokens_output_used: (state.data.processData as any).usage.completion_tokens
            });
            if (tokenError) {
                state.logs.errors.push({ step: "log_tokens", error: tokenError });
            } else {
                logStep("log_tokens", "success", { usage: (state.data.processData as any).usage });
            }
        }

        // ====================================================================
        // Step 10: Encerrar Request (Sucesso)
        // ====================================================================
        state.logs.status = "success";

        let finalStatus = "Mensagem Enviada";
        let finalOutput = JSON.stringify({ messages: state.data.content.messagesToSend });

        if (!state.data.content.messagesToSend || state.data.content.messagesToSend.length === 0) {
            finalStatus = "Nenhuma mensagem enviada";
            if (aiResult && aiResult.errors && aiResult.errors.length > 0) {
                const errorMessages = aiResult.errors.map((e: any) => typeof e.error === 'string' ? e.error : JSON.stringify(e.error)).join("; ");
                finalOutput = `Erro: ${errorMessages}`;
            } else {
                finalOutput = "Nenhuma mensagem gerada pela IA.";
            }
        }

        state.data.finalStatus = finalStatus;
        state.data.finalOutput = finalOutput;

        logStep("flow_messages", "success");
        return endRequest(state.conf.startTime, finalStatus, finalOutput);
    }

    // ========================================================================
    // Step 10: Encerrar Request (Regras de Negócio não atendidas) 
    // ========================================================================
    const errors = state.data.processData?.validationErrors;
    if (errors?.accountStatus !== "ativo") {
        state.logs.status = "skipped_account_inactive";
    } else if (errors?.inboxStatus !== "ativo") {
        state.logs.status = "skipped_inbox_inactive";
    } else if (errors?.contactStatus !== "ativo") {
        state.logs.status = "skipped_contact_inactive";
    } else if (errors?.conversationStatus !== "ativo") {
        state.logs.status = "skipped_conversation_inactive";
    } else {
        state.logs.status = "skipped_other_rules";
    }

    logStep("flow_messages", "success");
    return endRequest(state.conf.startTime, "Regras de Negócio", "Mensagem ignorada pelas regras de negócio (horário, limite, etc)");
}
