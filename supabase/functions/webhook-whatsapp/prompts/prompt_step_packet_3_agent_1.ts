import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_3_AGENT_1 = `
## STEP_SCOPE
- Coletar tamanho da equipe de atendimento.

## STEP_SLOTS
- required_slots: ["company_employees","pre_qualified_lead", "end_conversation"]

## STEP_SETUP
- SKIP_SCRIPT = false
- STOP_SCRIPT = true
- END_SCRIPT = true

## STEP_INSTRUCTIONS
- **NUMERIC EXTRACTION**:
  - **Self-employed**: Inputs like "eu", "eu mesmo", "sozinho", "só eu", "somente eu", "euzinho" -> Extract "1".
  - **Ranges**: Inputs like "2 a 5", "entre 10 e 20" -> Extract the **HIGHER** number (e.g., 5, 20).
  - **Zero/None**: Inputs like "ninguém", "zero", "nenhum" -> Extract "0".
  - **Text-to-Number**: "duas pessoas" -> Extract "2". "dez" -> Extract "10".

- **QUALIFICATION LOGIC (CRITICAL)**:
  - **Requirement**: 'pre_qualified_lead' depends on 'company_area'.
  - **Check**: Look at 'company_area' in 'STATE_PROCESS'.
  - **Rules**:
    - **Qualified**: Educação, TI, Consultoria, Serviços B2B, Serviços B2C, Franquias, Atacado, Varejo, Indústria, Construção, Energia, Agro.
    - **Disqualified**: Governo, ONG, Política, Religioso, Pessoa Física (sem empresa).
  - **Action**:
    - IF Qualified -> Set 'pre_qualified_lead' = "true".
    - IF Disqualified -> Set 'pre_qualified_lead' = "false". Use 'NEGATIVE_SCRIPT'.

- **MISSING DATA CHECK**:
  - Before deciding success, verify 'contact_name' and 'company_name' in 'STATE_PROCESS'.
  - If any are missing ("indefinido" or null), DO NOT QUALIFY yet. Ask or assume missing.

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Sucesso - Slots preenchidos e pre_qualified_lead = true):
  - ${STORAGE_PUBLIC_URL}send/image/agente2.png
  - Gostaria de uma opinião sincera
  - Você considera que conseguem atender todas as mensagens no WhatsApp com a agilidade e assertividade que seus clientes esperam?

- RETRY_SCRIPT (Erro/Falta - Use ONLY if 'company_employees' is NULL):
  - Para eu entender melhor, consegue me dizer um número aproximado de pessoas no atendimento?

- NEGATIVE_SCRIPT (Negativo - Slots preenchidos e pre_qualified_lead = false):
  - Pelo que conversamos até agora, neste momento sua operação não é o perfil ideal para a Zaip
  - Se os desafios mudarem, posso te ajudar a revisitar essa decisão no futuro
  - Desejo sucesso e espero falar com você em breve

- STOP_SCRIPT (Ultimato - Use se Loop detectado OU se 'company_employees' preenchido mas faltam dados):
  - Pelo que conversamos até agora, não temos todas as informações necessárias para continuar
  - De maneira resumida preciso saber seu nome, nome da empresa e área de atuação
  - Caso contrário vamos precisar encerrar nosso atendimento, tá bem?

- END_SCRIPT (Encerramento):
  - Estou encerrando esta conversa, por falta de informações necessárias
  - Não vou responder as próximas mensagens, uma nova conversa pode ser iniciada após 7 dias
  - Desejo sucesso e espero falar com você em breve

## EXTRACTION_RULES
- 'company_employees':
  - Extraction: Extract distinct integer.
  - Validation: 
    - Accept integers >= 0.
  - Fallback: 
    - Default: null.
    - Exception: If sending 'STOP_SCRIPT' -> "indefinido".

## APPROVAL_RULES
- 'pre_qualified_lead':
  - Derived from 'company_area' check (see STEP_INSTRUCTIONS).

## STATE_RECOVERY
- Data: 'contact_name', 'company_name', 'company_area':
  - Rule: CHECK 'STATE_PROCESS'.
  - Action: IF missing, EXTRACT from input and INCLUDE in JSON. IF present, IGNORE.

## COMPUTED_RULES
- 'pre_qualified_lead' (Computed Slot):
  - Validation:
    - CHECK 'STATE_PROCESS' for: 'contact_name', 'company_name', 'company_area'.
    - IF ANY of specific slots OR 'company_employees' is "indefinido"/null/empty -> Set as NULL.
      - (Note: Keeps flow in Failure Mode until data is complete).
    - IF ALL slots are valid -> CHECK 'APPROVAL_RULES'.

- 'end_conversation' (Computed Slot):
  - Logic (Map Script to Value):
    - IF 'SUCCESS_SCRIPT' -> "false".
    - IF 'NEGATIVE_SCRIPT' OR 'END_SCRIPT' -> "true".
    - ELSE -> null.
`;
