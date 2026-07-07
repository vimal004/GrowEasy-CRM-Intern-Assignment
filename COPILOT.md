# GitHub Copilot Workspace Context & Coding Instructions

This file guides GitHub Copilot in generating code suggestions that are compliant with the GrowEasy AI CSV Importer architecture and project settings.

---

## 🧭 Monorepo Context

GitHub Copilot should be aware of the following workspace directories:
- **`packages/shared`**: Houses shared business types, Zod schemas, and system constants.
- **`apps/api`**: Houses the Express server written in TypeScript.
- **`apps/web`**: Houses the Next.js frontend application.

When suggesting imports in the frontend or backend, prefer importing shared structures from the local path or workspace alias `@groweasy/shared` or relative monorepo directories:
- Shared types: `import type { Lead, CrmStatus } from 'packages/shared/src/types/lead'` or packages/shared alias.

---

## 💻 Code Style Guidelines for Copilot Suggestions

### 1. TypeScript Rules
- Always use explicit types for arguments, return values, and objects. Do not let Copilot fall back to `any`.
- Define type declarations using `interface` for components/data structures and `type` for unions/aliases.

### 2. Next.js 14 (App Router) React Conventions
- Components are **Server Components** by default. Only add `'use client'` at the absolute top of a file when hooks (e.g. `useState`, `useEffect`, `useContext`, or `useMutation`) are required.
- Standard imports styling:
  ```typescript
  import React, { useState } from 'react';
  import { useMutation } from '@tanstack/react-query';
  // Shared Package Imports
  import type { Lead } from '@groweasy/shared/types';
  // App Relative Imports
  import { Button } from '@/components/ui/button';
  ```

### 3. Express Controller Conventions
- Controllers must take `Request`, `Response`, and `NextFunction` from `express`.
- Utilize centralized middleware for request validation (using Zod validation files) and exception throwing.
- Example structure:
  ```typescript
  import { Request, Response, NextFunction } from 'express';
  import { parseCsv } from '@/services/csv/parser';
  import { HttpError } from '@/utils/errors';

  export async function handlePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new HttpError(400, 'No CSV file uploaded');
      }
      const data = await parseCsv(req.file.buffer);
      res.status(200).json({ success: true, ...data });
    } catch (error) {
      next(error);
    }
  }
  ```

---

## ⚠️ Special Project Constraints to Keep in Mind

1. **Skipped Rows:** Always filter and handle skipped records cleanly (records with neither email nor mobile must be excluded from successful maps).
2. **CRM Enums:** Check that status value suggestions match the allowed list: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`.
3. **Escaping String Newlines:** When formatting fields to output, replace literal newlines (`\n`) to prevent breaking CSV row formats.