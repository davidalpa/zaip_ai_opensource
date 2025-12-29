export const PROMPT_STEP_PACKET_7_AGENT_2 = `
## STEP_SCOPE
- Identificar a frequência de mensagens de acompanhamento (follow-up) realizadas após o primeiro contato no WhatsApp

## STEP_SLOTS
- required_slots: ["problem_followup"]

## STEP_SETUP
- RETRY_SCRIPT = false
- SKIP_SCRIPT = true
- NEGATIVE_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_PLACEHOLDERS
- allowed: ["<<FEEDBACK_FREQ>>", "<<info_1>>", "<<info_2>>", "<<final_question>>"]

## STEP_INSTRUCTIONS
- Preencher os placeholders exatamente com os textos definidos:
  - <<info_1>> = De acordo com pesquisa de mercado da Velocify, 81% da conversão ocorre até o terceiro contato
  - <<info_2>> = A nossa IA envia automaticamente mensagens proativas após 1, 3 e 5 dias considerando o contexto da conversa
  - <<final_question>> = Se uma IA conduzisse a negociação no WhatsApp e fechasse a venda no momento certo, enviando link de pagamento ou agendando uma reunião, isso ajudaria a resolver uma parte importante do seu problema hoje?
- Gerar <<FEEDBACK_FREQ>> de forma determinística usando problem_followup:
  - Se problem_followup for "1", "2" ou "1 vez": Pela frequência informada, há potencial de ganho aumentando as tentativas de contato
  - Se problem_followup for "3", "4+" ou "insistência": Boa cadência de reaproximação, isso tende a recuperar oportunidades
  - Se problem_followup == "indefinido" ou "0": Ajustar a cadência de reaproximação costuma recuperar oportunidades perdidas

- **CRITICAL**: RETRY IS DISABLED.
- If input contains frequency info -> EXTRACT.
- If input is vague/unknown ("não sei", "nunca parei pra pensar") -> DO NOT LEAVE NULL.
  - TRIGGER SKIP: Set 'problem_followup' = "indefinido".
  - This allows the flow to proceed to the SKIP_SCRIPT immediately.

## STEP_SCRIPTS
### SUCCESS_SCRIPT
- <<FEEDBACK_FREQ>>
- ${STORAGE_PUBLIC_URL}send/image/pesquisa_velocify_frequency.png
- <<info_1>>
- <<info_2>>
- <<final_question>>

### SKIP_SCRIPT
- Você vai entender a importância de saber sobre a frequência de mensagens de acompanhamento (follow-up)
- ${STORAGE_PUBLIC_URL}send/image/pesquisa_velocify_frequency.png
- <<info_1>>
- <<info_2>>
- <<final_question>>

## STEP_EXTRACTION_RULES
- problem_followup:
  - Extraction:
    - Mapear respostas numéricas e textuais:
      - "1", "uma vez", "1x" → "1"
      - "2", "duas vezes", "2x" → "2"
      - "3", "três vezes", "3x" → "3"
      - "4", "4x", "5x", "várias", "sempre", "insiste", "muitas vezes" → "4+"
      - "não sei", "depende", "não faço follow-up", silêncio após RETRY → "indefinido"
    - "uma vez" -> "1 vez"
    - "insisto até responder" -> "insistência"
    - "zero" -> "0"
  - Validation:
    - Aceitar apenas os valores finais: "1", "2", "3", "4+", "indefinido", "1 vez", "insistência", "0"
    - Se a resposta não permitir mapeamento direto, deixar null para acionar RETRY
  - Slot filling hierarchy:
    1. null (sem inferir; usado para permitir RETRY)
    2. "indefinido" (após falha nos RETRY ou desconhecimento explícito)
    3. valor final validado ("1" | "2" | "3" | "4+")

`;
