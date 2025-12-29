# Prompt Architecture Guide (TypeScript)

This guide describes the TypeScript-based prompt architecture, focused on type safety, modularity, dynamic variable injection, and centralized orchestration.

## 1. Architecture

- **Pre/Pos Instructions (`pre/pos_prompt_instruction.ts`)**: Global wrappers for the system prompt, enforcing security, context definitions (PRE), and execution logic/checklists (POS).
- **Base Instructions (`prompt_instructions_agent_*.ts`)**: Agent "Constitution". Defines identity, commercial limits, and tone.
- **Step Packet (`system_prompt_step_packet_*.ts`)**: Defines local scope, specific scripts, placeholders logic, and extraction/validation rules for the current step.
- **Orchestrator (`steps_config.ts`)**: Maps steps to files and determines which agent is active (`getInstructionPrompt`).
- **Generator (`create_prompt.ts`)**: Assembles the final prompt using modular functions (`getPrePromptInstruction`, `getPosPromptInstruction`, `getSystemPromptPre`, `getSystemPromptPos` etc.).

## 2. Principles

- **Single Source of Truth**: Configurations (URLs, Names) come from `agent_config.ts`, not hardcoded.
- **Structured Output**: Strict JSON with `messages`, `slots`, `script_name_last_used`, and `reason`.
- **Modular Assembly**: The system prompt is built by sandwiching the specific `STEP_PACKET` between a `PRE` (Context/Security) and `POS` (Execution Core/Checklist) block.
- **Strict Validation**: Extraction rules defined in the step packet have absolute precedence.

## 3. Decision Flow

1.  **Step Identification**: System identifies the `current_step`.
2.  **Packet & Agent Selection**: `steps_config.ts` loads the corresponding Step Packet and Agent Instructions.
3.  **Modular Composition**: `create_prompt.ts` calls:
    - `getPrePromptInstruction`: Sets up Security Protocols and Context Models.
    - `getInstructionPrompt`: Injects Agent Identity.
    - `getPosPromptInstruction`: Injects Execution Core and Output Protocols.
    - `getSystemPromptPre`/`getSystemPromptPos`: Wraps the `ProcessPrompt` (Step Packet).
4.  **Assembly**: Combines everything into `{ instructions, system_prompt }`.

## 4. File Reference

- `prompts/pre_prompt_instruction.ts`: Global PRE-instructions (Security, Context).
- `prompts/pos_prompt_instruction.ts`: Global POS-instructions (Execution Core, Output Protocol).
- `prompts/prompt_instructions_agent_X.ts`: Base agent identity/limits (export `PROMPT_INSTRUCTIONS_AGENT_X`).
- `prompts/system_prompt_step_packet_X_agent_Y.ts`: Step packet (export `PROMPT_STEP_PACKET_X_AGENT_Y`).
- `prompts/system_prompt_pre.ts` & `system_prompt_pos.ts`: System prompt wrappers.
- `config/steps_config.ts`: Routing table and agent switching logic.
- `message/create_prompt.ts`: The main factory function that stitches it all together.
