export const PROMPT_STEP_PACKET_7_AGENT_2 = `
## STEP_SCOPE
- Identificar frequência de follow-up.

## STEP_SLOTS
- required_slots: ["problem_followup"]

## STEP_SETUP
- SKIP_SCRIPT = true
- STOP_SCRIPT = false
- END_SCRIPT = false

## INFORMATIONS
- **info_1**: De acordo com pesquisa de mercado da Velocify, 81% da conversão ocorre até o terceiro contato
- **info_2**: A nossa IA envia automaticamente mensagens proativas após 1, 3 e 5 dias considerando o contexto da conversa
- **final_question**: Você acredita que melhorar tempo de resposta e frequência de contatos pode ajudar a aumentar as suas vendas?

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Sucesso):
  - [FEEDBACK_FREQ]
  - [info_1]
  - [info_2]
  - [final_question]

- SKIP_SCRIPT (Indefinido):
  - Você acredita que melhorar tempo de resposta e frequência de contatos pode ajudar a aumentar as suas vendas?

- RETRY_SCRIPT (Erro):
  - Diariamente ou com que frequência exatamente vocês mandam essas mensagens?

## EXTRACTION_RULES
- **problem_followup**:
  - "1": 1x, uma vez.
  - "2": 2x, duas vezes.
  - "3": 3x, três vezes.
  - "4+": 4x, 5x, várias, sempre.
  - "indefinido": Se falhar 2x ou não souber.
- **FEEDBACK_FREQ (Feedback Dinâmico)**:
  - baixo (1-2): "Pela frequência informada, há potencial de ganho aumentando as tentativas de contato"
  - bom (3+): "Boa cadência de reaproximação, isso tende a recuperar oportunidades"
  - indefinido: "Ajustar a cadência de reaproximação costuma recuperar oportunidades perdidas"
`;
