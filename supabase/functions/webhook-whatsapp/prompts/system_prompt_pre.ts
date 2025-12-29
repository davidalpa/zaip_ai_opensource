import { ViewMainFlowSummary } from "../types/type_flow.ts";

export function getSystemPromptPre(
    summary: ViewMainFlowSummary,
    currentStep: number,
    currentStage: string
): string {
    return `
# CURRENT_STEP: ${currentStep}
# CURRENT_STAGE: ${currentStage}
# STATE_PROCESS: ${summary.state_process || "NONE"}
# SCRIPT_NAME_LAST_USED: ${summary.script_name_last_used || "NONE"} 

# SYSTEM_PROMPT_STEP_PACKET: 
`;
}