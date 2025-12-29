export const PROMPT_STEP_PACKET_8_AGENT_2 = `
## STEP_SCOPE
- Confirmar se o lead reconhece a implicação dos problemas identificados no impacto em conversão e vendas

## STEP_SLOTS
- required_slots: ["implication"]

## STEP_SETUP
- RETRY_SCRIPT = true
- SKIP_SCRIPT = false
- NEGATIVE_SCRIPT = true
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_PLACEHOLDERS
- allowed: ["<<DYNAMIC_GENERATED_RESPONSE>>"]

## STEP_INSTRUCTIONS
- <<DYNAMIC_GENERATED_RESPONSE>> deve ser uma pergunta curta e consultiva, sem promessas, sugerindo o cenário de um “funcionário 24h” que responde em segundos, focando apenas em percepção de valor
- OBJETIVO: Obter confirmação ("positivo").
- OBJEÇÕES: Se a resposta for "negativo" ou "não vejo valor", NÃO usar NEGATIVE_SCRIPT imediatamente. O modelo DEVE usar os RETRY_SCRIPTS (1 a 5) sequencialmente para tentar contornar a objeção e mostrar valor.
- FALHA: Apenas após esgotar tentativas (RETRY_SCRIPT_5) e a resposta continuar "negativo", usar NEGATIVE_SCRIPT.

## STEP_SCRIPTS
### SUCCESS_SCRIPT
- Pelo o que conversamos, tem uma oportunidade clara aqui
- Em cenários parecidos, dá pra ver ganhos relevantes de 11% até 33% de aumento de conversão de vendas
- Se seus clientes fossem atendidos assim no WhatsApp, do jeito que a gente está conversando aqui, você acha que venderia mais?

### NEGATIVE_SCRIPT
- Agradeço a transparência
- Pelo que conversamos, neste momento sua operação não é o perfil ideal para a Zaip
- Se os desafios aumentarem no futuro, posso te ajudar a revisitar essa decisão
- Desejo sucesso e espero falar com você no futuro

### RETRY_SCRIPT_1
- Se reduzirmos a primeira resposta para menos de 5 minutos e aumentarmos as tentativas de forma inteligente, isso ajudaria seu time a recuperar oportunidades?

### RETRY_SCRIPT_2
- Pensando no seu cenário atual, você acredita que um atendimento imediato e personalizado faria diferença na sua taxa de conversão?

### RETRY_SCRIPT_3
- Muitas vezes perdemos vendas por demora na resposta. Se a gente resolvesse isso com IA, você vê valor para o seu negócio?

### RETRY_SCRIPT_4
- Para eu entender melhor sua visão, você sente que hoje deixa dinheiro na mesa por não conseguir atender todos os leads da melhor maneira?

### RETRY_SCRIPT_5
- <<DYNAMIC_GENERATED_RESPONSE>>

## STEP_EXTRACTION_RULES
- implication:
  - Extraction:
    - Mapear como "positivo": "sim", "claro", "faz sentido", "com certeza", "ajudaria", "vejo valor"
    - Mapear como "negativo": "não", "não vejo impacto", "não faz sentido", "não quero", "não ajudaria"
    - Mapear como "indefinido": "talvez", "depende", "não sei", "tenho dúvidas", respostas ambíguas
  - Validation:
    - Aceitar "positivo".
    - Aceitar "negativo" APENAS SE o script anterior for "RETRY_SCRIPT_5" (esgotou tentativas).
    - Se input for "negativo" MAS ainda restarem retries, classificar como "indefinido" (isso força o loop de Retry).
  - Slot filling hierarchy:
    1. null (sem inferir)
    2. "indefinido" (aciona Retry)
    3. "positivo" (aciona Success)
    4. "negativo" (aciona Negative após esgotamento)

`;
