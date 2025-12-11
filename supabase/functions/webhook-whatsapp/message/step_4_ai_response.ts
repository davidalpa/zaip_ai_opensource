import { FlowState, SessionResult, FlowContext } from "../types/type_flow.ts";
import { createPrompt } from "./create_prompt.ts";
import { callZaipLLM, appendUserMessageToOpenAI } from "./process_openai_api_response.ts";
import { sendWhatsappStatus, sendWhatsappMessage } from "./step_5_send_whatsapp_message.ts";
import { selectLatestMessage } from "../database_queries/sql_selects.ts";
import { insertOpenAIRequest } from "../database_queries/sql_inserts.ts";
import { updateContactName, updateCompanyNameAndArea, updatePipelineStage, updateStepConversation } from "../database_queries/sql_tools_updates.ts";
import { getProcessPrompt, getPipelineStage } from "../config/steps_config.ts";
import { AgentConfig } from "../config/agent_config.ts";


// fetchProcessData removed (replaced by getProcessPrompt config usage)

export async function executeAiFlow(
    state: FlowState,
    logStep: (step: string, status: "pending" | "success" | "error" | "skipped" | "info", data?: any, error?: any) => void
) {
    const errors: any[] = [];

    // Construct summary (fullContext) from state
    // We assume context and session are populated because executeAiFlow is called after they are set.
    const context = state.data.context as FlowContext;
    const session = state.data.session!;

    // Merge data for prompt construction
    const summary: any = {
        ...context,
        ...session,
        openai_conversation_id: session.openaiConversationId || context.openai_conversation_id, // Ensure snake_case for prompt
        _id_contact: session.contactId || context._id_contact, // Ensure correct contact ID (from session if new)
        _id_conversation: session.conversationId || context._id_conversation, // Ensure correct conversation ID (from session if new)
        ...(session.zaipData || {}),
        ...(session.zaipData || {}),
        ...(session.agentDetails || {}),
        storagePublicUrl: state.conf.storagePublicUrl
    };

    // Ensure tokens are available in summary if needed by constructPrompt or others
    if (state.conf.tokens.openai) summary.openai_apikey = state.conf.tokens.openai;

    const messageBody = state.data.content.messageBody || "";
    const conversationId = state.data.conversationId!;
    const openaiConversationId = state.data.openaiConversationId!;
    const senderNumber = state.data.senderNumber!;
    const supabase = state.supabase;
    const mcpToken = state.conf.tokens.mcp;


    // 1. Fetch Process Data (configuration file)
    const currentStep = Number(summary.current_step || 1); // FORCE NUMBER TYPE
    const stepPrompt = summary.process_prompt || getProcessPrompt(currentStep) || "";
    const processData = stepPrompt ? { process_prompt: stepPrompt, process_step_number: currentStep } : null;

    if (!processData) {
        errors.push({
            step: "ai_fetch_process_data",
            error: `Process data not found for step ${currentStep}. Aborting AI execution to prevent hallucination.`,
            details: { step: currentStep }
        });
        return {
            aiResponse: null,
            aiResponseText: null,
            processData: null,
            currentStep,
            messagesToSend: [],
            errors,
            debugInfo: null
        };
    }

    const { instructions, system_prompt } = createPrompt(summary, processData);

    // 3. Call OpenAI API
    let aiResponseText = "";
    let rawResponse = null;
    let debugInfo = null;

    try {
        // Removed explicit ai_api_request pending here to control order inside onBeforeRequest

        const llmResult = await callZaipLLM({
            input: messageBody,
            conversation: openaiConversationId,
            apiKey: summary.openai_apikey || "",
            mcpToken: mcpToken,
            model: summary.ai_gpt_model,
            instructions: instructions,
            systemMessage: system_prompt,
            temperature: summary.openai_temperature,
            onBeforeRequest: async (requestBody) => {
                // LOG INPUT (Before Request)
                const err = await insertOpenAIRequest(supabase, {
                    type: "INPUT",
                    json: requestBody,
                    _id_contact: summary._id_contact,
                    _id_conversation: conversationId
                });
                if (err) {
                    logStep("save_openai_input", "error", null, err);
                } else {
                    logStep("save_openai_input", "success");
                }


            }
        });

        aiResponseText = llmResult.outputText || "";
        rawResponse = llmResult.raw;
        debugInfo = llmResult.debugInfo;

        logStep("ai_api_request", "success");

        // LOG OUTPUT (After Response)
        if (rawResponse) {
            const err = await insertOpenAIRequest(supabase, {
                type: "OUTPUT",
                json: rawResponse,
                _id_contact: summary._id_contact,
                _id_conversation: conversationId
            });
            if (err) {
                logStep("save_openai_output", "error", null, err);
            } else {
                logStep("save_openai_output", "success");
            }
        }

    } catch (error) {
        errors.push({ step: "ai_call_openai", error: `Error calling OpenAI API: ${(error as any).message || error}` });

        // Try to save error to OpenAI log table for debug
        try {
            await insertOpenAIRequest(supabase, {
                type: "ERROR",
                json: {
                    error: (error as any).message || String(error),
                    requestBody: (error as any).requestBody || null
                },
                _id_contact: summary._id_contact,
                _id_conversation: conversationId
            });
            logStep("save_openai_error", "success");
        } catch (logErr) {
            console.error("Failed to save OpenAI error log", logErr);
        }
        // Try to send error message to user (optional, might fail if tokens are wrong)
        try {
            await sendWhatsappMessage(
                state.conf.tokens.facebook || "",
                summary.facebook_phone_number_id,
                summary.contact_phone,
                "STATUS: OpenAI Assistant API error"
            );
        } catch (e) {
            errors.push({ step: "ai_send_error_message", error: `Error sending error message to user: ${(e as any).message || e}` });
        }

        // Do not throw error, return what we have to log
        return {
            aiResponse: null,
            aiResponseText: null,
            processData: processData,
            currentStep,
            messagesToSend: [],
            errors,
            requestBody: debugInfo?.requestBody || null, // Capturando o requestBody do debugInfo se disponível
            rawResponse: null,
            debugInfo: { error: error, requestBody: debugInfo?.requestBody } // Ensuring requestBody is in debugInfo
        };
    }

    // 3.5 Handle Tool Calls (RAG)
    // 3.5 Handle Tool Calls (Generic MCP / RAG)
    const rawAny = rawResponse as any;
    if (rawAny?.choices?.[0]?.message?.tool_calls) {
        const toolCalls = rawAny.choices[0].message.tool_calls;
        const mcpUrl = state.conf.mcpServerUrl;
        const finalMcpToken = mcpToken;

        for (const toolCall of toolCalls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
            const allowedTools = AgentConfig.mcp_allowed_tools || [];

            // Execute ONLY if tool is allowed and MCP is configured
            if (mcpUrl && allowedTools.includes(toolName)) {
                logStep("tool_call_detected", "success", {
                    tool: toolName,
                    server: mcpUrl,
                    args: toolArgs
                });

                try {
                    // MCP Protocol: JSON-RPC 2.0 Call
                    const rpcPayload = {
                        jsonrpc: "2.0",
                        method: "call",
                        id: `req-${Date.now()}`,
                        params: {
                            name: toolName,
                            arguments: toolArgs
                        }
                    };

                    const mcpRes = await fetch(mcpUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${finalMcpToken}`
                        },
                        body: JSON.stringify(rpcPayload)
                    });

                    if (!mcpRes.ok) throw new Error(`MCP Error ${mcpRes.status}: ${await mcpRes.text()}`);

                    const mcpData: any = await mcpRes.json();
                    if (mcpData.error) throw new Error(`MCP RPC Error: ${mcpData.error.message}`);

                    // Extract text content from MCP result
                    // MCP Spec: result: { content: [{ type: "text", text: "..." }] }
                    const contentItems = mcpData.result?.content || [];
                    const toolOutput = contentItems
                        .map((c: any) => c.text || JSON.stringify(c))
                        .join("\n") || JSON.stringify(mcpData.result);

                    // Append tool result as a system/user message to the conversation
                    if (summary.openai_apikey && openaiConversationId) {
                        await appendUserMessageToOpenAI(
                            summary.openai_apikey,
                            openaiConversationId,
                            `[SYSTEM: Tool '${toolName}' Result]\n${toolOutput}\n\n[INSTRUCTION: Use this result to continue answering.]`
                        );
                        logStep("mcp_tool_execution", "success", { tool: toolName, output_preview: toolOutput.substring(0, 100) });

                        // Recursive call to get the final answer
                        const retryResult = await callZaipLLM({
                            input: "Continue generating the response based on the tool result.",
                            conversation: openaiConversationId,
                            apiKey: summary.openai_apikey || "",
                            mcpToken: finalMcpToken,
                            model: summary.ai_gpt_model,
                            instructions: instructions,
                            systemMessage: system_prompt,
                            temperature: summary.openai_temperature
                        });

                        aiResponseText = retryResult.outputText || "";
                        rawResponse = retryResult.raw;
                        debugInfo = retryResult.debugInfo;

                        logStep("ai_api_request_retry", "success");
                    }
                } catch (err: any) {
                    logStep("mcp_tool_error", "error", { tool: toolName, error: err.message });
                    errors.push({ step: "mcp_tool_execution", tool: toolName, error: err.message });
                }
            } else {
                logStep("tool_call_ignored", "info", { tool: toolName, reason: "Not allowed or MCP not configured" });
            }
        }
    }

    // 4. Preparar Mensagens para Envio
    let messagesToSend: string[] = [];
    let aiResponseParsed: any = aiResponseText;

    if (aiResponseText) {
        try {
            const cleanText = aiResponseText.replace(/```json\n?|\n?```/g, "").trim();
            aiResponseParsed = JSON.parse(cleanText);

            if (aiResponseParsed.messages && Array.isArray(aiResponseParsed.messages)) {
                messagesToSend = aiResponseParsed.messages;
            } else if (typeof aiResponseParsed.message === "string") {
                messagesToSend = aiResponseParsed.message.split(/\n+/).filter((l: string) => l.trim() !== "");
            } else if (Array.isArray(aiResponseParsed.response)) {
                messagesToSend = aiResponseParsed.response;
            } else if (typeof aiResponseParsed.response === "string") {
                messagesToSend = aiResponseParsed.response.split(/\n+/).filter((l: string) => l.trim() !== "");
            } else if (typeof aiResponseParsed.text === "string") {
                // Support for direct 'text' field (common in some OpenAI responses)
                messagesToSend = aiResponseParsed.text.split(/\n+/).filter((l: string) => l.trim() !== "");
            }
        } catch {
            // If JSON parse fails, use raw text if not empty
            if (aiResponseText.trim()) {
                // Tenta dividir por quebra de linha para separar mensagens
                messagesToSend = aiResponseText.split(/\n+/).filter(line => line.trim() !== "");
            }
        }
    }

    // Validation: If we have a response but no messages to send, log a warning
    if (aiResponseText && messagesToSend.length === 0) {
        errors.push({
            step: "ai_parse_response",
            error: "Failed to extract messages from AI response",
            details: { aiResponseText, aiResponseParsed }
        });
    }

    // 5. Virtual Tool Execution & Flow Control
    const slots = aiResponseParsed.slots || {};
    const scriptNameLastUsed = aiResponseParsed.script_name_last_used || "Nenhuma";

    if (processData && processData.process_prompt) {
        const { required_slots } = parseStepSlots(processData.process_prompt);


        // Execute Virtual Tools
        await executeVirtualTools(supabase, slots, summary._id_contact, conversationId, logStep);

        // Check if all required slots are filled
        // CRITICAL FIX: Merge existing state (summary.state_process) with new slots to check completeness.
        // This prevents loops where the slot is already saved but the AI doesn't repeat it.
        const existingState = typeof summary.state_process === 'object' ? summary.state_process : {};
        const effectiveState = { ...existingState, ...slots };

        // Check: We MUST accept "indefinido" as a filled value.
        // If we reject it (&& val !== "indefinido"), the system thinks the slot is missing and STAYS on the current step.
        // This causes the Infinite Loop when skipping.
        const isSlotFilled = (val: any) => val !== null && val !== undefined && val !== "";
        const missingSlots = required_slots.filter(slot => !isSlotFilled(effectiveState[slot]));
        const hasMissingSlots = missingSlots.length > 0;

        let nextStep = currentStep;

        if (!hasMissingSlots && required_slots.length > 0) {
            nextStep = currentStep + 1;
            logStep("flow_control", "success", { decision: "next", reason: "All required slots filled" });
        } else if (required_slots.length === 0) {
            logStep("flow_control", "success", { decision: "stay", reason: "No required slots defined or empty" });
        } else {
            logStep("flow_control", "success", { decision: "stay", reason: "Missing required slots", missing: missingSlots });
        }

        const logContext = {
            accountId: "1",
            contactId: summary._id_contact,
            inboxId: "1",
            zaipId: "1"
        };

        // Special Logic for Pipeline Stages (Hardcoded transitions)
        // Special Logic for Pipeline Stages (Configurable in steps_config.ts)
        let newStage = "";
        if (nextStep > currentStep) {
            newStage = getPipelineStage(nextStep) || "";

            if (newStage) {
                await updatePipelineStage(supabase, conversationId, newStage);
            }

            // Agent Switching Logic based on Next Step
            // Single-tenant: sem troca de agente
        }

        // Update Conversation Step AND State
        // We do this if step changed OR if we have slots to save
        // Force save if we have scriptNameLastUsed to ensure it gets persisted
        if (nextStep !== currentStep || Object.keys(slots).length > 0 || scriptNameLastUsed) {
            const activeStage = newStage || summary.step_process;
            // Update DB with clean slots and explicit script name
            const updateError = await updateStepConversation(supabase, conversationId, nextStep, logContext, slots, activeStage, scriptNameLastUsed, {
                input: messageBody,
                output: aiResponseText,
                reason: aiResponseParsed.reason,
                idGroupMessage: state.data.messageId // passing the ID of the user message (input) if available, or undefined
            });

            if (updateError) {
                logStep("db_update_error", "error", {
                    error: updateError,
                    message: "Failed to update zaip_conversations",
                    conversationId,
                    scriptNameLastUsed
                });
            } else {
                logStep("db_update_success", "success", { conversationId, scriptNameLastUsed, nextStep });
            }

            if (nextStep !== currentStep) {
                logStep("flow_control", "success", { decision: "next_step", step: nextStep });
            }
            if (Object.keys(slots).length > 0 || scriptNameLastUsed) {
                logStep("virtual_tool", "success", { tool: "updateStepConversation", slots: slots, script_name_last_used: scriptNameLastUsed });
            }
        }
    }

    return {
        aiResponse: aiResponseParsed,
        aiResponseText: aiResponseText,
        processData,
        currentStep,
        messagesToSend,
        errors: errors.length > 0 ? errors : undefined,
        requestBody: debugInfo?.requestBody || null,
        rawResponse: rawResponse,
        debugInfo: {
            ...debugInfo,
            processDataPreview: processData ? {
                process_prompt: processData.process_prompt,
                step: processData.process_step_number
            } : "missing"
        },
        slots: slots,
        script_name_last_used: scriptNameLastUsed,
        reason: aiResponseParsed.reason
    };

    function parseStepSlots(markdown: string): { required_slots: string[], optional_slots: string[] } {
        const parseList = (text: string) => {
            // Try parsing as JSON array first
            try {
                const json = JSON.parse(text);
                if (Array.isArray(json)) return json;
            } catch {
                // Ignore error, fall back to list parsing
            }

            // Fallback: Split by newline or comma
            return text.split(/[\n,]/)
                .map(line => line.trim().replace(/^-\s*["']?|["']?$/g, '').replace(/[\[\]"]/g, '')) // Remove dash, quotes, brackets
                .filter(line => line.length > 0);
        };

        const requiredMatch = markdown.match(/required_slots:\s*([^\n]+|[\s\S]*?)(?=\n\s*#|\n\n|$)/);
        const optionalMatch = markdown.match(/optional_slots:\s*([^\n]+|[\s\S]*?)(?=\n\s*#|\n\n|$)/);

        return {
            required_slots: requiredMatch ? parseList(requiredMatch[1]) : [],
            optional_slots: optionalMatch ? parseList(optionalMatch[1]) : []
        };
    }

    async function executeVirtualTools(
        supabase: any,
        slots: any,
        contactId: string,
        conversationId: string,
        logStep: any
    ) {
        if (!slots) return;

        // Contact Name
        if (slots.contact_name && slots.contact_name !== "indefinido") {
            await updateContactName(supabase, contactId, slots.contact_name);
            logStep("virtual_tool", "success", { tool: "updateContactName", value: slots.contact_name });
        }

        // Company Name & Area
        if ((slots.company_name && slots.company_name !== "indefinido") || (slots.company_area && slots.company_area !== "indefinido")) {
            await updateCompanyNameAndArea(supabase, contactId, slots.company_name, slots.company_area);
            logStep("virtual_tool", "success", { tool: "updateCompanyNameAndArea", values: { company_name: slots.company_name, company_area: slots.company_area } });
        }


    }

}
