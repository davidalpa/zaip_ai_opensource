import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_5_AGENT_2 = `
## STEP_SCOPE
- Entender fluxo de atendimento.

## STEP_SLOTS
- required_slots: ["situation"]

## STEP_SETUP
- SKIP_SCRIPT = true
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Sucesso):
  - ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_4.webp
  - Você sabe mais ou menos quanto tempo demora para enviar a primeira resposta aos contatos no WhatsApp?

- SKIP_SCRIPT (Indefinido):
  - ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_4.webp
  - Você sabe mais ou menos quanto tempo demora para enviar a primeira resposta aos contatos no WhatsApp?

## EXTRACTION_RULES
- **situation**:
  - Aceitar QUALQUER resposta (manual, humano, bot, depende).
  - Não existe inválido (Extremamente permissivo).
`;
