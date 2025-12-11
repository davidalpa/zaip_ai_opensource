// prompts_rag.ts — Centralização de prompts e lógica para o RAG

export interface RagToolConfig {
    query_prefix: string; // Termos adicionados antes da query do usuário para melhorar o embedding
    result_instruction: string; // Instrução adicionada ao final do resultado para orientar o LLM
}

export const RAG_PROMPTS: Record<string, RagToolConfig> = {
    get_company_informations: {
        query_prefix: "empresa sobre nós história missão visão valores business",
        result_instruction: "IMPORTANTE: Use estas informações para responder dúvidas gerais sobre a empresa. Se não encontrar a resposta exata, diga que não consta na base."
    },
    get_link: {
        query_prefix: "link url site website endereço eletrônico",
        result_instruction: "ATENÇÃO: Extraia do contexto APENAS a URL solicitada. Se houver mais de uma, liste-as. Se não encontrar, diga que o link não está disponível."
    },
    get_product: {
        query_prefix: "produto serviço item catálogo especificações preço",
        result_instruction: "INSTRUÇÃO: Use os detalhes acima para descrever o produto ou serviço. Foque em benefícios e características."
    },
    get_price: {
        query_prefix: "preço valor custo investimento quanto custa tabela",
        result_instruction: "ATENÇÃO: Informe o preço ou faixa de valor com precisão. Se houver condições (ex: à vista), mencione-as."
    },
    get_pdf: {
        query_prefix: "pdf arquivo documento download apresentação brochura",
        result_instruction: "INSTRUÇÃO: Forneça o link direto para o arquivo PDF se disponível no contexto. Descreva brevemente o conteúdo do arquivo."
    },
    get_photo: {
        query_prefix: "foto imagem imagem ilustrativa visual",
        result_instruction: "INSTRUÇÃO: Se houver links de imagem no contexto, forneça-os diretamente. Descreva o que a imagem mostra."
    }
};
