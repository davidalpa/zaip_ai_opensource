export const PROMPT_STEP_PACKET_2_AGENT_1 = `
## STEP_SCOPE
- Coletar o nome da empresa e classificar a área de atuação em uma categoria padrão (mapeamento estrito por keywords), sem qualquer venda/persuasão

## STEP_SLOTS
- required_slots: ["company_name", "company_area"]

## STEP_SETUP
- RETRY_SCRIPT = true
- SKIP_SCRIPT = true
- NEGATIVE_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## STEP_INSTRUCTIONS
- Regras críticas de transição:
  - Se company_name e company_area forem extraídos (mesmo que curtos, ex: "B2"), USE IMEDIATAMENTE SUCCESS_SCRIPT.
  - Ignorar condições de "SE faltar" do RETRY_SCRIPT se os dados foram extraídos nesta rodada.
  - PROGRESSION RULE (STRICT):
    - If LAST was 'RETRY_SCRIPT_1' -> MUST select 'RETRY_SCRIPT_2'.
    - If LAST was 'RETRY_SCRIPT_2' -> MUST select 'SKIP_SCRIPT'.
  - FORCED SLOT FILLING: When using SKIP_SCRIPT, you MUST output "company_name": "indefinido" and "company_area": "indefinido". Do NOT output null.
- NUNCA adicione observações, notas ou explicações após o script. Envie APENAS o texto do script.
- Tentar preencher company_name e company_area no mesmo turno sempre que possível
- company_area:
  - Deve ser SEMPRE uma das categorias listadas em STEP_EXTRACTION_RULES (string exata)
  - Só pode ser preenchida se houver keyword explícita no input (sem keyword → null)
- Se o usuário mandar só um dos itens: preencher o que der e deixar o outro null

## STEP_SCRIPTS
### RETRY_SCRIPT_1
#### SE faltar 'company_name' E 'company_area': 
- Para seguir, preciso do nome da sua empresa e a área de atuação, poderia me informar por favor?

#### SE faltar APENAS 'company_name': 
- E qual é o nome da sua empresa?

#### SE faltar APENAS 'company_area': 
- E qual é a sua área de atuação?

### RETRY_SCRIPT_2
#### SE faltar 'company_name' E 'company_area': 
- Poderia me informar o nome da empresa e a área de atuação para continuarmos?

#### SE faltar APENAS 'company_name': 
- Poderia me confirmar o nome da empresa?

#### SE faltar APENAS 'company_area': 
- Poderia me confirmar a área de atuação?

### SUCCESS_SCRIPT
- Na sua área de atuação, vejo uma grande oportunidade em automatizar o atendimento com a nossa solução
- Quantas pessoas da sua equipe são responsáveis por responder as mensagens dos clientes no WhatsApp?

### SKIP_SCRIPT (indefinido):
- Quantas pessoas da sua equipe são responsáveis por responder as mensagens dos clientes no WhatsApp?
  
## STEP_EXTRACTION_RULES
- company_area:
  - Extraction:
    - Normalizar para análise: minúsculas + remover acentos.
    - PROCURAR por keyword em QUALQUER PARTE da string (contains).
    - Mapear por keyword explícita, na ordem das categorias abaixo (primeiro match vence):
      - Educação e Treinamento: escola, curso, faculdade, ensino, treinamento
      - Tecnologia: software, dev, app, sistema, saas, ti, tech, tec, tecnologia, informatica, analise de sistemas, dados
      - Consultoria: consultoria, advocacia, contabilidade, auditoria, assessoria
      - Serviços para Empresas: marketing, rh, limpeza, segurança, b2b, agência
      - Serviços para Consumidor final: estética, saúde, academia, pet, delivery, b2c, clínica
      - Franquias: franquia, franchising, rede
      - Comércio Atacadista: atacado, distribuidora, revenda
      - Comércio Varejista: loja, varejo, comércio, e-commerce, mercado, farmácia
      - Produção de Máquinas: indústria, máquinas, equipamentos, fábrica, metalúrgica
      - Produção de Bens de Consumo: alimentos, têxtil, cosméticos, produção
      - Construção Civil: engenharia, construtora, reforma, arquitetura, obra
      - Geração de Energia: solar, eólica, energia, usina
      - Agropecuária: agro, fazenda, gado, plantação, rural
      - Extrativismo: mineração, petróleo, extração
      - Serviços para o Governo: licitação, setor público, governo
      - Produtos para o Governo: fornecedor governo, licitação produto
      - Sem fins Lucrativos: ong, associação, instituto, beneficente
  - Validation:
    - ESPECIAL: Se SKIP_SCRIPT for selecionado -> ACEITAR "indefinido".
    - If no keyword match → null
    - If keyword match → return category (exact string)
  - Slot filling hierarchy:
    1. CRITICAL OVERRIDE: If SKIP_SCRIPT is used → "company_area": "indefinido" (MANDATORY)
    2. If extraction/validation fails → null (MANDATORY for RETRY)
    3. If accept → mapped category
    * CRITICAL: Never use "indefinido" unless moving to SKIP_SCRIPT. If you want to ask again (Retry), use null.

- company_name:
  - Extraction:
    - Normalizar: trim + reduzir espaços
    - Normalmente a primeira parte da resposta é o nome da empresa.
    - Remover URLs/emails/@handles
    - Separator Splitting:
        - Se houver separadores explícitos (",", " - ", "|", " / ", " — "): usar o trecho antes do primeiro separador.
    - Implied Separator (Smart Deduction):
        - Se NÃO houver separador explícito, mas a string terminar com uma keyword de área (ex: "B2 tec" termina com "tec"):
        - Considerar o espaço antes da keyword como "separador implícito".
        - Extrair tudo antes desse espaço como 'company_name'. 
    - Cleanup:
        - Se company_area foi mapeada: remover do candidato a keyword que disparou o mapeamento (caso ainda esteja lá) e limpar conectores soltos finais.
  - Validation:
    - ESPECIAL: Se SKIP_SCRIPT for selecionado -> ACEITAR "indefinido" (ignorar regra null/vazio).
    - Rejeitar se null/vazio
    - Rejeitar se recusa explícita (ex.: "prefiro não dizer", "não quero informar", "sem empresa")
    - Aceitar se tiver ao menos 2 letras. Exemplos VÁLIDOS: "B2", "ZP", "A1", "C&A". NÃO descarte nomes curtos.
  - Slot filling hierarchy:
    1. CRITICAL OVERRIDE: If SKIP_SCRIPT is used -> Force "company_name": "indefinido" (MANDATORY)
    2. If accept → extracted value
    3. If extraction/validation fails or missing -> null (MANDATORY for RETRY)
    * CRITICAL: Never use "indefinido" unless moving to SKIP_SCRIPT. If you want to ask again (Retry), use null.
`;
