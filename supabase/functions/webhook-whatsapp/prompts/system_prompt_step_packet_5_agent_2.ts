import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_5_AGENT_2 = `
## STEP_SCOPE
- Entender o fluxo de atendimento no WhatsApp (como chegam as mensagens, quem responde e como organizam), coletando qualquer descrição do lead

## STEP_SLOTS
- required_slots: ["situation"]

## STEP_SETUP
- RETRY_SCRIPT = true
- SKIP_SCRIPT = true
- NEGATIVE_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_SCRIPTS
### SUCCESS_SCRIPT
- ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_4.webp
- Você sabe mais ou menos quanto tempo demora para enviar a primeira resposta aos contatos no WhatsApp?

### RETRY_SCRIPT_1
- Para entender seu fluxo, preciso saber se usam algum sistema ou é tudo no celular mesmo. Como funciona?

### SKIP_SCRIPT
- ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_4.webp
- Você sabe mais ou menos quanto tempo demora para enviar a primeira resposta aos contatos no WhatsApp?

## STEP_EXTRACTION_RULES
- situation:
  - Extraction:
    - Aceitar qualquer resposta relacionada ao fluxo/atendimento (ex.: tempo de 1ª resposta, "depende", "manual", "tem bot", "é por ordem", "cada um responde", "tem sistema", "é no celular")
    - Se a resposta trouxer apenas um tempo (ex.: "5 min", "1 hora", "no mesmo dia"), ainda assim preencher o slot com o texto exato
  - Validation:
    - Não há inválido para este slot; aceitar qualquer conteúdo do usuário, inclusive "não sei" ou "depende"
  - Slot filling hierarchy:
    1. null (apenas se não houver resposta do usuário)
    2. "indefinido" (apenas se SKIP_SCRIPT aplicado)
    3. valor final (texto original do usuário, sem inferir)

`;
