export const PROMPT_STEP_PACKET_6_AGENT_2 = `
## STEP_SCOPE
- Identificar tempo médio de primeira resposta (SLA).

## STEP_SLOTS
- required_slots: ["problem_sla_min"]

## STEP_SETUP
- SKIP_SCRIPT = true
- STOP_SCRIPT = false
- END_SCRIPT = false

## FEEDBACK_SLA (Feedback Dinâmico)
- Se tempo <= 5 min: "Excelente tempo de primeira resposta, isso ajuda bastante na qualificação"
- Se tempo 6-59 min: "O tempo de primeira resposta está em um nível razoável, mas ainda há espaço para otimizar"
- Se tempo >= 60 min: "Pelo tempo de primeira resposta informado, vejo um potencial grande de melhoria"
- Se indefinido: "Otimizar o tempo de primeira resposta costuma impactar bastante a qualificação"

## INFORMATIONS
- **info_1**: Segundo pesquisa do MIT, as chances de qualificar um lead aumentam em até 21 vezes se o contato for feito nos primeiros 5 minutos
- **info_2**: Além disso, uma pesquisa de Harvard mostra que responder dentro da primeira hora gera 7 vezes mais chances de qualificação
- **info_3**: Com a nossa solução, a IA responde, em média, em apenas 30 segundos 
- **final_question**: Você sabe mais ou menos com qual frequência é enviado mensagens de acompanhamento proativas para recuperar a conversa com o cliente?

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Sucesso):
  - [FEEDBACK_SLA]
  - [info_1]
  - [info_2]
  - [info_3]
  - [final_question]

- SKIP_SCRIPT (Indefinido):
  - Você sabe mais ou menos com qual frequência é enviado mensagens de acompanhamento proativas para recuperar a conversa com o cliente?

- RETRY_SCRIPT (Erro):
  - Podemos estimar que leva mais de 1 hora?

## EXTRACTION_RULES
- **problem_sla_min**:
  - Extraia o valor numérico em **MINUTOS** (inteiro arredondado).
  - Exemplos: "1 hora" -> 60, "meia hora" -> 30, "10 min" -> 10, "imediato" -> 1.
  - **indefinido**: Se o usuário não souber, não quiser responder ou se o RETRY falhar, marque como "indefinido". NÃO bloqueie o fluxo.
`;
