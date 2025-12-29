# Technical Prompt Structure

## 1. INSTRUCTIONS (The "Constitution")

The instructions are now composed of three modular blocks stitched together: **PRE + AGENT + POS**.

### A. PRE_PROMPT_INSTRUCTION (Context & Security)
Defined in `prompts/pre_prompt_instruction.ts`. Sets the foundation.
1.  **PRIORITY_ORDER**: Hierarchy of rules (Security > Protocols > Execution Core).
2.  **SECURITY_PROTOCOL**: Immutable identity and state protection rules.
3.  **MODEL_CONSTRAINTS**: Dictates reliance on `EXECUTION_CORE` and `CONTEXT_MODEL`.
4.  **CONTEXT_MODEL**: Defines the inputs (Step, Packet, State, Last Script).
5.  **AGENT_SETUP**: Injects dynamic variables (Company, Language, Phone).

### B. AGENT_INSTRUCTION (Identity)
Defined in `prompts/prompt_instructions_agent_X.ts`.
1.  **AGENT_IDENTITY**: Role, Goal, Tone.
2.  **AGENT_COMMERCIAL_LIMITATIONS**: Specific constraints (e.g., "Do not sell in this step").

### C. POS_PROMPT_INSTRUCTION (Logic Core)
Defined in `prompts/pos_prompt_instruction.ts`. The "brain" of the operation.
1.  **STEP_PACKET_AUTHORITY**: Defines the relationship between global logic and local packet.
2.  **EXECUTION_CORE (Deterministic State Machine)**:
    - **Sentinel**: Safety check for empty packets.
    - **1. Extraction & Validation**: Computes `slots_out` and `has_invalid_required`.
    - **2. Select Script K**: The Logic Decision Tree (Start -> End -> Success -> Priority Sequence).
    - **3. Post-Selection**: Handles `SKIP` magic values.
    - **4. Render Messages**: Formatting and sanitation.
3.  **OUTPUT_PROTOCOL**: Strict JSON definition.

---

## 2. SYSTEM PROMPT (The "Context")

The system prompt is the dynamic container for the step logic, wrapped by headers.

### A. SYSTEM_PRE
Defined in `prompts/system_prompt_pre.ts`.
- **METADATA HEADER**: `# CURRENT_STEP`, `# CURRENT_STAGE`, `# STATE_PROCESS`.

### B. STEP_PACKET (The "Local Law")
Dynamically injected from `prompts/system_prompt_step_packet_X_agent_Y.ts`.
1.  **STEP_SCOPE**: Single objective.
2.  **STEP_SLOTS**: `required_slots` definition.
3.  **STEP_SETUP**: Flags (`RETRY_SCRIPT`, `SKIP_SCRIPT` boolean toggles).
4.  **STEP_SCRIPTS**: The actual text content (Start, Retry, Success, Skip).
5.  **STEP_EXTRACTION_RULES**: Specific logic to process user input into slots.
6.  **STEP_PLACEHOLDERS**: Allowed dynamic tags.

### C. SYSTEM_POS
Defined in `prompts/system_prompt_pos.ts`.
- **OTHER INFORMATIONS**: Date/Time.
- **PRE-OUTPUT GATE**: A final checklist (Checks 1-11) forcing the model to verify its decision (Loop Guard, Key Validity, Slot Integrity) before outputting JSON.

---

## 3. Execution Mechanics

The model receives:
1.  `instructions`: PRE + AGENT + POS
2.  `system_prompt`: SYSTEM_PRE + STEP_PACKET + SYSTEM_POS
3.  `messages`: Conversation history

### The Decision Process:
1.  **Context**: Model reads `PRE` to understand "Who I am" and "What implies what".
2.  **Packet**: Model reads `STEP_PACKET` (middle of system) to know available Scripts and Slots.
3.  **Core**: Model applies `EXECUTION_CORE` (from POS instructions):
    - Extracts data based on `STEP_EXTRACTION_RULES`.
    - Checks invalid slots.
    - Selects Script K based on Priority Sequence (Success VS Retry VS Skip).
4.  **Gate**: Model runs `PRE-OUTPUT GATE` (end of system) to double-check consistency.
5.  **Output**: Generates JSON.
