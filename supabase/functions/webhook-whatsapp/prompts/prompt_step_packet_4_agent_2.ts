import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_4_AGENT_2 = `
## STEP_SCOPE
- Avaliar atendimento atual.

## STEP_SLOTS
- required_slots: ["autoevaluation_problem"]

## STEP_SETUP
- SKIP_SCRIPT = true
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Sucesso):
  - ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_3.webp
  - Me conta mais detalhes de como funciona o seu atendimento pelo WhatsApp hoje?
  - Se preferir, pode mandar um áudio!

- SKIP_SCRIPT (Indefinido):
  - ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_3.webp
  - Me conta mais detalhes de como funciona o seu atendimento pelo WhatsApp hoje?
  - Se preferir, pode mandar um áudio!

- RETRY_SCRIPT (Faltam dados):
  - Para conseguirmos avançar, eu preciso entender um pouco sobre o seu cenário atual. Como você avalia o seu atendimento hoje?


## EXTRACTION_RULES
- **autoevaluation_problem**:
  - **Extraction**:
    - ACEITAR "Sim", "Claro", "Com certeza" -> Interpretar como avaliação POSITIVA ("Sim, conseguem atender").
    - ACEITAR "Não", "Acho que não", "Infelizmente não" -> Interpretar como avaliação NEGATIVA ("Não conseguem atender").
    - ACEITAR texto descritivo (ex: "demorado", "manual", "bom", "caótico").
  - **Validation**:
    - **CRÍTICO**: Se o usuário responder com uma pergunta desconexa (ex: "quanto custa?", "fale com humano") ou algo que não seja uma avaliação (nem Sim/Não) -> **NÃO** extraia. Deixe vazio para acionar o 'RETRY_SCRIPT'.
  - **Indefinido**: Se após o 'RETRY_SCRIPT' o usuário continuar sem responder -> Marque como "indefinido".
`;
