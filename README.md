<p align="center">
  <h1 align="center">🚀 GrowEasy CRM — AI CSV Importer</h1>
  <p align="center">
    An AI-powered CSV lead importer that intelligently maps <strong>any CSV format</strong> into GrowEasy CRM lead records.
  </p>
</p>

<p align="center">
  <a href="https://groweasy-crm-web.onrender.com"><strong>🌐 Live Demo</strong></a> &nbsp;·&nbsp;
  <a href="https://groweasy-crm-api.onrender.com/api/health"><strong>🔌 API Health</strong></a>
</p>

> **Position:** Software Developer Intern  
> **Submitted by:** Vimal Manoharan

---

## 📋 Table of Contents

- [Overview](#overview)
- [Live Demo](#-live-demo)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Features](#-key-features)
- [Local Setup](#-local-setup)
- [How It Works](#-how-it-works)
- [AI Pipeline](#-ai-pipeline--prompt-engineering)
- [Edge Case Handling](#-edge-case-handling)
- [Assignment Checklist](#-assignment-requirements-checklist)
- [Testing](#-testing)
- [**Final Test Report**](#-final-test-report-production--httpsgroweasy-crm-apionrendercom)
- [Environment Variables](#-environment-variables)

---

## Overview

Upload CSV files from **any source** — Facebook Leads, Google Ads exports, Excel sheets, real estate CRMs, or manually created spreadsheets — and this tool uses AI to intelligently map the columns into the standardized **GrowEasy CRM format**.

The system handles messy data, ambiguous column names, multiple contact fields, and various date formats while enforcing strict CRM validation rules.

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend** (Next.js) | [https://groweasy-crm-web.onrender.com](https://groweasy-crm-web.onrender.com) |
| **Backend** (Express API) | [https://groweasy-crm-api.onrender.com](https://groweasy-crm-api.onrender.com) |
| **Health Check** | [GET /api/health](https://groweasy-crm-api.onrender.com/api/health) |

> **Note:** Hosted on Render Free Tier. First request may take ~30s to wake the service. A built-in keep-alive pinger prevents frequent cold starts.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion, TanStack Table |
| **Backend** | Node.js, Express, TypeScript, csv-parser, Zod, Winston |
| **AI / LLM** | Groq (Llama 3.1), OpenAI (GPT-4o-mini), Google Gemini (1.5 Flash) — pluggable |
| **Monorepo** | pnpm workspaces, Turborepo |
| **Deployment** | Render (Web Services) |

---

## 🏗 Architecture

```
groweasy-crm-csv-importer/
├── apps/
│   ├── api/                    # Express Backend
│   │   └── src/
│   │       ├── config/         # Environment & Logger config
│   │       ├── controllers/    # Route handlers
│   │       ├── routes/         # Express route definitions
│   │       ├── services/
│   │       │   ├── ai/         # AI pipeline (providers, batch, retry, validation)
│   │       │   ├── crm/        # CRM mapper & formatter
│   │       │   └── csv/        # CSV parser, normalizer, preview
│   │       ├── prompts/        # AI prompt templates (system, extraction, repair)
│   │       ├── utils/          # Custom error classes
│   │       └── validators/     # Upload validation
│   └── web/                    # Next.js Frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # Reusable UI components
│           ├── features/       # Feature modules (upload, preview, processing, results)
│           ├── services/       # API client
│           ├── providers/      # Theme & Query providers
│           └── styles/         # Global CSS
├── packages/
│   └── shared/                 # Shared types, constants, Zod schemas
│       └── src/
│           ├── constants/      # CRM_STATUSES, DATA_SOURCES enums
│           ├── types/          # LeadCrm, CSVMetadata, ImportResult interfaces
│           ├── schemas/        # Zod validation schemas
│           └── utils/          # Re-exports
├── sample-data/                # Test CSV files
├── tests/                      # Unit tests
├── render.yaml                 # Render deployment blueprint
└── turbo.json                  # Turborepo pipeline config
```

---

## ✨ Key Features

### Frontend
- **Drag & Drop Upload** — Beautiful dropzone with file validation, size limits, and type checking
- **CSV Preview Table** — Responsive table with sticky headers, horizontal/vertical scrolling
- **4-Step Wizard** — Upload → Preview → AI Processing → Results, with smooth Framer Motion transitions
- **Real-Time Progress** — Animated progress indicators during AI processing with live log output
- **Results Dashboard** — Imported and skipped records displayed in interactive tables with statistics
- **Dark Mode** — Full dark/light theme toggle with system preference detection
- **Loading States** — Elegant spinners, skeleton loaders, and error handling throughout

### Backend
- **Pluggable AI Providers** — Swap between OpenAI, Gemini, Groq, or Mock with a single env var
- **Batch Processing** — Records are split into configurable batches for efficient AI processing
- **In-Memory Caching** — Caches LLM processing results at the record-level to avoid redundant API queries, dramatically speeding up re-imports and minimizing token/API usage
- **Exponential Backoff Retry** — Automatic retries on 429 (rate limit), 5xx errors, and timeouts
- **AI Self-Repair** — If the LLM returns malformed JSON, the system asks it to fix itself
- **Strict CRM Validation** — Zod schemas enforce field types, enum values, and contact requirements
- **CSV Injection Protection** — Escapes formula characters (`=`, `+`, `-`, `@`) in output fields
- **Line Break Escaping** — Prevents `\n` and `\r\n` from breaking CSV row integrity
- **Multi-Contact De-duplication** — First email/phone goes to primary fields, extras go to `crm_note`
- **Smart Date Parsing** — Handles ISO-8601, DD/MM/YYYY, MM/DD/YYYY, "May 15, 2026" and more
- **Security Headers** — X-Content-Type-Options, X-Frame-Options, CSP, CORS, method restrictions

### DevEx
- **Shared Package** — Types, constants, and Zod schemas shared between frontend and backend
- **Structured Logging** — Winston with color-coded dev output and JSON production format
- **Render Keep-Alive** — Built-in pinger keeps free-tier services warm

---

## 🚀 Local Setup

### Prerequisites
- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 8.x (`npm install -g pnpm`)

### Step 1: Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/GrowEasy-CRM-Intern-Assignment.git
cd GrowEasy-CRM-Intern-Assignment
pnpm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add at least one AI provider API key:

```env
# Recommended: Groq (free, ultra-fast)
GROQ_API_KEY=your_groq_api_key
LLM_PROVIDER=groq
```

> **Free API keys:** Get a free Groq key at [console.groq.com](https://console.groq.com). No credit card required.

### Step 3: Start Development Server

```bash
pnpm dev
```

This starts both services concurrently:
- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend:** [http://localhost:8080](http://localhost:8080)

### Step 4: Test

```bash
# Run unit tests
pnpm test

# Test the API with curl
curl -X POST http://localhost:8080/api/upload \
  -F "file=@sample-data/groweasy_sample.csv;type=text/csv"
```

---

## 🔄 How It Works

```
User uploads CSV  →  Frontend parses & previews  →  User confirms  →  Backend AI pipeline
                                                                          │
                                                                          ▼
                                                                   ┌─────────────┐
                                                                   │  CSV Parser  │
                                                                   └──────┬──────┘
                                                                          │
                                                                   ┌──────▼──────┐
                                                                   │ Batch Split  │
                                                                   └──────┬──────┘
                                                                          │
                                                                   ┌──────▼──────┐
                                                                   │  LLM Call   │ ← with retry
                                                                   └──────┬──────┘
                                                                          │
                                                                   ┌──────▼──────┐
                                                                   │  Validate   │ ← Zod + self-repair
                                                                   └──────┬──────┘
                                                                          │
                                                                   ┌──────▼──────┐
                                                                   │  CRM Map    │ ← enum enforcement
                                                                   └──────┬──────┘
                                                                          │
                                                                   ┌──────▼──────┐
                                                                   │  Response   │ → imported + skipped
                                                                   └─────────────┘
```

### Step-by-Step Flow

1. **Upload (Step 1):** User drops a CSV file. Frontend validates extension and size.
2. **Preview (Step 2):** File is sent to `POST /api/upload` which parses it and returns headers + first 15 rows. No AI is called yet.
3. **Confirm (Step 3):** User reviews the preview and clicks "Confirm Import".
4. **AI Processing (Step 3):** File is sent to `POST /api/import`. The backend:
   - Parses CSV into raw records
   - Splits records into batches (configurable, default 25)
   - Sends each batch to the AI model with structured prompts
   - Validates the AI response against Zod schemas
   - If validation fails, triggers AI self-repair (up to 2 attempts)
   - Maps validated records to CRM format with enum enforcement
   - Skips records with neither email nor phone
   - Returns imported records, skipped records, and metrics
5. **Results (Step 4):** Frontend displays imported/skipped counts and browsable data tables.

---

## 🧠 AI Pipeline & Prompt Engineering

### Prompt Structure

The AI receives three prompt layers:

1. **System Prompt** (`system.md`) — Establishes the AI's role as a CRM data extractor. Enforces JSON-only output, no hallucinations, no code fences.

2. **Examples Prompt** (`examples.md`) — Few-shot examples showing:
   - Clean lead mapping (standard columns → CRM format)
   - Messy lead mapping (split names, multiple contacts, ambiguous headers)

3. **Extraction Prompt** (`extraction.md`) — Per-batch instructions defining:
   - Target schema with all 16 fields
   - Semantic matching rules (e.g., `Ph. Number` → `mobiles`)
   - Contact extraction from any field
   - `unmapped_data` preservation

### Self-Repair Mechanism

If the AI returns invalid JSON or schema-violating output:
1. The `repair.md` prompt is sent with the error details and original output
2. The AI is asked to fix its own response
3. Validation is re-run (max 2 attempts total)

### Provider Strategy Pattern

```typescript
interface LLMProvider {
  readonly name: string;
  extractLeads(records, systemPrompt, extractionPrompt): Promise<string>;
}
```

Three production providers + one mock:
- **Groq** (`llama-3.1-8b-instant`) — Ultra-fast inference, generous free tier
- **OpenAI** (`gpt-4o-mini`) — High accuracy, cost-effective
- **Gemini** (`gemini-1.5-flash`) — Fast, native JSON mode
- **Mock** — Regex-based extraction for testing without API keys

---

## 🛡 Edge Case Handling

| Edge Case | How It's Handled |
|-----------|-----------------|
| **No email AND no phone** | Record is skipped, counted in `skippedRecords` |
| **Multiple emails** | First → `email` field, rest → `crm_note` |
| **Multiple phone numbers** | First → `mobile_without_country_code`, rest → `crm_note` |
| **DD/MM/YYYY dates** | Custom parser detects and reorders to YYYY-MM-DD before parsing |
| **"May 15, 2026" dates** | Native `Date.parse()` handles these directly |
| **Invalid dates** | Falls back to current timestamp (never returns Invalid Date) |
| **CSV injection (`=CMD(...)`)** | Formula characters escaped with `'` prefix |
| **Line breaks in fields** | `\r\n` and `\n` escaped to literal `\\n` for CSV integrity |
| **Messy status values** | Fuzzy matching: "junk lead" → `BAD_LEAD`, "good follow up" → `GOOD_LEAD_FOLLOW_UP` |
| **Unknown data sources** | Falls back to empty string `""` (per assignment rules) |
| **Unmapped columns** | Preserved in `unmapped_data` and included in `crm_note` metadata |
| **Country code in phone** | Stripped from `mobile_without_country_code` field |
| **Empty CSV headers** | Silently skipped during normalization |
| **AI returns invalid JSON** | Self-repair mechanism re-prompts the AI |
| **AI rate limits (429)** | Exponential backoff retry (3 attempts, 1s → 2s → 4s) |
| **Server errors (5xx)** | Automatic retry with backoff |
| **Oversized files** | Rejected at upload (configurable limit, default 5MB) |

---

## ✅ Assignment Requirements Checklist

### Frontend Requirements
| Requirement | Status |
|------------|--------|
| Upload CSV (drag & drop + file picker) | ✅ |
| Parse and preview uploaded rows | ✅ |
| Beautiful responsive table | ✅ |
| Horizontal scrolling | ✅ |
| Vertical scrolling | ✅ |
| Sticky headers | ✅ |
| Responsive design | ✅ |
| Confirm button (no AI until confirmed) | ✅ |
| Display parsed results (imported + skipped) | ✅ |
| Show total imported and total skipped | ✅ |

### Backend Requirements
| Requirement | Status |
|------------|--------|
| Accept any valid CSV file | ✅ |
| Do not assume fixed column names | ✅ |
| Parse CSV into records | ✅ |
| AI extraction in batches | ✅ |
| Map to GrowEasy CRM format | ✅ |
| Return structured JSON | ✅ |

### AI Rules
| Rule | Status |
|------|--------|
| Allowed CRM status values only | ✅ |
| Allowed data source values only (blank if no match) | ✅ |
| `created_at` works with `new Date()` | ✅ |
| `crm_note` for remarks, extras, unmapped | ✅ |
| Multiple emails: first → field, rest → note | ✅ |
| Multiple phones: first → field, rest → note | ✅ |
| CSV-safe output (escaped line breaks) | ✅ |
| Skip records with neither email nor phone | ✅ |

### Evaluation Criteria
| Criterion | Status |
|-----------|--------|
| AI prompt engineering | ✅ Multi-layer prompts with few-shot examples |
| Backend quality (clean architecture, error handling) | ✅ Layered architecture, custom errors |
| Frontend quality (modern UI, responsive, loading states) | ✅ Material Design 3 inspired, dark mode |
| Code quality (readability, type safety, structure) | ✅ Strict TypeScript, Zod, monorepo |
| Performance & edge cases | ✅ Batch processing, retry, validation |

### Bonus Features
| Bonus | Status |
|-------|--------|
| Drag & Drop upload | ✅ |
| Progress indicators during AI processing | ✅ |
| Retry mechanism for failed AI batches | ✅ Exponential backoff |
| Dark mode | ✅ System-aware + toggle |
| Unit tests | ✅ Node test runner |
| Deployment (Render) | ✅ render.yaml blueprint |
| Well-written README | ✅ You're reading it |

---

## 🧪 Testing

### Unit Tests

```bash
pnpm test
```

Tests cover:
- CSV parsing (multi-row, quoted values)
- Record normalization (trimming, empty key removal)
- Line break escaping
- CSV injection prevention
- Phone number cleaning & country code stripping
- Date parsing (valid + invalid fallback)
- CRM lead mapping (full field mapping, extra contacts, unmapped data)
- Skip criteria (no email + no phone → skip)
- Batch chunking logic

### Running the Full Test Suites

```bash
# Exhaustive 43-test API suite against the deployed backend
BASE_URL=https://groweasy-crm-api.onrender.com bash tests/exhaustive_api_test.sh

# Comprehensive edge-case E2E suite (AI pipeline + constraint verification)
API_URL=https://groweasy-crm-api.onrender.com/api bash tests/run_exhaustive_tests.sh
```

Results are saved to:
- `tests/results_exhaustive_api_test.txt`
- `tests/results_comprehensive_suite.txt`

---

## 📊 Final Test Report (Production — `https://groweasy-crm-api.onrender.com`)

> **Test Date:** 2026-07-07 · **Commit:** `b186dc9` · **LLM Provider:** Groq (Llama 3.1 8B)

### Suite 1 — Exhaustive API Test (43 Automated Checks)

| # | Test Group | Tests | Result |
|---|-----------|-------|--------|
| 1 | Server Health & Connectivity | 8 | ✅ All Pass |
| 2 | `POST /api/upload/preview` (no AI) | 8 | ✅ All Pass |
| 3 | `POST /api/import` (AI extraction) | 10 | ✅ All Pass |
| 4 | Skip Records (no email + no mobile) | 4 | ✅ All Pass |
| 5 | Multiple emails/phones → `crm_note` | 3 | ✅ All Pass |
| 6 | Messy column headers (AI field mapping) | 6 | ✅ All Pass |
| 7 | Date format variations | 6 | ✅ All Pass |
| 8 | `crm_status` enum enforcement | 2 | ✅ All Pass |
| 9 | `data_source` enum enforcement | 2 | ✅ All Pass |
| 10 | Real-world CSV formats (Facebook / Google Ads) | 2 | ✅ All Pass |
| 11 | Security tests (injection, CORS, headers) | 4 | ✅ All Pass |
| 12 | Full assignment sample (`edge_cases_test.csv`) | 8 | ✅ All Pass |
| 13 | Performance & batch processing | 2 | ✅ All Pass |
| 14 | Error handling (405, 404, JSON errors) | 4 | ✅ All Pass |

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GROWEASY CRM API — FINAL TEST RESULTS
  URL: https://groweasy-crm-api.onrender.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Tests Run:  43
  ✅ PASSED:         42
  ❌ FAILED:          0
  ⚠️  WARNINGS:       1

  Pass Rate: 97.7%

  ⚠️  NOTE: The 1 warning ("5000-row file accepted") is correct
      behaviour — the synthetic test file is ~3.5MB, which is
      under the enforced 5MB limit. Files >5MB correctly
      return HTTP 413.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Suite 2 — Comprehensive Edge-Case Suite (19 Constraint Verifications)

```
Target: https://groweasy-crm-api.onrender.com/api
Dataset: tests/comprehensive_edge_cases.csv (21 rows, 15 columns)
```

| # | Constraint | Result |
|---|-----------|--------|
| 1 | Preview endpoint fast (no AI) | ✅ 200 OK · 21 rows returned |
| 2 | AI import pipeline | ✅ 200 OK · 20 imported, 1 skipped |
| 3 | `DD.MM.YYYY` date → ISO | ✅ `2026-05-13T00:00:00.000Z` |
| 4 | ISO/slash date → ISO | ✅ `2026-05-13T14:20:48.000Z` |
| 5 | Epoch timestamp → ISO | ✅ `2026-05-14T08:30:48.000Z` |
| 6 | `DD/MM/YYYY` date → ISO | ✅ `2026-05-13T00:00:00.000Z` |
| 7 | Invalid date → current timestamp fallback | ✅ Never returns `Invalid Date` |
| 8 | Formula injection `=` escaped | ✅ `"Formula Injection ="` |
| 9 | Formula injection `+` escaped | ✅ `"Formula Injection +"` |
| 10 | Formula injection `-` escaped | ✅ `"Formula Injection -"` |
| 11 | Formula injection `@` escaped | ✅ `"Formula Injection @"` |
| 12 | Country code uncorrupted | ✅ `+91` |
| 13 | `\r\n` escaped in `crm_note` | ✅ Literal `\n` preserved |
| 14 | Skip rule enforced (row 12) | ✅ `rowIndex: 12` · correct reason |
| 15 | Multi-contact de-duplication | ✅ Extra emails + phones in `crm_note` |
| 16 | Status fuzzy match: `did not connect` | ✅ `DID_NOT_CONNECT` |
| 17 | Status fuzzy match: `junk` | ✅ `BAD_LEAD` |
| 18 | Status fuzzy match: `sale` | ✅ `SALE_DONE` |
| 19 | Source fuzzy match: invalid string | ✅ `""` (blank fallback) |

```
📊 METRICS: Imported: 20 / 21 · Skipped: 1 · Success Rate: 95% · Time: 423ms
```

### Error Response Verification

| Scenario | Expected | Actual |
|----------|----------|--------|
| No file uploaded | `400` | ✅ `400` |
| Wrong field name (`csv` instead of `file`) | `400` | ✅ `400` |
| Empty CSV file | `422` | ✅ `422` |
| File > 5 MB | `413` | ✅ `413` |
| Non-CSV MIME type | `400` | ✅ `400` |
| `DELETE /api/import` | `405` | ✅ `405` |
| `PUT /api/import` | `405` | ✅ `405` |
| `GET /api/import` | `404` | ✅ `404` |
| Untrusted CORS origin | Blocked | ✅ Blocked |

### Manual API Testing

```bash
# Health check
curl https://groweasy-crm-api.onrender.com/api/health

# Preview a CSV (no AI)
curl -X POST https://groweasy-crm-api.onrender.com/api/upload \
  -F "file=@sample-data/groweasy_sample.csv;type=text/csv"

# Import with AI processing
curl -X POST https://groweasy-crm-api.onrender.com/api/import \
  -F "file=@sample-data/groweasy_sample.csv;type=text/csv"
```

---

## 🔧 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8080` | API server port |
| `NODE_ENV` | No | `development` | `development`, `production`, or `test` |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS origin for the frontend |
| `OPENAI_API_KEY` | One of three | — | OpenAI API key |
| `GEMINI_API_KEY` | One of three | — | Google Gemini API key |
| `GROQ_API_KEY` | One of three | — | Groq API key (recommended) |
| `LLM_PROVIDER` | No | Auto-detected | Force a specific provider |
| `BATCH_SIZE` | No | `25` | Records per AI batch |
| `MAX_FILE_SIZE` | No | `5242880` | Max upload size in bytes (5MB) |

---

## 📄 API Reference

### `GET /api/health`
Returns server status.

### `GET /api/version`
Returns API name and version.

### `POST /api/upload` or `POST /api/upload/preview`
Upload a CSV file for preview (no AI processing).

**Request:** `multipart/form-data` with field `file`  
**Response:**
```json
{
  "metadata": {
    "fileName": "leads.csv",
    "fileSize": 1234,
    "rowCount": 10,
    "columnCount": 5,
    "uploadTime": "2026-07-07T...",
    "headers": ["Name", "Email", "Phone", "..."]
  },
  "previewRows": [
    { "Name": "John", "Email": "john@example.com", "..." }
  ]
}
```

### `POST /api/import`
Upload a CSV file for full AI-powered import.

**Request:** `multipart/form-data` with field `file`  
**Response:**
```json
{
  "importedRecords": [
    {
      "created_at": "2026-05-13T14:20:48.000Z",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "country_code": "+91",
      "mobile_without_country_code": "9876543210",
      "company": "GrowEasy",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "lead_owner": "test@gmail.com",
      "crm_status": "GOOD_LEAD_FOLLOW_UP",
      "crm_note": "",
      "data_source": "",
      "possession_time": "",
      "description": ""
    }
  ],
  "skippedRecords": [
    {
      "rowIndex": 3,
      "reason": "Skipped row 3: contains neither a valid email nor mobile number.",
      "rawRecord": { "..." }
    }
  ],
  "metrics": {
    "importedCount": 4,
    "skippedCount": 1,
    "successRate": 80,
    "processingTimeMs": 1200
  }
}
```

---

<p align="center">
  Built with ❤️ for GrowEasy
</p>
