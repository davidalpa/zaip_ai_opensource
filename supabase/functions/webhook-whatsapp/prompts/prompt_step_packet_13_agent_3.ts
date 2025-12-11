import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_13_AGENT_3 = `
## STEP_SCOPE
- Responder qualquer dúvida final e direcionar para o fechamento.

## STEP_SLOTS
- required_slots: ["negotiation_response"]

## STEP_SETUP
- SKIP_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Sucesso):
  - ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_8.webp
  - [RESPOSTA_PERSONALIZADA]

## STEP_INSTRUCTIONS
- **Uso da Tool**: Se o usuário fizer uma pergunta específica sobre a empresa, use 'get_company_informations' para responder com precisão.
- **Fluxo**:
  1. Responda a pergunta/comentário do usuário de forma concisa.
  2. Faça a chamada para ação (CTA) final. Exemplo: "Perfeito! Vamos garantir essa condição especial hoje mesmo?"
- **Extração**: Sempre marque 'negotiation_response' como "true", independente do conteúdo. O objetivo é não travar o fluxo.

## EXTRACTION_RULES
- **negotiation_response**:
  - Aceitar QUALQUER resposta (texto ou áudio).
  - Não existe inválido (Extremamente permissivo).
`;
