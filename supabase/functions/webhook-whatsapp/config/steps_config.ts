// Map step -> process prompt (markdown)
// Map Step -> Prompt File
// Import Prompts
import { PROMPT_STEP_PACKET_1_AGENT_1 } from "../prompts/prompt_step_packet_1_agent_1.ts";
import { PROMPT_STEP_PACKET_2_AGENT_1 } from "../prompts/prompt_step_packet_2_agent_1.ts";
import { PROMPT_STEP_PACKET_3_AGENT_1 } from "../prompts/prompt_step_packet_3_agent_1.ts";
import { PROMPT_STEP_PACKET_4_AGENT_2 } from "../prompts/prompt_step_packet_4_agent_2.ts";
import { PROMPT_STEP_PACKET_5_AGENT_2 } from "../prompts/prompt_step_packet_5_agent_2.ts";
import { PROMPT_STEP_PACKET_6_AGENT_2 } from "../prompts/prompt_step_packet_6_agent_2.ts";
import { PROMPT_STEP_PACKET_7_AGENT_2 } from "../prompts/prompt_step_packet_7_agent_2.ts";
import { PROMPT_STEP_PACKET_8_AGENT_2 } from "../prompts/prompt_step_packet_8_agent_2.ts";
import { PROMPT_STEP_PACKET_9_AGENT_2 } from "../prompts/prompt_step_packet_9_agent_2.ts";
import { PROMPT_STEP_PACKET_10_AGENT_2 } from "../prompts/prompt_step_packet_10_agent_2.ts";
import { PROMPT_STEP_PACKET_11_AGENT_3 } from "../prompts/prompt_step_packet_11_agent_3.ts";
import { PROMPT_STEP_PACKET_12_AGENT_3 } from "../prompts/prompt_step_packet_12_agent_3.ts";
import { PROMPT_STEP_PACKET_13_AGENT_3 } from "../prompts/prompt_step_packet_13_agent_3.ts";
import { PROMPT_STEP_PACKET_14_AGENT_3 } from "../prompts/prompt_step_packet_14_agent_3.ts";
import { PROMPT_INSTRUCTIONS_AGENT_1 } from "../prompts/prompt_instructions_agent_1.ts";
import { PROMPT_INSTRUCTIONS_AGENT_2 } from "../prompts/prompt_instructions_agent_2.ts";
import { PROMPT_INSTRUCTIONS_AGENT_3 } from "../prompts/prompt_instructions_agent_3.ts";

export function getProcessPrompt(step: number): string | null {
  const promptMap: Record<number, string> = {
    1: PROMPT_STEP_PACKET_1_AGENT_1,
    2: PROMPT_STEP_PACKET_2_AGENT_1,
    3: PROMPT_STEP_PACKET_3_AGENT_1,
    4: PROMPT_STEP_PACKET_4_AGENT_2,
    5: PROMPT_STEP_PACKET_5_AGENT_2,
    6: PROMPT_STEP_PACKET_6_AGENT_2,
    7: PROMPT_STEP_PACKET_7_AGENT_2,
    8: PROMPT_STEP_PACKET_8_AGENT_2,
    9: PROMPT_STEP_PACKET_9_AGENT_2,
    10: PROMPT_STEP_PACKET_10_AGENT_2,
    11: PROMPT_STEP_PACKET_11_AGENT_3,
    12: PROMPT_STEP_PACKET_12_AGENT_3,
    13: PROMPT_STEP_PACKET_13_AGENT_3,
    14: PROMPT_STEP_PACKET_14_AGENT_3
  };

  return promptMap[step] || null;
}

export function getInstructionPrompt(step: number): string {
  if (step >= 11) {
    return PROMPT_INSTRUCTIONS_AGENT_3;
  } else if (step >= 4) {
    return PROMPT_INSTRUCTIONS_AGENT_2;
  } else {
    return PROMPT_INSTRUCTIONS_AGENT_1;
  }
}

// Map step -> funnel stage (Pipeline)
export function getPipelineStage(step: number): string | null {
  const map: Record<number, string> = {
    2: "2 - Em Pré-Qualificação",
    5: "3 - Pré-Qualificado",
    6: "4 - Em Qualificação",
    11: "5 - Qualificado",
    12: "6 - Orçamento Enviado",
    13: "7 - Proposta Enviada",
    14: "8 - Em Negociação"
  };
  return map[step] || null;
}
