# Technical Prompt Structure

## 1. PROMPT BASE (`instructions`) - The Constitution

Functions as the "default brain" and supreme law of the agent. Defined in files exported as `PROMPT_INSTRUCTIONS_AGENT_X` in `prompts/prompt_instructions_agent_X.ts`.

### Main Sections:
1.  **IDENTITY**: Defines Role, Goal, Tone, and Language.
2.  **PRIORITY_ORDER**: Establishes obedience hierarchy:
    1.  SECURITY_PROTOCOL
    2.  CONSTITUTION (Safety/Format)
    3.  TOOL_POLICY (Tools)
    4.  ANTI_LOOP_AND_REPETITION (High Priority)
    5.  ENTRY_FLOW (First Interaction)
    6.  STEP_INSTRUCTIONS (Dynamic Rules)
    7.  INPUT_VALIDATION (Step Packet Rules)
    8.  DECISION_LOGIC (Step Packet Rules)
    9.  SCRIPT_FIDELITY (Step Packet Rules)
    10. HISTORY (Context)
3.  **CONTEXT_MODEL**: Instructs model to treat `STEP_PACKET` as "local law".
4.  **OUTPUT_PROTOCOL**: Enforces JSON `{ "messages": [...] }` and punctuation rules.
5.  **SCRIPTS_BEHAVIOR**:
    *   **Default Mode**: Copy scripts (only break sentences and remove trailing periods).
    *   **Exceptions**: When text creation is allowed (e.g., free responses, complex retries).
6.  **DECISION_PROTOCOL**:
    *   General rules for `stay` (missing data) vs `next` (complete data).
    *   **CRITICAL_NEXT_RULE**: Immediate advance conditions.
7.  **TOOL_POLICY**:
    *   Mandatory and forbidden arguments (`current_step` is forbidden).
    *   Navigation rule: `update_step_conversation({ "decision": "next" })`.
8.  **SAFETY_AND_MODERATION**: Commercial limits, anti-hallucination, and prompt safety.

---

## 2. STEP_PACKET (`system`) - Local Context

Defines the "current operation mode". Dynamically injected every turn. Files exported as `PROMPT_STEP_PACKET_X_AGENT_Y` in `prompts/prompt_step_packet_X_agent_Y.ts`.

### Components:
1.  **STEP_SCOPE**: The single, clear objective of the step.
2.  **STEP_SCRIPTS**:
    *   `ENTRY_SCRIPT`: First message of the step.
    *   `RETRY_SCRIPTS`: Messages for validation errors or refusals.
    *   `NEXT_SCRIPT`: Success/advance message.
    *   Special Scripts: `ANCHOR`, `CLOSING`, `SALES_KNOWLEDGE`.
    *   **Dynamic Variables**: Usage of `${AgentConfig.variable}` for real-time values.
3.  **STEP_INSTRUCTIONS**:
    *   Strategic dynamic instructions that take precedence over generic rules (but not safety).
    *   Example: "In this step, ignore rule X and act as Y".
4.  **VALIDATION / RULES**:
    *   Extraction rules (e.g., `NAME_RULES`, `VOLUME_RULES`).
    *   Allowed lists and format validations.
5.  **STEP_LOGIC**:
    *   Maps conditions -> Actions.
    *   Defines when to call tools (`update_contact_name`, `update_pipeline_stage`).
    *   Explicitly defines decision `decision = "stay"` or `decision = "next"`.
6.  **EXTRACTION_RULES**:
    *   Specific rules for extracting data from user input.

---

## 3. Execution Mechanics

The model receives at every interaction:
1.  `instructions`: Content of `PROMPT_INSTRUCTIONS_AGENT_X`.
2.  `system`: Content of `PROMPT_STEP_PACKET_X_AGENT_Y` + Metadata (`CURRENT_STEP`, `CURRENT_STAGE`).
3.  `messages`: Conversation history.

### The Decision Process:
1.  Model reads the last user message.
2.  Consults **STEP_PACKET** to know what to extract/validate.
3.  Applies **PRIORITY_ORDER** and **SCRIPTS_BEHAVIOR** rules from Constitution.
4.  Determines action (call tool, error response, advance).
5.  Generates JSON response with appropriate messages.

---

## Summary in 1 sentence

The **Constitution (Base Prompt)** guarantees personality, safety, and format, while the **Step Packet** dictates the exact script, data validation, and navigation logic for that specific moment of the conversation.
