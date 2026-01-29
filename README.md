# AI Agents for WhatsApp Sales Funnel (Zaip Open Source)

A production-grade serverless backend to build **AI-powered WhatsApp sales funnels**, running on:

- 📱 Meta WhatsApp Cloud API (real-time events & messaging)
- 🧠 Context Engineering (OpenAI GPT-5 Mini / GPT-4o Mini, low cost, low latency)
- 🧩 MCP + RAG (Model Context Protocol + Supabase Vector with pgvector)
- 👁️ LangFuse (AI Observability)
- 🗄️ Supabase (Database • Storage • Edge Functions • Deno Runtime)

This repo exposes the main Edge Function **`zaip_ai_opensource`**, responsible for processing every WhatsApp message and orchestrating:

> **Contact → Buffering Messages → Conversation → Funnel Stage → Agent → AI Response → WhatsApp Reply**

Use it as a **ready-to-customize template** to launch your own WhatsApp AI agent (sales, support, pre-sales, onboarding, etc.) without rebuilding all the infrastructure from scratch.

---

## 🔥 Why This Project Stands Out

Most chatbot templates:
- Push giant static prompts to the model  
- Let the AI handle 100% of the logic  
- Burn tokens, hallucinate, and repeat messages  

This project does the opposite:
- 🧠 **True Context Engineering**  
- 🧱 **Funnel logic and state machine OUTSIDE the model**  
- 💸 **Optimized for small, cheap models (GPT-5 Mini / GPT-4o Mini)**  

By sending only the **minimum context needed for each specific message**, you get:
- Drastically reduced hallucination  
- Much lower latency  
- Much lower cost  
- Predictable, scalable behavior  

---

## 🧠 Context Engineering & Dynamic Prompt Orchestration

For **every incoming message**, the orchestrator performs:

### 1. Funnel Stage Detection (`step_process`)
Examples: `"New Lead"`, `"Active Contact"`, `"Scheduling"`, `"After-Sales"`.

### 2. Dynamic Agent Selection
Loads the correct persona based on the funnel stage.

- Switch seamlessly between agents  
  (e.g., `"Sales Rep"` → `"Support Scheduler"` → `"Payment Closer"`)

### 3. Step Packet Injection
Loads the **`step_packet`** containing:

- Step-specific rules  
- Scripts (ENTRY, NEXT, RETRY…)  
- Required slot definitions  
- Validation rules  

Selected based on `current_step`.

### 4. Slot Extraction
The AI extracts variables such as:

- Name  
- Email  
- Interest  
- Budget  
- Preferred time  
- Anything defined by the step  

Slots are saved to the database.

### 5. State Update
If step goals are met:

- `current_step` advances  
- `state_process` (funnel stage) updates automatically  

### 6. MCP + RAG Integration
The AI can query a vector database **only when needed**, using MCP tools.

- Fetches relevant chunks  
- Keeps AI context extremely lightweight

**Result:**  
You can run high-quality conversations using **GPT-5 Mini** with:

```json
reasoning: { "effort": "minimal" },
text: { "verbosity": "low" }
```

Achieving better accuracy than large models using generic prompts.

---

## 🚀 Processing Pipeline (5 Main Steps)

The function uses an **instant 200 OK response** strategy to avoid WhatsApp timeout.
Heavy logic runs asynchronously using `EdgeRuntime.waitUntil`.

### 0. Orchestrator (`message_controller.ts`)

Coordinates all 5 steps, manages global state, and centralizes error handling.

---

### 1. Context Identification (`step_1_identification.ts`)

Extracts:

* Sender phone number
* Receiver phone number (Phone ID)

Builds the **initial Flow Context**:

* Company configuration
* Channel configuration
* Agent configuration

---

### 2. Session Management (`step_2_session.ts`)

Manages contact + conversation objects:

* Creates or updates `zaip_contacts`
* Creates or fetches `zaip_conversations`
* Loads:

  * `step_process`
  * `state_process`

**7-Day Rule:**
If the last interaction > 7 days → start a new conversation (new ID).

Also manages **OpenAI Thread IDs** for conversation history.

---

### 3. Message Processing (`step_3_message_type.ts`)

Detects the type of message:

* **Debounce / double-send** prevention
* **Text** → direct
* **Audio/Image** → transcribed/decoded by AI
* **Privacy:**

  * Raw media saved to Supabase Storage
  * Only the transcription enters the AI context

---

### 4. Artificial Intelligence (`step_4_ai_response.ts`)

The core logic engine:

* Builds dynamic prompt instructions based on current funnel stage
* Uses MCP tools for RAG (vector DB search) when needed
* Generates final response using configured model (GPT-4o, GPT-5 Mini, etc.)

Dynamic model configuration:
* **GPT-5**
  * Minimal reasoning
  * Low verbosity

* **Other models**
  * Temperature-based
  * No reasoning/verbosity fields

---

### 5. WhatsApp Response Sending (`step_5_send_whatsapp_message.ts`)

* Splits long messages into multiple bubbles
* Adds a **typing indicator** with random delay
* Sends via WhatsApp Graph API
* Marks conversation as **read**

---

## 🛡️ Error Handling & Logging

### 1. Centralized Execution Log

Every step logs into a single `executionLog` object.
In the `finally` block of `index.ts`, the entire log prints as:

```
LOG GERAL: { ...big JSON... }
```

**Pessimistic strategy:**

* `logType` starts as `"ERROR"`
* Only becomes `"SUCCESS"` if the flow ends intentionally

---

### 2. Database Audit Tables

* `log_results` → final result + extracted slots + AI reasoning
* `log_conversations_steps` → history of funnel & step transitions
* `log_meta_whebhook` → raw Meta events
* `log_openai_requests` → raw AI inputs/outputs
* `log_mcp` → RAG/tool-call history

---

### 3. Error Severity Levels

**Critical Errors (flow stops):**

* Invalid payload
* Missing channel
* Session creation failure
* OpenAI API failure

Response: 4xx / 5xx.

**Non-Critical Errors (flow continues):**

* Logging failure
* Message insertion failure after send
* Status webhook error

Flow continues and the user receives the message normally.

---

## 👁️ Observability (Langfuse)

The project includes native integration with **Langfuse** for full AI traceability.

*   **Traces**: Each execution (Trace) maps to a user interaction.
*   **Generations**: Tracks every LLM call (Main flow, Tool calls, Retries).
*   **Metrics**: Token usage, latency, and costs per execution.
*   **Clean Logs**:
    *   **Input**: Full user message + context.
    *   **Output**: Only the final text response (JSON metadata stripped).

> **Note**: Observability is critical for debugging "black box" AI behavior in production.

---

## 📂 Architecture & Microservices

Inside `supabase/functions/` you get **two independent microservices**:

### 1. `webhook-whatsapp` — The Core Orchestrator

* Receives WhatsApp webhook events
* Manages funnel → agent → AI flow
* Connects to Supabase DB, Storage, and OpenAI

**Internal Structure:**

```
webhook-whatsapp/
│ index.ts
│ event_router.ts
│
├── message/
│   ├── message_controller.ts
│   ├── step_1_identification.ts
│   ├── step_2_session.ts
│   ├── step_3_message_type.ts
│   ├── step_4_ai_response.ts
│   └── step_5_send_whatsapp_message.ts
│
├── database_queries/
├── config/
├── prompts/
├── facebook_events/
└── types/
```

---

### 2. `mcp` — Tools & RAG Service

* Runs as an independent MCP server
* Provides access to:
  * Internal Knowledge Base
  * Vector Database
  * External tools
* The main bot uses this service for RAG calls

---

## 📡 Webhook Event Routing

Handled by `event_router.ts`.

### Conversational Events (messages)

* Routed to the AI pipeline (Steps 1–5)

### System Events (e.g., `account_update`)

* Logged in `log_meta_whebhook`
* Do **not** trigger AI logic

---

## 🛠️ Quick Start

### Requirements
* Supabase project
* OpenAI API key
* Meta WhatsApp Cloud API key

### Local Development

```bash
supabase login
supabase functions serve --env-file .env.local
```

### Deployment

#### Option 1 — GitHub Actions (Automatic)

CI/CD workflow:
`.github/workflows/deploy-edgefunctions.yml`

* Push to `main` → automatic deployment

#### Option 2 — Manual Deploy

```bash
supabase functions deploy
```

Environment variables:
* Deployment: `SUPABASE_ACCESS_TOKEN` (PAT)
* Runtime: `SUPABASE_SERVICE_ROLE_KEY`
* Required: `SUPABASE_PROJECT_ID`

---

## 📚 Full Documentation

See `DEVELOPMENT.md` for:

* Line-by-line explanations
* Architecture diagrams
* Business rules
* How to customize agents, funnel, and prompts

---

## 💡 Who This Is For

Use this repo if you want to build:

* A **WhatsApp AI SaaS**
* Smart pre-sales agents
* Support/scheduling assistants
* Sales funnels with structured data extraction
* Multi-step conversational workflows
* A production-ready WhatsApp AI backend

Clone it, plug in your prompts, configure your funnel and you’re ready to deploy a **WhatsApp AI Agent that actually works in production**.

