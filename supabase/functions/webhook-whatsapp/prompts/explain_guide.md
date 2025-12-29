# Prompt Architecture Guide (TypeScript)

This guide describes the TypeScript-based prompt architecture, focused on type safety, dynamic variable injection, and centralized orchestration.

## 1. Architecture

- **Base Instructions (`prompt_instructions_agent_*.ts`)**: Agent "Constitution". Defines identity, priorities, safety, and JSON format.
- **Step Packet (`prompt_step_packet_*.ts`)**: Defines local scope, specific scripts, and extraction/validation rules for the current step.
- **Orchestrator (`steps_config.ts`)**: Maps steps to files and determines which agent is active (`getInstructionPrompt`).
- **Generator (`create_prompt.ts`)**: Assembles the final prompt by injecting context variables (`AgentConfig`, `CompanyInfo`) and metadata.

## 2. Principles

- **Single Source of Truth**: Configurations (URLs, Names) come from `agent_config.ts`, not hardcoded.
- **Structured Output**: Strict JSON with `messages`, `slots`, `script_name_last_used`, and `reason`.
- **Anti-Loop**: Integrated repetition detection and rephrasing mechanisms.
- **Strict Validation**: Extraction rules defined in the step packet have absolute precedence.

## 3. Decision Flow

1.  **Step Identification**: System identifies the `current_step`.
2.  **Agent Selection**: `steps_config.ts` determines which Base Instruction to use (Agent 1, 2, or 3).
3.  **Packet Selection**: `steps_config.ts` loads the corresponding Step Packet.
4.  **Assembly**: `create_prompt.ts` combines Instruction + Packet + Variables + History.

## 4. File Reference

- `prompts/prompt_instructions_agent_X.ts`: Base instructions (export `PROMPT_INSTRUCTIONS_AGENT_X`).
- `prompts/prompt_step_packet_X_agent_Y.ts`: Step packet (export `PROMPT_STEP_PACKET_X_AGENT_Y`).
- `config/steps_config.ts`: Routing table and agent switching logic.
- `config/agent_config.ts`: Global variables (AI Name, Company, URLs).
