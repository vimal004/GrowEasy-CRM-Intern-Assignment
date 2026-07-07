# Cursor Development Rules & Guidelines

Use these rules when programming in Cursor. They ensure a clean, high-performance, and beautifully designed application.

---

## 🏛️ Project Conventions & Tech Stack
- **Monorepo Structure:**
  - `apps/web`: Next.js 14 (App Router) using React 18, Tailwind CSS, and TanStack Query.
  - `apps/api`: Node.js, Express, TypeScript, and Winston Logger.
  - `packages/shared`: Common types, Zod validation schemas, and constants.
- **Languages:** TypeScript (strict mode: `noImplicitAny: true`, `strictNullChecks: true`).
- **Dependencies:** Never run `npm install` or `pnpm install` without checking and listing required packages in `packages/shared/package.json` or corresponding workspace packages first. Prefer existing packages.

---

## 🎨 Frontend Coding Standards (`apps/web`)

- **Component Creation:**
  - Save components under `apps/web/src/components` or feature-specific folders (e.g. `apps/web/src/features/upload`).
  - Use Functional Components with explicit TypeScript interface definitions.
  - Place `'use client'` strictly at the top of client-side components. Keep server components as the default.
- **Premium Design System:**
  - Do NOT build a basic layout. Use harmonized color palettes, sleek dark modes, gradients, and micro-animations.
  - Table preview MUST support sticky headers, horizontal and vertical scrolling, and be completely responsive.
  - Table virtualization (using `@tanstack/react-virtual` or similar) is highly recommended for handling large CSV files (> 5,000 rows).
  - Use custom fonts: Google Sans is included in `apps/web/src/assets/fonts/`. Define them in your Next.js font loader (`layout.tsx`).
- **State Management:**
  - Use TanStack Query (React Query) for API integrations (fetching previews and trigger imports).
  - Manage file upload preview states locally or through React Context if shared.

---

## ⚙️ Backend Coding Standards (`apps/api`)

- **Architecture:**
  - Follow the Controller-Service-Repository pattern.
  - Keep controllers thin; delegate logic to business services (e.g., CSV parsing service, AI extraction service).
  - Use central error handler middleware with specific HTTP exceptions (`HttpError`).
- **CSV Processing:**
  - Use a streaming parser (e.g., `csv-parser` or `fast-csv`) to avoid buffering very large files in memory.
  - Accept any valid column structure, parsing cells dynamically.
- **AI Processing:**
  - Batch records (e.g., in sizes of 10-25) to optimize tokens and API overhead.
  - Implement retry-on-rate-limit (exponential backoff) using the AI model client.
  - Restructure unstructured columns into strict target schemas using structured output (e.g., `response_format: { type: "json_object" }` or JSON schema formatting).

---

## 📄 File Organization Context

Always respect the following file layout:
```
.
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── app.ts            # Express app configuration
│   │       ├── server.ts         # Server entrypoint
│   │       ├── controllers/      # Route controllers (upload.controller.ts)
│   │       ├── routes/           # API routes (upload.routes.ts)
│   │       ├── services/         # Business logic (ai, csv, crm)
│   │       ├── validators/       # Request validation (upload.validator.ts)
│   │       └── config/           # App configuration (env.ts)
│   └── web/
│       └── src/
│           ├── app/              # Next.js App Router (layout.tsx, page.tsx)
│           ├── features/         # Features (upload, preview, results)
│           ├── services/         # API request clients (api.ts)
│           └── assets/           # Typography (fonts/)
└── packages/
    └── shared/
        └── src/
            ├── types/            # Shared interfaces (lead.ts)
            ├── schemas/          # Zod validation schemas (lead.ts)
            └── constants/        # CRM statuses/data sources (crm.ts)
```