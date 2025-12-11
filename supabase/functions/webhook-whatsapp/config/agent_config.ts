export const AgentConfig = {
  // WhatsApp
  whatsapp_number: "552199998888", // TODO: Configure seu número ou use variável de ambiente

  // AI model
  ai_name: "David",
  ai_gpt_model: "gpt-5-mini",
  openai_temperature: 0.5,
  openai_reasoning_effort: "minimal",
  openai_reasoning_verbosity: "low",
  language: "pt-BR",

  // MCP
  enable_mcp: true,
  mcp_require_approval: "always",  // Defines whether the tool requires approval. Use 'never' only if it is secure (e.g., token validated) or in a development environment.
  mcp_allowed_tools: [
    "get_company_informations"
  ],
};

// Define type internally or just export object
export const CompanyInfo = {
  company_name: "Zaip",
  company_core_business: "SaaS de inteligência artificial e CRM integrado",
  company_products_segments: "Tecnologia",
  company_products_summary: "Fornecemos uma plataforma como serviço com CRM integrado e inteligência artificial. Nossa IA realiza atendimentos, negocia, fecha vendas e atualiza o CRM automaticamente. Isso proporciona processos de vendas mais eficientes e automatizados",
  company_differential: "Única IA do mercado que gera ROI de 3x a 12x",
  company_url_website: "https://zaip.com.br",
  company_url_support: "https://zaip.com.br/suporte",
  company_url_terms: "https://zaip.com.br/termos-de-uso/",
  company_url_privacy: "https://zaip.com.br/politica-de-privacidade/",
};
