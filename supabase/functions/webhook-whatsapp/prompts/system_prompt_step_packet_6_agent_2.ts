export const PROMPT_STEP_PACKET_6_AGENT_2 = `
## STEP_SCOPE
- Identificar tempo médio de primeira resposta (SLA).

## STEP_SLOTS
- required_slots: ["problem_sla_min"]

## STEP_SETUP
- RETRY_SCRIPT = false
- SKIP_SCRIPT = true
- NEGATIVE_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_PLACEHOLDERS
- allowed: ["<<FEEDBACK_SLA>>", "<<info_1>>", "<<info_2>>", "<<info_3>>", "<<final_question>>"]

## STEP_INSTRUCTIONS
- **CRITICAL**: RETRY IS DISABLED.
- If input contains valid time/SLA -> EXTRACT.
- If input is vague/unknown ("não sei", "depende", "variável") -> DO NOT LEAVE NULL.
  - TRIGGER SKIP: Set 'problem_sla_min' = "indefinido".
  - This allows the flow to proceed to the SKIP_SCRIPT immediately.

- NUMERIC EXTRACTION (problem_sla_min):
  - "1 hora" -> 60
  - "30 min" -> 30
  - "um dia" -> 1440, "imediato" -> 1.
  - **indefinido**: Se o usuário não souber, não quiser responder ou se o RETRY falhar, marque como "indefinido". NÃO bloqueie o fluxo.
- Mapeie os placeholders (<<...>>) usando o conteúdo exato das seções FEEDBACK_SLA e INFORMATIONS.

## FEEDBACK_SLA (Feedback Dinâmico)
### Excelente
- **Se tempo <= 1 min:** "Excelente tempo de primeira resposta, isso ajuda bastante na qualificação"

### Razoável
- **Se tempo 2-59 min:** "O tempo de primeira resposta está em um nível razoável, mas ainda há espaço para otimizar"

### Melhoria
- **Se tempo >= 60 min (1 hora ou mais):** "Pelo tempo de primeira resposta informado, vejo um potencial grande de melhoria"

### Indefinido
- **Se indefinido:** "Otimizar o tempo de primeira resposta costuma impactar bastante a qualificação"

## INFORMATIONS
- **info_1**: Segundo pesquisa do MIT, as chances de qualificar um lead aumentam em até 21 vezes se o contato for feito nos primeiros 5 minutos
- **info_2**: Além disso, uma pesquisa de Velocify mostra que responder em até 1 minuto gera um aumento de 391% de conversão
- **info_3**: Com a nossa solução, a IA responde, em média, em apenas 30 segundos
- **final_question**: Você sabe mais ou menos com qual frequência é enviado mensagens de acompanhamento proativas para recuperar a conversa com o cliente?

## STEP_SCRIPTS
### SUCCESS_SCRIPT
- <<FEEDBACK_SLA>>
- ${STORAGE_PUBLIC_URL}send/image/pesquisa_velocify_leadtime.png
- <<info_1>>
- <<info_2>>
- <<info_3>>
- <<final_question>>

### SKIP_SCRIPT
- Vou te mostrar a importância de saber sobre qual é o tempo de resposta do contato (lead time)
- ${STORAGE_PUBLIC_URL}send/image/pesquisa_velocify_leadtime.png
- <<info_1>>
- <<info_2>>
- <<info_3>>
- <<final_question>>

## STEP_EXTRACTION_RULES
- **problem_sla_min**:
  - Extraia o valor numérico em **MINUTOS** (inteiro arredondado).
  - Exemplos: "1 hora" -> 60, "meia hora" -> 30, "10 min" -> 10, "imediato" -> 1.
  - **indefinido**: Se o usuário não souber, não quiser responder ou se o RETRY falhar, marque como "indefinido". NÃO bloqueie o fluxo.
`;
