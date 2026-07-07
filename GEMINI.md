# Gemini Review Guide & AI Standards

This document is the code review and quality assurance reference for Google's Gemini models when generating, refactoring, or reviewing code in the GrowEasy AI CSV Importer workspace.

---

## 🔍 Gemini Review Checklist

### 1. Type Safety & Schema Completeness
- Ensure strict TypeScript schema validation (using Zod) is implemented at both entry gates:
  - Frontend parsing preview validation.
  - Backend API endpoint parameter verification (`apps/api/src/validators/upload.validator.ts`).
- Never allow `any` to bypass field checks.

### 2. CRM Field Integrity & Enums
Gemini must double-check all LLM mapping prompts and validators to confirm:
- **`crm_status`** values are exactly: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`.
- **`data_source`** values are exactly: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`. Any unmatched values must fall back to an empty string `""`.
- **`created_at`** is parsed to an ISO format or UTC string so `new Date(created_at)` never returns `Invalid Date`.
- **`crm_note`** aggregates any leftover contact info, comments, and unmapped metadata.

### 3. Contact De-duplication & Extraction
- Confirm mapping logic extracts the *first* email and *first* phone number, pushing all subsequent ones into notes.
- Ensure rows with **neither** email nor mobile are completely skipped and counted in the `skippedRecords` count.

### 4. CSV Escaping Rules
- Check that output strings escape raw line breaks (like `\r\n` or `\n`) into `\n` to prevent breaking CSV row integrity when exported.

---

## 🧠 AI Prompt Engineering & Model Invocation Standards

When developing the backend AI mapping service, adhere to these prompt engineering rules:

- **Structured Output:** Instruct the model to return ONLY a JSON response block that conforms to the expected output schema (or use structured JSON output options if calling models natively).
- **System Prompt Design:**
  - Define the assistant's role: `"You are an expert CRM lead data extractor and normalizer."`
  - Provide inline examples showing how to parse mismatched/dirty headers (e.g. `Ph. Number` -> `mobile_without_country_code`).
  - Provide negative examples illustrating when to skip a record (e.g., if both contact fields are blank).
- **Batch Processing:**
  - Send records in batches. Ensure the prompt handles arrays of records and returns an array of equal length or maps skipped records with indices.
- **Failures and Retry Logic:**
  - Create a custom retry service using exponential backoff to handle transient AI model API failures (e.g., code `429` Rate Limit or `503` Service Unavailable).

---

## ⚠️ Common Pitfalls to Audit During Code Reviews

1. **Memory Bloat:** Ensure the backend does not read the entire CSV file into memory with `fs.readFileSync`. Use readable streams.
2. **Missing Loading States:** Verify the Next.js UI does not freeze during batch uploads. Ensure circular progress spinners or progress percentages are displayed.
3. **Improper CORS configuration:** Ensure the API server allows cross-origin requests from the web frontend port (Next.js is typically on port `3000`, API is on `8080`).
4. **Environment Variables:** Verify that Gemini SDK or OpenAI API keys are referenced through a centralized configuration file (`apps/api/src/config/env.ts`) and never read directly from `process.env`.