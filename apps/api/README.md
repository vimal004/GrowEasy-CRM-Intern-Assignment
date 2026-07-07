# GrowEasy CRM AI CSV Importer - Backend

This directory contains the production-grade, highly modular, and secure backend REST API for the **GrowEasy CRM AI CSV Importer**. The application is built using Node.js, Express, TypeScript, Zod, and Winston.

---

## Architecture & Modular Design

The backend conforms strictly to **Clean Architecture** patterns, ensuring business logic isolation from routing and external services.

```
src/
├── config/             # Typed environment loading & logger configurations
├── controllers/        # Request receiving, inputs validation, API routing delegates
├── routes/             # Express endpoints mapping & Multer middleware bindings
├── middleware/         # Custom Express middlewares (CORS, security headers, logger)
├── services/           # CORE BUSINESS LOGIC
│   ├── ai/             # Pluggable LLM Providers (OpenAI, Gemini, Groq, Mock)
│   │   └── providers/  # Backends implementation
│   ├── csv/            # CSV parsing, normalizer, and preview services
│   └── crm/            # Target schema mappings & sanitizers
├── prompts/            # Markdown-separated LLM prompts (system, extraction, repair)
├── validators/         # Input file schema validation
├── utils/              # Custom BaseError definitions & shared helper functions
├── app.ts              # Express application configuration
└── server.ts           # Server start script & signal listeners (SIGINT/SIGTERM)
```

### Business Logic Flow (AI Import Pipeline)
1. **Upload Validation:** Multer accepts a CSV file upload to memory storage (`multer.memoryStorage()`) and validates file presence, mime type, and sizes.
2. **CSV Parsing:** `csv-parser` processes the buffer into raw record objects.
3. **Normalization:** Trims column whitespace and removes empty properties.
4. **Batch Processing:** Splitting records into configurable batch sizes (default 25) to run sequentially (protecting API rate limits).
5. **AI Extraction:** Active provider constructs prompts from markdown templates and invokes the model.
6. **Zod Validation & Auto-Repair:** Schema validations are enforced via Zod. If the LLM generates bad JSON or misses properties, a self-correction repair prompt is sent to self-heal the structure.
7. **CRM Lead Mapping:** Primary contact extraction is isolated, extra contacts are pushed into `crm_note`, dates are standardized to ISO format, and statuses/sources are checked against strict enum constraints.
8. **CSV Injection Protection:** Sanitizes fields starting with formula characters (`=`, `+`, `-`, `@`) by prepending a single quote (`'`), protecting downstream spreadsheet usage.
9. **Performance Logging:** Captures processing latency, model timing, success ratios, and logs them in structured JSON via Winston.

---

## API Documentation

### 1. Health Check
* **Endpoint:** `GET /api/health`
* **Response:** `200 OK`
```json
{
  "status": "UP",
  "timestamp": "2026-07-07T06:34:41.013Z"
}
```

### 2. Version Information
* **Endpoint:** `GET /api/version`
* **Response:** `200 OK`
```json
{
  "name": "groweasy-crm-api",
  "version": "1.0.0"
}
```

### 3. CSV Preview
* **Endpoint:** `POST /api/upload` (Alias: `POST /api/upload/preview`)
* **Accepts:** `multipart/form-data` with key `file` (Max 5MB)
* **Response:** `200 OK`
```json
{
  "metadata": {
    "fileName": "leads.csv",
    "fileSize": 865,
    "rowCount": 4,
    "columnCount": 15,
    "uploadTime": "2026-07-07T06:34:54.032Z",
    "headers": ["created_at", "name", "email", "phone"]
  },
  "previewRows": [
    { "created_at": "2026-05-13", "name": "John", "email": "john@example.com" }
  ]
}
```

### 4. AI Import
* **Endpoint:** `POST /api/import`
* **Accepts:** `multipart/form-data` with key `file` (Max 5MB)
* **Response:** `200 OK` (Conforms to `@groweasy/shared` `ImportResult` type)
```json
{
  "importedRecords": [
    {
      "created_at": "2026-05-13T08:50:48.000Z",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "country_code": "'+91",
      "mobile_without_country_code": "9876543210",
      "company": "GrowEasy",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "lead_owner": "system@groweasy.ai",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "Extra note...",
      "data_source": "",
      "possession_time": "",
      "description": ""
    }
  ],
  "skippedRecords": [],
  "metrics": {
    "importedCount": 1,
    "skippedCount": 0,
    "successRate": 100,
    "processingTimeMs": 210
  }
}
```

---

## AI Prompt Documentation

Prompts are isolated inside `src/prompts/` as markdown files:
* **`system.md`**: Defines assistant role, sets structured JSON array rules, and forbids chat introductions or markdown code fences.
* **`extraction.md`**: Maps input data to JSON schema keys (`emails` array, `mobiles` array, `unmapped_data` object).
* **`examples.md`**: Provides few-shot, dirty-to-structured JSON mappings.
* **`repair.md`**: Invoked for self-repair, providing the validation error log and original model output to self-correct and output valid JSON.

---

## Environment Configuration

Create a `.env` file in the root workspace folder:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `number` | `8080` | Server binding port. |
| `NODE_ENV` | `string` | `development` | Environment mode (`development`, `production`, `test`). |
| `FRONTEND_URL` | `string` | `http://localhost:3000` | CORS trusted origin URL. |
| `LLM_PROVIDER` | `string` | *Auto* | Active LLM (`openai`, `gemini`, `groq`, `mock`). |
| `OPENAI_API_KEY` | `string` | `""` | OpenAI platform API credential key. |
| `GEMINI_API_KEY` | `string` | `""` | Google GenAI SDK API credential key. |
| `GROQ_API_KEY` | `string` | `""` | Groq Cloud API credential key. |
| `BATCH_SIZE` | `number` | `25` | Amount of CSV records sent to LLM per prompt. |
| `MAX_FILE_SIZE` | `number` | `5242880` | Max CSV file upload size limit (in bytes). |

*Note: If no API keys are present or if they match placeholders (e.g. `your_openai_api_key_here`), the server falls back to the `mock` provider, enabling local testing.*

---

## Local Development & Deployment Guide

### Prerequisites
* Node.js >= 18
* `pnpm` workspace installed

### Installation & Builds
```bash
# Install dependencies (only run in workspace root if not already done)
pnpm install

# Compile TypeScript modules
pnpm build
```

### Running Locally
```bash
# Run backend Express API server with file watching (binds to 127.0.0.1:8080)
pnpm --filter api dev

# Start frontend and backend concurrently in dev mode
pnpm dev
```

### Running Unit Tests
Executes the native test runner suite verifying parser, formatter, and mapper constraints:
```bash
pnpm --filter api test
```

### Production Deployment
1. Set `NODE_ENV=production` and provide valid provider API keys.
2. Build the packages using `pnpm build`.
3. Start the Express server using `pnpm --filter api start` (which executes the compiled javascript from `dist/server.js`).
4. Ensure CORS policies allow incoming connections from your custom domain.
