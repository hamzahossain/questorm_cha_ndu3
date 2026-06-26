# QueueStorm API Service

QueueStorm is a hackathon backend service built with **TypeScript + Express**.  
It classifies customer complaints into structured tickets with strict guardrails, ensuring safe, schema‑compliant
responses.

---

## Features

- **Endpoints**
    - `GET /health` → service health check
    - `POST /analyze-ticket` → analyze a customer complaint
- **Strict schema** → enforced via enums in `types.ts`
- **Guardrails** → sanitizer strips unsafe text (refund promises, PIN/OTP leaks)
- **Validation** → validator ensures schema correctness
- **Caching** → deduplicates repeated complaints
- **Fallbacks** → guarantees safe responses even if AI fails

---

## Tech Stack

- Node.js + Express
- TypeScript
- OpenAI SDK (`gpt-4o-mini`) (default)
- In‑memory cache (swappable with Redis)

---

## ⚙️ Setup

1.Clone the repo:

```bash
    git clone https://github.com/your-org/queuestorm.git
    cd queuestorm
```

2.Install Dependencies:

```bash
npm install

```

3.Create `.env` file (From env.example):

```bash
    OPENAI_MODEL=gpt-4o-mini
    OPENAI_API_KEY=your_openai_key_here
    PORT=8000
```

4.Run the service:

```bash
    npm run serve
```

# QueueStorm Service Flow

- **index.ts**  
  Express entrypoint. Defines `/health` and `/analyze-ticket`. Validates input and forwards requests to the handler.

- **types.ts**  
  Holds enums and interfaces. Defines the strict schema for requests and responses.

- **handler.ts**  
  Core logic. Builds the AI prompt, calls OpenAI, runs sanitizer + validator, uses cache, and returns a safe response.

- **sanitizer.ts**  
  Cleans unsafe text (refund promises, PIN/OTP leaks), enforces enums, retries invalid output, ensures safe fallback.

- **validator.ts**  
  Double‑checks schema correctness (required fields, enum membership, confidence range). Throws errors if invalid.

- **cache.ts**  
  In‑memory cache. Generates hash keys, stores/retrieves responses, prevents duplicate AI calls.

- **sample_feed.json**  
  Few‑shot examples injected into the prompt to guide the AI toward consistent, schema‑compliant outputs.

---

## Request Flow

Client → **index.ts** → **handler.ts** → (uses **sanitizer.ts**, **validator.ts**, **cache.ts**, **types.ts**,
**sample_feed.json**) → back to client with a safe `TicketResponse`.
