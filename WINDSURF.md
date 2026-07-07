# Windsurf Code Execution Rules & Guidelines

Use these rules when implementing tasks in the Windsurf editor. They ensure proper terminal command execution and strict alignment with the GrowEasy monorepo architecture.

---

## 🚀 Running Windsurf Commands

- **Package Manager:** Strictly use **pnpm**. Do not run `npm` or `yarn` commands.
- **Service Invocation:**
  - Build command: `pnpm build`
  - Dev command: `pnpm dev`
  - Linting: `pnpm lint`
- **Dependency Checks:** Check if a package is already defined in `packages/shared/package.json` before trying to install it. Never run arbitrary install scripts.

---

## 🏛️ Application Architecture Guidelines

### 1. File Distribution
- Code sharing: Move constants (like statuses and sources), Zod validator schemas, and models to `packages/shared/src` to avoid duplicating them between `apps/web` and `apps/api`.
- Client and Server code: Inside `apps/web`, keep files clean. Next.js components must state `'use client'` only where necessary.

### 2. CSV Importer API Flow
- **Preview Handler (`POST /api/upload/preview`):**
  - Parses uploaded CSV content dynamically.
  - Returns headers list and raw record preview (first few rows). No LLM operations allowed.
- **Import Handler (`POST /api/upload/import`):**
  - Parses all rows and performs LLM extraction in parallel batches.
  - Applies a retry mechanism with exponential backoff on API rate limits (HTTP 429).
  - Skips invalid rows (lacking both email and phone number).
  - Normalizes fields to the CRM structure.

### 3. CRM Extraction Enums & Guidelines
- Status Enums: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`.
- Data Source Enums: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots`.
- Contact deduplication: Use the first contact address (email/mobile) and aggregate extra numbers or unmapped headers into `crm_note`.
- Prevent broken CSV exports: Replace raw carriage returns and newlines (`\n`, `\r\n`) with escaped literals `\n` in database outputs.

---

## 🎨 UI/UX Requirements
- Design is highly prioritized. Implement a beautiful dark-mode-first aesthetic with Google Fonts/Google Sans typography.
- Preview tables must support horizontal scrolling, vertical scrolling, and sticky headers.
- Provide incremental loading indicators to update users on batch processing imports.