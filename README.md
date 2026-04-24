# RISK TAKER DIGIT AI

RISK TAKER DIGIT AI is a modular Next.js trading console for digit contracts. It is built so AI only composes, validates, and explains configuration. It does not invent prediction barriers or generate trading logic.

## What is included

- Prebuilt contract modules for Match, Differs, Over, Under, Even, and Odd
- Strict barrier extraction and validation rules
- Strategy composer and validator flow
- Money management engine with multiple progression systems
- Multi-market analyzer using real websocket ticks
- Signal and digit distribution overlays
- Confirmation gate before any execution call
- Prebuilt AI assistants with structured prompts, schemas, and provider fallback
- Vercel-friendly Next.js app structure with web manifest

## Architecture

- `app/`: Next.js app router, UI shell, and API routes
- `components/`: client dashboard and panels
- `lib/domain/`: contracts, barriers, strategy validation, money management, tick tools, market scoring, execution plan
- `lib/ai/`: prompts, schemas, provider fallback, and assistant orchestration

## Guards

- Barrier-required modules cannot run without user-supplied barriers
- Invalid barriers are rejected before confirmation
- Stake is mandatory
- Tick duration is limited to `1-20`
- Execution is blocked until `confirmed: true`
- Live purchase remains guarded until secure backend trading credentials are configured

## Environment

Copy `.env.example` into `.env.local` and fill in only the providers you want:

- `OPENAI_API_KEY`
- `LOCAL_LLM_BASE_URL`
- `HUGGINGFACE_API_KEY`
- `DERIV_API_TOKEN`

## Run

```bash
npm install
npm run dev
```

## Notes

- The dashboard uses live websocket ticks from Deriv public market streams.
- The `/api/execute` route builds contract payloads and enforces confirmation. It intentionally returns preview or guarded responses unless secure trading execution is fully wired on the backend.
- The UI uses a neon glassmorphism visual system and is mobile-friendly.

## Risk disclaimer

Deriv offers complex derivatives, such as options and contracts for difference ("CFDs"). These products may not be suitable for all clients, and trading them puts you at risk. Please make sure that you understand the following risks before trading Deriv products.

You may lose some or all of the money you invest in the trade.
If your trade involves currency conversion, exchange rates will affect your profit and loss.
You should never trade with borrowed money or with money that you cannot afford to lose.
