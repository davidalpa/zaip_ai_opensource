
import { AgentConfig } from "./agent_config.ts";

const SUPABASE_PROJECT_ID = Deno.env.get("SUPABASE_PROJECT_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? (SUPABASE_PROJECT_ID ? `https://${SUPABASE_PROJECT_ID}.supabase.co` : "");
// Default to standard Supabase Storage URL structure if not provided
const STORAGE_PUBLIC_URL = Deno.env.get("STORAGE_PUBLIC_URL") ?? (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/` : "");

export const ENVS = {
    FACEBOOK_API_VERSION: Deno.env.get("FACEBOOK_API_VERSION") ?? "v24.0",
    FACEBOOK_WEBHOOK_CODE_VERIFY: Deno.env.get("FACEBOOK_WEBHOOK_CODE_VERIFY") ?? "",
    FACEBOOK_WEBHOOK_URL: Deno.env.get("FACEBOOK_WEBHOOK_URL") ?? "",
    FACEBOOK_PHONE_NUMBER_ID: Deno.env.get("FACEBOOK_PHONE_NUMBER_ID") ?? "",
    MCP_SERVER_URL: Deno.env.get("MCP_SERVER_URL") ?? "",
    ENABLE_MCP: AgentConfig.enable_mcp,
    MCP_SERVER_LABEL: Deno.env.get("MCP_SERVER_LABEL") ?? "",
    MCP_ALLOWED_TOOLS: AgentConfig.mcp_allowed_tools,
    STORAGE_PUBLIC_URL: STORAGE_PUBLIC_URL,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_PROJECT_ID: SUPABASE_PROJECT_ID,
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    MCP_TOKEN: Deno.env.get("MCP_TOKEN")!,
    OPENAI_API_KEY: Deno.env.get("OPENAI_API_KEY") ?? "",
    FACEBOOK_ACCESS_TOKEN: Deno.env.get("FACEBOOK_ACCESS_TOKEN") ?? ""
};
