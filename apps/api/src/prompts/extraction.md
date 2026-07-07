Map the following array of pre-mapped CSV records into a standardized JSON array of objects.

## Target Lead Schema
For each input record, output a JSON object with the following fields:
- `created_at` (string): Extracted creation date or timestamp. Keep/convert to JS new Date() parseable format if possible (or keep original).
- `name` (string): Full name of the lead.
- `emails` (array of strings): ALL email addresses found anywhere in the record (including notes, description, or unmapped_data).
- `mobiles` (array of strings): ALL phone numbers/mobiles found anywhere in the record (including notes, description, or unmapped_data).
- `company` (string): Company or organization name.
- `city` (string): City.
- `state` (string): State or region.
- `country` (string): Country.
- `country_code` (string): Phone country dial code (e.g. "+91" or "+1"), if present or identifiable.
- `lead_owner` (string): Email or name of the owner/assignee.
- `crm_status` (string): Lead status value (e.g. "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE").
- `data_source` (string): Source of the lead (e.g. "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots").
- `possession_time` (string): Information about possession time or timeframes.
- `description` (string): Summary description or comments.
- `crm_note` (string): Direct note/comment column value if any.
- `unmapped_data` (object): Map of any other key-value pairs from the record that did not map to the above fields.

## Mapping Instructions
1. **Pre-Mapped Headers:** The headers of the input records are already pre-mapped to standard schema fields where possible.
2. **Contact Extraction:** Inspect all fields (including notes, description, or metadata in `unmapped_data`) for emails or phone numbers. Combine them into the `emails` and `mobiles` arrays, preserving order.
3. **Date and Enum Normalization:** Standardize dates to be parseable by JavaScript's `new Date()`. Standardize status and source fields to match expected enum values if possible.
4. **Clean Unmapped Data:** Keep any remaining information in `unmapped_data` so no details are lost.
5. **Output Format:** You must output a JSON array of objects matching the length of the input batch.


Input raw records to process:
{{records}}
