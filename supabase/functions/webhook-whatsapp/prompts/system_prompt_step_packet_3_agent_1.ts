import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_3_AGENT_1 = `
## STEP_SCOPE
- Coletar o tamanho da equipe de atendimento (quantas pessoas respondem mensagens no WhatsApp) e, quando possível, computar a qualificação do lead com base em company_area já presente no STATE_PROCESS

## STEP_SLOTS
- required_slots: ["company_employees"]
- decision_slots: ["pre_qualified_lead","end_conversation"]

## STEP_SETUP
- RETRY_SCRIPT = true
- SKIP_SCRIPT = false
- NEGATIVE_SCRIPT = false
- STOP_SCRIPT = true
- END_SCRIPT = true

## STEP_INSTRUCTIONS
- STRICT CONSTRAINT:
  - This step relies 100% on the GLOBAL EXECUTION CORE TRANSITION GUARD.
  - IF 'company_employees' is NULL/INVALID -> The Global Guard MUST trigger RETRY/STOP.
  - DO NOT override the Global Guard.

- NUMERIC EXTRACTION (company_employees):
  - **PRIORITY**: If the input contains a number, EXTRACT IT.
  - Input Numérico Direto: "2", "3", "10" → extrair o número exato.
  - Contexto de texto: "somos em 2", "tem 2 pessoas", "apenas 2" → extrair 2.
  - Autônomo/sozinho: "eu", "eu mesmo", "sozinho", "só eu", "somente eu" → 1
  - Faixas: "2 a 5", "entre 10 e 20" → usar o MAIOR número (5, 20)
  - Zero/nenhum: "ninguém", "zero", "nenhum", "nao tem" → 0
  - Número por extenso (exemplos): "duas pessoas" → 2; "dez" → 10

## STEP_COMPUTED_RULES
- pre_qualified_lead:
  - Se contact_name/company_name/company_area/company_employees estiver null/"indefinido"/ausente → null
  - Caso contrário → aplicar STEP_APPROVAL_RULES
- end_conversation:
  - CRITICAL_CONSTRAINT: This output MUST be a JSON BOOLEAN (true or false). NEVER null.
  - LOGIC_MAPPING (Exact Match):
    - IF selected_script == "END_SCRIPT" -> true
    - IF selected_script == "STOP_SCRIPT" -> true
    - ALL OTHER SCRIPTS (SUCCESS_SCRIPT, RETRY_SCRIPT, FALLBACK_SCRIPT) -> false
  - DEFAULT_FALLBACK: false

## STEP_APPROVAL_RULES
- pre_qualified_lead:
  - CRITICAL_CONSTRAINT: Output MUST be a JSON BOOLEAN (true or false). NEVER null.
  - Requirement: 'pre_qualified_lead' depends on 'company_area'.
  - Rules:
    - DISQUALIFIED_AREAS: ["Serviços para o Governo", "Produtos para o Governo", "Sem fins Lucrativos"]
    - Logic:
      1. IF 'company_employees' is NULL -> Set NULL (Wait for data).
      2. IF 'company_area' matches DISQUALIFIED_AREAS -> Set "false".
      3. IF 'company_area' is VALID (and NOT disqualified) -> Set "true".
      3. IF 'company_area' is NULL -> Set "false" (Default).
  - RESULT: determines if SUCCESS_SCRIPT is allowed.

## STEP_STATE_RECOVERY
- Data: contact_name, company_name, company_area:
  - Rule: CHECK STATE_PROCESS
  - Action: IF missing, EXTRACT from input and INCLUDE in JSON. IF present, IGNORE (não sobrescrever)

## STEP_SCRIPTS
### RETRY_SCRIPT_1
- Poderia estimar um número de pessoas no atendimento?

### SUCCESS_SCRIPT
- ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_3.webp
- ${STORAGE_PUBLIC_URL}send/image/agente2.png
- Gostaria de uma opinião sincera
- Você considera que conseguem atender todas as mensagens no WhatsApp com a agilidade e assertividade que seus clientes esperam?

### STOP_SCRIPT
- Pelo que conversamos até agora, não temos todas as informações necessárias para continuar
- De maneira resumida preciso saber seu nome, nome da empresa, área de atuação e número de pessoas no atendimento
- Caso contrário vamos precisar encerrar nosso atendimento, tá bem?

### END_SCRIPT
- Estou encerrando esta conversa, por falta de informações necessárias
- Não vou responder as próximas mensagens, uma nova conversa pode ser iniciada após 7 dias
- Desejo sucesso e espero falar com você em breve

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
    - If no keyword match → null
    - If keyword match → return category (exact string)

- company_employees:
  - Extraction:
    - Extract distinct integer.
    - Se houver match de autônomo/sozinho (STEP_INSTRUCTIONS) → 1
    - Se houver match de zero/nenhum (STEP_INSTRUCTIONS) → 0
    - Se houver padrão de faixa (ex.: "X a Y", "entre X e Y") → usar o MAIOR
    - Se não houver dígitos, tentar mapear número por extenso.
  - Validation:
    - Accept integers >= 0.
    - Se input for "indefinido" ou null E script selecionado NÃO for STOP_SCRIPT → null.
  - Slot filling hierarchy:
    1. null (se extração falhar)
    2. inteiro validado
    * CRITICAL: NEVER use "indefinido" here (SKIP_SCRIPT is disabled). If missing, use null.


`;
