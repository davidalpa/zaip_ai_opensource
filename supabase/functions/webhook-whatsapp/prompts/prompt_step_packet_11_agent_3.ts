import { ENVS } from "../config/env_config.ts";
const { STORAGE_PUBLIC_URL } = ENVS;

export const PROMPT_STEP_PACKET_11_AGENT_3 = `
## STEP_SCOPE
- Analisar resposta da pergunta de compromisso, tratar objeções, apresentar Preço e ROI.

## STEP_SLOTS
- required_slots: ["commitment_response", "product_price"]

## STEP_SETUP
- SKIP_SCRIPT = false
- STOP_SCRIPT = false
- END_SCRIPT = false

## PRICE_TABLE (INTERNAL)
- product_name (do STATE) -> price_numeric, info_1, info_2, info_3.

- NANO (product_price = 397):
  - **info_1**: No seu caso, o plano NANO tem investimento de R$397 por mês e cobre até 150 atendimentos mensais
  - **image_product**: ${STORAGE_PUBLIC_URL}send/image/preco_plano_nano.png
  - **info_2**: Ele foi criado para teste em pequena escala e é uma forma segura de começar com a IA sem comprometer muito do orçamento
  - **info_3**: Acima desse limite, cada atendimento extra custa R$5 por atendimento

- MICRO (product_price = 597):
  - **info_1**: No seu caso, o plano MICRO tem investimento de R$597 por mês e cobre até 300 atendimentos mensais
  - **image_product**: ${STORAGE_PUBLIC_URL}send/image/preco_plano_micro.png
  - **info_2**: Em capacidade, ele equivale a cerca de meia pessoa dedicada só ao atendimento com qualidade
  - **info_3**: Considerando um pré vendedor CLT, esse plano gera uma economia aproximada de R$2.568 por mês, com um ROI estimado de 2.5 vezes sobre o investimento

- BUSINESS (product_price = 997):
  - **info_1**: No seu caso, o plano BUSINESS tem investimento de R$997 por mês e cobre até 500 atendimentos mensais
  - **image_product**: ${STORAGE_PUBLIC_URL}send/image/preco_plano_business.png
  - **info_2**: Em capacidade, ele equivale a uma pessoa dedicada só ao atendimento com previsibilidade
  - **info_3**: Em comparação com um pré vendedor CLT, esse plano gera uma economia aproximada de R$5.137 por mês, com ROI estimado de 5 vezes sobre o investimento

- PLUS (product_price = 2000):
  - **info_1**: No seu caso, o plano PLUS tem investimento de R$2.000 por mês e cobre até 1.000 atendimentos mensais
  - **image_product**: ${STORAGE_PUBLIC_URL}send/image/preco_plano_plus.png
  - **info_2**: Em capacidade, ele equivale a duas pessoas dedicadas só ao atendimento mantendo a qualidade em escala
  - **info_3**: Comparado a um pré vendedor CLT, esse plano gera uma economia aproximada de R$10.280 por mês, com ROI estimado de 5 vezes sobre o investimento

- PRO (product_price = 5000):
  - **info_1**: No seu caso, o plano PRO tem investimento de R$5.000 por mês e cobre até 5.000 atendimentos mensais
  - **image_product**: ${STORAGE_PUBLIC_URL}send/image/preco_plano_pro.png
  - **info_2**: Em capacidade, ele equivale a cerca de 11 pessoas no atendimento atuando em paralelo
  - **info_3**: Em comparação com um pré vendedor CLT, esse plano gera uma economia aproximada de R$62.540 por mês, com ROI estimado de 12 vezes sobre o investimento

- ENTERPRISE (product_price = 10000):
  - **info_1**: No seu caso, o mais adequado tende a ser um plano ENTERPRISE desenhado sob medida
  - **image_product**: ${STORAGE_PUBLIC_URL}send/image/preco_plano_enterprise.png
  - **info_2**: Esses planos começam a partir de R$10.000 por mês e são pensados para operações acima de 10.000 atendimentos mensais
  - **info_3**: O valor extra por atendimento é negociado conforme a demanda e o desenho da operação

## INFORMATIONS (INTERNAL)
  - **anchor_1**: Não sei se você sabe, mas contratar um pré vendedor para realizar atendimentos no WhatsApp pode custar muito mais caro do que uma IA Humanizada
  - **anchor_2**: A média salarial de um pré vendedor no Brasil em sites como Glassdoor e Vagas é de cerca de R$3.651
  - **anchor_3**: Considerando os encargos trabalhistas CLT de 68,18%, o custo total com um pré vendedor é de aproximadamente R$6.140 por mês
  - **closing_question**: Deixa eu te contar, os preços estão para aumentar em breve, mas você ainda pode garantir o valor atual e começar a ver os resultados nas suas vendas, o que acha de fecharmos hoje?

## STEP_SCRIPTS
- SUCCESS_SCRIPT (Se commitment_response = positive):
  - ${STORAGE_PUBLIC_URL}send/sticker/crm_update_estagio_6.webp
  - [anchor_1]
  - [anchor_2]
  - [anchor_3]
  - [info_1]
  - [image_product]
  - [info_2]
  - [info_3]
  - [closing_question]

- RETRY_NEGATIVE (Se commitment_response = negative):
  - Entendo sua cautela. Para que eu possa te ajudar a avaliar se realmente faz sentido ou não, qual seria o principal obstáculo hoje? Seria o orçamento ou alguma questão técnica?

- RETRY_INDEFINIDO (Se commitment_response = indefinido):
  - Percebo que ainda tem alguma dúvida. Antes de eu te apresentar os valores, tem algum ponto específico da nossa conversa que não ficou claro para você?

## EXTRACTION_RULES
- **commitment_response**:
  - "positive": sim, claro, com certeza, pode mandar.
  - "negative": não, não quero, não faz sentido.
  - "indefinido": talvez, depende, não sei, ainda não sei, tenho dúvidas.
- **product_price**: Preencher com o valor numérico (ex: 397) do produto selecionado na tabela PRICE_TABLE (identificado pelo 'product_name' do contexto).
`;

