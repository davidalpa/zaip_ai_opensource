import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_10_AGENT_2 = `
## STEP_SCOPE
- Identificar volume mensal, sugerir produto e realizar pergunta de comprometimento.

## STEP_SLOTS
- required_slots: ["monthly_contacts", "product_name", "qualified_lead", "end_conversation"]

## STEP_SETUP
- SKIP_SCRIPT = false
- STOP_SCRIPT = true
- END_SCRIPT = true

## PRODUCT_INFO (INTERNAL)
- NANO:
  info_1: Com esse volume, o plano NANO costuma ser o mais adequado para começar com segurança
  image_product: ${STORAGE_PUBLIC_URL}send/image/plano_nano.png
  info_2: Ele cobre cerca de 150 atendimentos por mês, ideal para testar a IA em pequena escala
  info_3: Na prática, equivale a uma fração de uma pessoa dedicada só ao atendimento

- MICRO:
  info_1: Com esse volume, o plano MICRO geralmente encaixa melhor
  image_product: ${STORAGE_PUBLIC_URL}send/image/plano_micro.png
  info_2: Ele cobre em torno de 300 atendimentos por mês, mantendo qualidade nas respostas
  info_3: Em termos de capacidade, equivale a meia pessoa dedicada só ao atendimento

- BUSINESS:
  info_1: Com esse volume, o plano BUSINESS tende a ser o mais equilibrado
  image_product: ${STORAGE_PUBLIC_URL}send/image/plano_business.png
  info_2: Ele cobre cerca de 500 atendimentos por mês com boa previsibilidade
  info_3: Em capacidade, equivale a uma pessoa dedicada só ao atendimento

- PLUS:
  info_1: Com esse volume, o plano PLUS costuma trazer o melhor custo benefício
  image_product: ${STORAGE_PUBLIC_URL}send/image/plano_plus.png
  info_2: Ele cobre cerca de 1.000 atendimentos por mês em escala
  info_3: Em termos práticos, equivale a duas pessoas dedicadas só ao atendimento

- PRO:
  info_1: Com esse volume, o plano PRO é o mais indicado para manter escala com qualidade
  image_product: ${STORAGE_PUBLIC_URL}send/image/plano_pro.png
  info_2: Ele cobre cerca de 5.000 atendimentos por mês com alto nível de automação
  info_3: Em capacidade, equivale a cerca de 11 pessoas no atendimento

- ENTERPRISE:
  info_1: Com esse volume, o ideal é um plano ENTERPRISE desenhado sob medida
  image_product: ${STORAGE_PUBLIC_URL}send/image/plano_enterprise2.png
  info_2: Ele é pensado para operações acima de 10.000 atendimentos por mês
  info_3: Em capacidade, podemos trabalhar com múltiplos "times virtuais" de atendimento

## CLOSE_INFO
- **close_1**: E o melhor, a nossa IA entra em ação de forma eficiente desde o primeiro dia, enquanto um humano pode levar meses para se adaptar e atingir o mesmo nível de desempenho
- **close_2**: Se o produto fizer sentido para você e couber no seu orçamento, podemos começar nossa parceria hoje?

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Sucesso):
  - ${STORAGE_PUBLIC_URL}send/image/agente3.png
  - ${STORAGE_PUBLIC_URL}send/image/crm_print_cards.png
  - [info_1]
  - [image_product]
  - [info_2]
  - [info_3]
  - [close_1]
  - [close_2]
  - ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_5.webp

- RETRY_SCRIPT (Erro):
  - Para eu recomendar o produto certo, consegue me dizer um número aproximado de contatos por mês, mesmo que seja só um chute?

- STOP_SCRIPT (Ultimato - Use se Loop detectado):
  - Preciso saber pelo menos uma estimativa do volume mensal de atendimentos para sugerir o produto certo
  - Sem essa informação, não consigo continuar a conversa

- END_SCRIPT (Encerramento):
  - Estou encerrando esta conversa por falta de informações necessárias
  - Uma nova conversa pode ser iniciada após 7 dias
  - Desejo sucesso e espero falar com você em breve

## EXTRACTION_RULES
- **monthly_contacts**:
  - Inteiro > 0.
  - Se intervalo ("100 a 200"), usar MAIOR.
  - Se vago ("bastante"), RETRY.
- **product_name** (Automático pelo volume):
  - 1-80: NANO
  - 81-250: MICRO
  - 251-750: BUSINESS
  - 751-2000: PLUS
  - 2001-8000: PRO
  - >8000: ENTERPRISE

## COMPUTED_RULES
- 'end_conversation' (Computed Slot):
  - Logic (Map Script to Value):
    - IF 'SUCCESS_SCRIPT' -> "false"
    - IF 'END_SCRIPT' -> "true"
    - ELSE -> null

- 'qualified_lead' (Computed Slot):
  - Validation:
    - CHECK 'STATE_PROCESS' for: 'need_payoff', 'implication'
    - IF ANY of specific slots OR 'monthly_contacts' is "indefinido"/null/empty -> Set as NULL
      - (Note: Keeps flow in Failure Mode until data is complete)
    - IF 'end_conversation=true' -> "false"
    - IF ALL slots are valid AND 'end_conversation=false' -> "true"
    - ELSE -> null
`;
