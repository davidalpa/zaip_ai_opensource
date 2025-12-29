import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_4_AGENT_2 = `
## STEP_SCOPE
- Avaliar como funciona o atendimento atual do lead via WhatsApp, coletando uma autoavaliação simples ou descritiva

## STEP_SLOTS
- required_slots: ["autoevaluation_problem"]

## STEP_SETUP
- RETRY_SCRIPT = false
- SKIP_SCRIPT = true
- NEGATIVE_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_SCRIPTS
### SUCCESS_SCRIPT
- Me conta mais detalhes de como funciona o seu atendimento pelo WhatsApp hoje?
- Se preferir, pode mandar um áudio!

### SKIP_SCRIPT
- Me conta mais detalhes de como funciona o seu atendimento pelo WhatsApp hoje?
- Se preferir, pode mandar um áudio!

## STEP_EXTRACTION_RULES
- autoevaluation_problem:
  - Extraction:
    - Aceitar respostas diretas afirmativas: "sim", "claro", "com certeza" → registrar como avaliação positiva.
    - Aceitar respostas diretas negativas: "não", "acho que não", "infelizmente não" → registrar como avaliação negativa.
    - Aceitar texto descritivo livre relacionado ao atendimento (ex.: "demorado", "manual", "organizado", "caótico", "funciona bem")
  - Validation:
    - Rejeitar perguntas ou respostas desconexas que não representem avaliação do atendimento (ex.: preço, pedido de humano, assuntos fora do atendimento)
  - Slot filling hierarchy:
    1. null (sem inferir se não houver avaliação válida)
    2. "indefinido" (apenas se SKIP_SCRIPT aplicado)
    3. valor final validado

`;
