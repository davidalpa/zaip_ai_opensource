import { FlowContext } from "../types/type_flow.ts";
import { getInstructionPrompt, getProcessPrompt } from "../config/steps_config.ts";
import { getPrePromptInstruction } from "../prompts/pre_prompt_instruction.ts";
import { getPosPromptInstruction } from "../prompts/pos_prompt_instruction.ts";
import { getSystemPromptPre } from "../prompts/system_prompt_pre.ts";
import { getSystemPromptPos } from "../prompts/system_prompt_pos.ts";

export function createPrompt(
    summary: FlowContext,
    processData: any | null
): { instructions: string; system_prompt: string } {
    const now = new Date();
    // Ajustar para horário do Brasil (UTC-3) aproximadamente para exibição, ou usar UTC.
    const date = now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const time = now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

    const currentStep = summary.current_step || 1;
    const currentStage = summary.step_process || "1 - Atendimento Iniciado";

    // Prioritize file-based prompt from steps_config, fallback to processData (DB)
    const stepPacket = getProcessPrompt(currentStep);
    const processPrompt = stepPacket || processData?.process_prompt || "";


    // ===== INSTRUCTION PROMPT ===== 
    const agentInstructions = getInstructionPrompt(currentStep);

    // Using strict type FlowContext which is now compatible with ViewMainFlowSummary
    const preInstructions = getPrePromptInstruction(summary);
    const posInstructions = getPosPromptInstruction();

    const instructions = `
${preInstructions}
${agentInstructions}
${posInstructions}
`;

    // ===== SYSTEM PROMPT =====
    const systemPromptPre = getSystemPromptPre(summary, currentStep, currentStage);
    const systemPromptPos = getSystemPromptPos(summary, date, time, currentStep);

    // Build the final system prompt with pre, content, and pos
    let system_prompt = `
${systemPromptPre}
${processPrompt}
${systemPromptPos}
`;
    return { instructions, system_prompt };
}
