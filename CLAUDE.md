# Claude Developer Instructions

This file guides Claude Code on how to develop, test, and run the GrowEasy AI CSV Importer project.

---

## 🛠️ Build and Development Commands

This project is a monorepo managed with **pnpm** and **Turborepo**.

- **Run Dev Server (All):** `pnpm dev` (starts both Next.js frontend and Express backend)
- **Run Backend Only:** `pnpm --filter api dev`
- **Run Frontend Only:** `pnpm --filter web dev`
- **Build All Apps:** `pnpm build`
- **Build Backend Only:** `pnpm --filter api build`
- **Build Frontend Only:** `pnpm --filter web build`
- **Run Tests:** `pnpm test`
- **Run Linter:** `pnpm lint`
- **Format Code:** `pnpm format` or `pnpm prettier --write`

---

## 📦 Directory Structure & Code Style

- **Apps & Packages:**
  - `apps/web`: Next.js (App Router) Frontend
  - `apps/api`: Node.js / Express Backend
  - `packages/shared`: Shared Types, Enums, Constants, and Schemas
- **TypeScript:** Use strict typing. Avoid using `any`. Make extensive use of shared schemas (`packages/shared/src/schemas/lead.ts`) and types (`packages/shared/src/types/lead.ts`).
- **Styling:** Use Vanilla CSS or Tailwind CSS (Vanilla CSS preferred for exact layout control). Maintain a beautiful dark-mode-first aesthetic with smooth micro-animations.
- **Imports:** Group imports logically (Node built-ins -> Third-party dependencies -> Shared local packages -> App-local paths). Use path aliases (e.g. `@/components/*`) in Next.js.

---

## 🧭 API Contracts & Routing

### 1. Preview API
- **Endpoint:** `POST /api/upload/preview`
- **Request:** Multipart Form-data (`file` field).
- **Process:** Parse the CSV safely. Do not call the AI model yet.
- **Response JSON:**
  ```json
  {
    "success": true,
    "headers": ["column_a", "column_b", "..."],
    "previewRows": [
      { "column_a": "value1", "column_b": "value2" }
    ],
    "totalRows": 45
  }
  ```

### 2. Import / Extraction API
- **Endpoint:** `POST /api/upload/import`
- **Request:** `{ "rows": [ ... ] }` or Multipart file.
- **Process:** Batch rows (e.g., 10-20 per batch) and feed them to the LLM model (OpenAI/Gemini/Claude).
- **Response JSON:**
  ```json
  {
    "success": true,
    "summary": {
      "totalImported": 38,
      "totalSkipped": 7
    },
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
        "crm_note": "Client is asking to reschedule demo",
        "data_source": "",
        "possession_time": "",
        "description": ""
      }
    ],
    "skippedRecords": [
      {
        "rowNumber": 5,
        "reason": "Missing both email and mobile number",
        "rawData": { "name": "Sarah", "company": "No Contact Info" }
      }
    ]
  }
  ```

---

## 🧠 AI Prompting & Mapping Constraints

The AI backend service (`apps/api/src/services/ai`) must strictly map incoming un-structured columns into the standard GrowEasy CRM structure:

1. **CRM Status Enums:**
   - Must strictly resolve to: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`.
2. **Data Source Enums:**
   - Must strictly resolve to: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`.
   - If not confidently matching, set as an empty string `""`.
3. **Date Conversion:**
   - Map/normalize creation dates to ISO string or formats parseable by JS: `new Date(created_at)`.
4. **Notes/Remarks Aggregation:**
   - Use `crm_note` for extra phone numbers, extra email addresses, remarks, follow-up messages, or unmapped columns.
5. **Multiple Contacts Handling:**
   - Use the **first** email in the `email` field. Append any additional emails to the `crm_note`.
   - Use the **first** phone number in the `mobile_without_country_code` field. Append extra numbers to the `crm_note`.
6. **Skip Criterion:**
   - If a row has **neither** a valid email nor a valid mobile number, it MUST be skipped. Set `totalSkipped` accordingly.
7. **CSV Output Compatibility:**
   - Keep CSV values free of raw line breaks (`\n` or `\r\n`). Escape them as literal `\n` to prevent breaking CSV row alignments.