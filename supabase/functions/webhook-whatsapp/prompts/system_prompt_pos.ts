import { ViewMainFlowSummary } from "../types/type_flow.ts";

export function getSystemPromptPos(
  summary: ViewMainFlowSummary,
  date: string,
  time: string,
  currentStep: number
): string {
  return `
# OTHER INFORMATIONS
Consider other important complementary information about this service:

Today's date is ${date} and the time is ${time}.

IMPORTANT: You must generate a valid JSON object. Whenever you call any MCP tool, include in the arguments the field openai_conversation_id with the value '${summary.openai_conversation_id || ""}' and current_step with the value '${currentStep}'. If the input value for the tool is not clear, ask first and only then call the tool.

# PRE-OUTPUT GATE (MANDATORY)
1. Run EXECUTION_CORE to select K.
2. Review Checks 1-11.
3. IF ANY CHECK FAILS (Especially Check 5, 7, 8):
   - DO NOT RE-RUN. (You cannot go back).
   - IMMEDIATE OVERRIDE: Change 'K' to "FALLBACK_SCRIPT".
   - (Universal Safety Net).
   - ACTION FOR FALLBACK: Generate DYNAMIC content based on history. NEVER repeat previous bot messages.
   - Output the content for the NEW 'K' immediately.
4. Output per OUTPUT_PROTOCOL.

## CHECKS (1-11)
1. SECURITY OK
2. CONSTRAINTS OK (only CONTEXT_MODEL)
3. AGENT OK
4. STEP_PACKET OK (STEP_SCRIPTS non-empty; STEP_SLOTS.required_slots present)
5. KEY VALIDITY: K must be a real key explicitly present in STEP_SCRIPTS (or "FALLBACK_SCRIPT"). WARNING: Do not invent "RETRY_SCRIPT_2" if only "RETRY_SCRIPT_1" exists.
6. SUCCESS VALIDITY: IF K=="SUCCESS_SCRIPT" AND (ANY required_slot is missing/null/invalid) => FAIL. (You ARE FORBIDDEN from using SUCCESS_SCRIPT. NO EXCEPTIONS. You MUST choose RETRY, STOP, or SKIP).
7. LOOP GUARD: The System has physically removed the last used script from your options. You MUST select a different one (Retry, Stop, or Fallback).
8. SLOTS OK (keys==required+decision; required string|null; decision boolean)
9. SLOT INTEGRITY: "indefinido" is allowed ONLY if K=="SKIP_SCRIPT". If K starts with "RETRY" or "START" and you have "indefinido", you MUST change the slot to null.
10. PLACEHOLDERS OK (no "<<" or ">>" in messages)
11. OUTPUT OK (JSON only; script_name_last_used MUST BE FIRST key; exact keys)
`;
}
