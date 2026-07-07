Map the following array of pre-mapped CSV records into a standardized JSON array of objects.

## Target Lead Schema
For each input record, output a JSON object with ALL of the following fields:
- `created_at` (string): Extracted creation date or timestamp. Convert to JavaScript new Date() parseable ISO format if possible. Common formats to handle: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD, "May 15 2026", "15-May-2026", Unix epoch milliseconds. If empty or truly unparseable, return "".
- `name` (string): Full name. If first_name and last_name exist as separate fields, concatenate them with a space.
- `emails` (array of strings): ALL email addresses found ANYWHERE in the record — in any field value including notes, description, metadata, or unmapped_data. Split comma/semicolon separated lists. Preserve order (primary email first).
- `mobiles` (array of strings): ALL phone numbers found ANYWHERE in the record. Include mobile, landline, WhatsApp, fax, alternate numbers. Split comma/semicolon/slash separated lists. Preserve order (primary number first).
- `company` (string): Company or organization name.
- `city` (string): City name.
- `state` (string): State or region or province.
- `country` (string): Country name.
- `country_code` (string): Phone dial prefix (e.g. "+91", "+1"). Infer from context if clearly identifiable (e.g., Indian mobile numbers).
- `lead_owner` (string): Email or name of the assigned owner or agent.
- `crm_status` (string): Lead status. Map fuzzy/natural language values to the EXACT enum values below:
  - "GOOD_LEAD_FOLLOW_UP" — for: interested, follow up, warm lead, prospect, hot lead, callback requested
  - "DID_NOT_CONNECT" — for: no answer, did not connect, busy, unreachable, switched off, voicemail, not reachable, no response
  - "BAD_LEAD" — for: junk, bad lead, spam, invalid number, wrong number, fake, not interested, unqualified
  - "SALE_DONE" — for: sale done, sold, closed, deal done, converted, booked, won
  - "" (empty string) — for: any value that does NOT clearly match the above categories. Do NOT guess. Return "" if uncertain.
- `data_source` (string): Source of the lead. Map to EXACT enum values:
  - "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots"
  - Return "" (empty string) if the value does not clearly match any of these. Do NOT guess or invent values.
- `possession_time` (string): Possession timeframe or schedule.
- `description` (string): Summary description, comments, or notes about the lead.
- `crm_note` (string): The direct value of any note/remarks/crm_note column.
- `unmapped_data` (object): Key-value map of any remaining fields that did not map to the above fields. Do not discard data.

## Mapping Instructions
1. **Aggressive Contact Scanning:** Scan every single field value for emails (pattern: x@y.z) and phone numbers (pattern: sequences of digits with optional +, -, spaces, parentheses). Do not miss contacts hidden in notes or metadata.
2. **Fuzzy Header Matching:** Recognize non-standard column names. Examples: "Ph. Number" → mobiles, "MailBox" → emails, "Client_Name" → name, "Date_Registered" → created_at, "Org" → company, "CityName" → city, "StatusText" → crm_status, "SourceChannel" → data_source.
3. **Date Normalization:** Convert all recognized date formats to ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ). For DD/MM/YYYY, treat the first part as day. For ambiguous formats where both values ≤ 12 (e.g. 05/06/2026), assume DD/MM/YYYY (day first).
4. **Strict Enum Enforcement:** For crm_status and data_source, ONLY use the allowed values listed above. Return "" if you cannot confidently map the value. Never invent or hallucinate enum values.
5. **No Data Loss:** Keep all extra fields in `unmapped_data` so no lead information is lost.
6. **Output Count:** You MUST output exactly one JSON object per input record. If a record has no contacts, still output it with empty arrays — the downstream system decides to skip it.

Input raw records to process:
{{records}}
