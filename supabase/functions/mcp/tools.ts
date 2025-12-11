// tools.ts — definição de tools, schemas e descrições
export const ALLOWED = [
  "get_company_informations",
  "get_link",
  "get_product",
  "get_price",
  "get_pdf",
  "get_photo"
];

export const DESCRIPTIONS: Record<string, string> = {
  get_company_informations: "Busca informações na BASE DE CONHECIMENTO da empresa. Use SOMENTE se a resposta não estiver no script e for essencial para o passo atual.",
  get_link: "Busca links específicos. Use APENAS se o script pedir ou o usuário solicitar explicitamente um link.",
  get_product: "Busca produtos. Use APENAS se o script pedir ou o usuário solicitar explicitamente produtos.",
  get_price: "Busca preços. Use APENAS se o script pedir ou o usuário solicitar explicitamente preços.",
  get_pdf: "Busca PDFs. Use APENAS se o script pedir ou o usuário solicitar explicitamente um PDF.",
  get_photo: "Busca fotos. Use APENAS se o script pedir ou o usuário solicitar explicitamente uma foto."
};

// Schemas
export const INPUT_SCHEMAS: Record<string, any> = {
  get_company_informations: {
    type: "object",
    properties: {
      openai_conversation_id: { type: "string", minLength: 1 },
      current_step: { type: "number" },
      input: { type: "string", minLength: 1 }
    },
    required: ["openai_conversation_id", "input"],
    additionalProperties: false
  },
  get_link: {
    type: "object",
    properties: {
      openai_conversation_id: { type: "string", minLength: 1 },
      current_step: { type: "number" },
      input: { type: "string", minLength: 1 }
    },
    required: ["openai_conversation_id", "input"],
    additionalProperties: false
  },
  get_product: {
    type: "object",
    properties: {
      openai_conversation_id: { type: "string", minLength: 1 },
      current_step: { type: "number" },
      input: { type: "string", minLength: 1 }
    },
    required: ["openai_conversation_id", "input"],
    additionalProperties: false
  },
  get_price: {
    type: "object",
    properties: {
      openai_conversation_id: { type: "string", minLength: 1 },
      current_step: { type: "number" },
      input: { type: "string", minLength: 1 }
    },
    required: ["openai_conversation_id", "input"],
    additionalProperties: false
  },
  get_pdf: {
    type: "object",
    properties: {
      openai_conversation_id: { type: "string", minLength: 1 },
      current_step: { type: "number" },
      input: { type: "string", minLength: 1 }
    },
    required: ["openai_conversation_id", "input"],
    additionalProperties: false
  },
  get_photo: {
    type: "object",
    properties: {
      openai_conversation_id: { type: "string", minLength: 1 },
      current_step: { type: "number" },
      input: { type: "string", minLength: 1 }
    },
    required: ["openai_conversation_id", "input"],
    additionalProperties: false
  }
};

export const OUTPUT_SCHEMA_MIN = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    action: { type: "string" },
    request_id: { type: "string" },
    error: { type: "string" }
  },
  required: ["ok"],
  additionalProperties: true
};
