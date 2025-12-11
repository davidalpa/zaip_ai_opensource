export const PROMPT_STEP_PACKET_2_AGENT_1 = `
## STEP_SCOPE
- Collect Company Name and Business Area.

## STEP_SLOTS
- required_slots: ["company_name", "company_area"]

## STEP_SETUP
- SKIP_SCRIPT = true
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_INSTRUCTIONS
- **RULE: NAME + AREA (Compound Input)**:
  - Check if the user sent the Name and Area together (e.g., "B4B Consultoria").
  - **HOW TO DETECT**: If the message ends with a known sector (Consultoria, Tecnologia, Serviços B2B, Serviços B2C, etc), assume the first part is the **Name**.
  - **ACTION**: Split and extract BOTH.
  - **Examples**:
    - "B4B Consultoria" -> Name="B4B", Area="Consultoria"
    - "Apple Tech" -> Name="Apple", Area="Tecnologia"
    - "Padaria do João" -> Name="Padaria do João", Area="Serviços B2C"

- **RULE: MISSING AREA**:
  - If we already have the Name (from previous messages) and the user sends just one word (e.g., "Vendas"), assume it is the **Area**.

- **RULE: ONE-SHOT**:
  - Always try to fill both slots from the start. Do not ask for the Area if you can deduce it from the Name.

- **AREA VALIDATION**:
  - Be permissive. If it looks like a business area (Consultoria, Tecnologia, Serviços B2B, Serviços B2C, etc.), ACCEPT IT.
  - Do NOT restrict to a fixed list. The list below is just for category reference.

## STEP_SCRIPTS
- **TRANSITION RULES (CRITICAL)**:
  - NEVER use 'SUCCESS_SCRIPT' if 'company_name' or 'company_area' are 'null' or "indefinido".
  - If any required slot is missing, you MUST use 'RETRY_SCRIPT'.
  - Do not assume the user provided the name if you cannot explicitly extract it.

- SUCCESS_SCRIPT (Success):
  - Na sua área de atuação, vejo uma grande oportunidade em automatizar o atendimento com a nossa solução
  - Quantas pessoas da sua equipe são responsáveis por responder as mensagens dos clientes no WhatsApp?

- RETRY_SCRIPT (Missing Data):
**SE faltar 'company_name' E 'company_area':** 
  - "Para seguir, preciso do nome da sua empresa e a área de atuação, poderia me informar por favor?"
**SE faltar APENAS 'company_name':** 
  - "Obrigado! E qual é o nome da sua empresa?"
**SE faltar APENAS 'company_area':**
  - "Entendi, e qual é a sua área de atuação?"

- SKIP_SCRIPT (Undefined):
  - Quantas pessoas da sua equipe são responsáveis por responder as mensagens dos clientes no WhatsApp?
  
## EXTRACTION_RULES
- **company_name**:
  - **Extraction**:
    - If input has multiple words and one is a known Area (e.g. "Consultoria"), extract the OTHER part as Name.
  - **Validation (Examples)**:
    - **INVALID / IGNORE**:
      - "Oi", "Olá", "Bom dia" (Greeting) -> Invalid input for name.
      - "Sim", "Claro", "Ok" (Affirmation) -> Invalid input for name.
      - "Não", "Não tenho", "Prefiro não dizer" (Refusal) -> Invalid input for name.
      - "Quanto custa?", "Como funciona?" (Question) -> Invalid input for name.
    - **VALID / ACCEPT**:
      - "Zaip", "B2", "D4D", "Padaria do João" -> ACCEPT.
      - "ABC Ltda", "Tech Solutions" -> ACCEPT.
      - "Apenas eu" -> REJECT (Not a company name).
  - **SLOT_FILLING_HIERARCHY**:
    1. **SKIP OVERRIDE (High Priority)**: IF you decide to use 'SKIP_SCRIPT', you **MUST** set '"company_name": "indefinido"'. This overrides any Validation rejection.
    2. **Extraction Failure**: IF input is REJECTED or Not Found (and NOT Skipping) -> Value is null.
    3. **Success**: IF accepted -> Value is extracted text.

- **company_area**:
  - **Extraction**: 
    - Extract key terms: Educação, Tecnologia, Consultoria, Serviços B2B, Serviços B2C, Franquias, Atacado, Varejo, Indústria, Construção, Energia, Agro, Governo, ONG.
    - If user types just "Consultoria", extract "Consultoria".
  - **Inference**: IF 'company_name' contains an area term, USE it as 'company_area' (Mapping to the closest Standard Sector).
    - **Examples**:
      - "Sushi do Zé" -> Area="Serviços B2C"
      - "Silva Advocacia" -> Area="Consultoria"
      - "Clínica Sorriso" -> Area="Serviços B2C"
      - "Auto Center ABC" -> Area="Serviços B2C"
      - "Tech Solutions" -> Area="Tecnologia"
      - "Padaria Sonho" -> Area="Varejo"
      - "Construtora X" -> Area="Construção"
      - "Fazenda Y" -> Area="Agro"
  - **Validation**:
    - ACCEPT any term that denotes a business sector.
  - **SLOT_FILLING_HIERARCHY**:
    1. **SKIP OVERRIDE (High Priority)**: IF you decide to use 'SKIP_SCRIPT', you **MUST** set '"company_area": "indefinido"'. This overrides any Validation rejection.
    2. **Extraction Failure**: IF input is REJECTED or Not Found (and NOT Skipping) -> Value is null.
    3. **Success**: IF accepted -> Value is extracted text.

## STATE_RECOVERY
- Data: 'company_name', 'company_area':
  - Rule: CHECK 'STATE_PROCESS'.
  - Action: IF missing, EXTRACT from input. IF present in 'STATE_PROCESS' (and valid), USE existing value and DO NOT ask again.
`;
