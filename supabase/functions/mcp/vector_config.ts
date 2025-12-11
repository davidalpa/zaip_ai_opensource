import { COMPANY_URLS } from "./content/company_urls.ts";
import { COMPANY_INFO } from "./content/company_info.ts";
import { COMPANY_FAQ } from "./content/company_faq.ts";
import { COMPANY_PRODUCTS_SUMMARY } from "./content/company_products_summary.ts";
import { COMPANY_PRODUCTS_PRICE } from "./content/company_products_price.ts";
import { COMPANY_PRODUCTS_DETAILS } from "./content/company_products_details.ts";
import { COMPANY_PRODUCTS_SEGMENTS } from "./content/company_products_segments.ts";
import { COMPANY_PRODUCTS_LINK_PAGAMENTO } from "./content/company_products_link_pagamento.ts";
import { COMPANY_OTHER_INFORMATIONS } from "./content/company_other_informations.ts";


export const VECTOR_CONFIG = {
    Embedding_Batch_Size: 512,
    Chunk_Size: 2048,
    Chunk_Overlap: 50,
    Split_Code: 'markdown'
};


export const KNOWLEDGE_BASE_DATA = [
    {
        "company_urls": COMPANY_URLS,
        "company_info": COMPANY_INFO,
        "company_faq": COMPANY_FAQ,
        "company_products_summary": COMPANY_PRODUCTS_SUMMARY,
        "company_products_price": COMPANY_PRODUCTS_PRICE,
        "company_products_details": COMPANY_PRODUCTS_DETAILS,
        "company_products_segments": COMPANY_PRODUCTS_SEGMENTS,
        "company_products_link_pagamento": COMPANY_PRODUCTS_LINK_PAGAMENTO,
        "company_other_informations": COMPANY_OTHER_INFORMATIONS
    }
];
