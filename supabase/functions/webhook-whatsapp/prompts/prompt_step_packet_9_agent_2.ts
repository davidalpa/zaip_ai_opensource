export const PROMPT_STEP_PACKET_9_AGENT_2 = `
## STEP_SCOPE
- Confirmação sobre a necessidade atual de solução.

## STEP_SLOTS
- required_slots: ["need_payoff"]

## STEP_SETUP
- SKIP_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Se need_payoff = positivo):
  - Que ótimo que você também acredita nisso, vai ser um prazer ser seu parceiro nessa jornada
  - Agora, para garantir que o plano ideal atenda às necessidades da sua empresa, preciso saber quantos contatos no whatsapp a empresa recebe por mês
  - Pode ser uma estimativa. Ta bem?

- NEGATIVE_SCRIPT (Se need_payoff = negativo):
  - Entendo, sem problemas
  - Como você não vê valor nessa solução agora, vou encerrar por aqui para não tomar mais seu tempo
  - Se mudar de ideia no futuro, estaremos à disposição
  - Um abraço e boas vendas!

- RETRY_SCRIPT (Se need_payoff = indefinido - Tente em ordem):
  1. Entendo que cada negócio tem seu tempo. Mas você não concorda que automatizar o atendimento agora te colocaria à frente da concorrência?
  2. Muitas empresas esperam o 'momento ideal' e acabam perdendo vendas diárias. Você acha que vale a pena correr esse risco?
  3. Se a gente conseguisse implementar isso sem atrapalhar sua rotina atual, você veria valor em começar agora?
  4. Para eu alinhar as expectativas, o que falta hoje para você sentir segurança em avançar com essa automação?
  5. Apenas para confirmar antes de encerrarmos, você realmente não vê benefício em ter uma IA atendendo seus clientes instantaneamente?

## EXTRACTION_RULES
- **need_payoff**:
  - "positivo": sim, claro, faz sentido, com certeza, concordo.
  - "negativo": não vejo impacto, não faz sentido no momento, não quero, discordo.
  - "indefinido": talvez, depende, não sei, ainda não sei, tenho dúvidas.
- **Fallback**: Se após os 5 retries o usuário continuar com resposta indefinida, marque 'need_payoff: "negativo"'.
`;
