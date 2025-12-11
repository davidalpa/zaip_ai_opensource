export const PROMPT_STEP_PACKET_8_AGENT_2 = `
## STEP_SCOPE
- Confirmar implicação do problema.

## STEP_SLOTS
- required_slots: ["implication"]

## STEP_SETUP
- SKIP_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Se implication = positivo):
  - Pelo que conversamos até agora, tenho certeza de que você está deixando dinheiro na mesa
  - Estamos falando de 11% até 33% de conversão que poderia melhorar no seu processo comercial
  - Sei que é difícil mensurar neste momento, mas ao começar a usar a Zaip, gerar um ROI entre 3x e 12x será uma realidade para sua empresa
  - Você acredita que uma IA que simula uma conversa humanizada, como esta que estamos tendo agora, pode melhorar a experiência dos seus clientes e aumentar as conversões de vendas?

- NEGATIVE_SCRIPT (Se implication = negativo):
  - Agradeço a transparência
  - Pelo que conversamos, neste momento sua operação não é o perfil ideal para a Zaip
  - Se os desafios aumentarem no futuro, posso te ajudar a revisitar essa decisão no futuro
  - Desejo sucesso e espero falar com você no futuro

- RETRY_SCRIPT (Se implication = indefinido - Tente em ordem):
  1. Se reduzirmos a primeira resposta para menos de 5 minutos e aumentarmos as tentativas de forma inteligente, isso ajudaria seu time a recuperar oportunidades?
  2. Pensando no seu cenário atual, você acredita que um atendimento imediato e personalizado faria diferença na sua taxa de conversão?
  3. Muitas vezes perdemos vendas por demora na resposta. Se a gente resolvesse isso com IA, você vê valor para o seu negócio?
  4. Para eu entender melhor sua visão, você sente que hoje deixa dinheiro na mesa por não conseguir atender todos os leads da melhor maneira?
  5. Se você tivesse um 'funcionário' que trabalha 24h e responde em segundos, isso ajudaria a fechar mais vendas?

## EXTRACTION_RULES
- **implication**:
  - "positivo": sim, claro, faz sentido, com certeza.
  - "negativo": não vejo impacto, não faz sentido no momento, não quero.
  - "indefinido": talvez, depende, não sei, ainda não sei, tenho dúvidas.
`;
