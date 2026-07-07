Map the following array of raw CSV records into a standardized JSON array of objects.

## Target Lead Schema
For each input record, output a JSON object with the following fields:
- `created_at` (string): Extracted creation date or timestamp.
- `name` (string): Full name of the lead.
- `emails` (array of strings): ALL email addresses found anywhere in the record.
- `mobiles` (array of strings): ALL phone numbers/mobiles found anywhere in the record.
- `company` (string): Company or organization name.
- `city` (string): City.
- `state` (string): State or region.
- `country` (string): Country.
- `country_code` (string): Phone country dial code (e.g. "+91" or "+1"), if present or identifiable.
- `lead_owner` (string): Email or name of the owner/assignee.
- `crm_status` (string): Lead status value.
- `data_source` (string): Source of the lead.
- `possession_time` (string): Information about possession time or timeframes.
- `description` (string): Summary description or comments.
- `crm_note` (string): Direct note/comment column value if any.
- `unmapped_data` (object): Map of any other key-value pairs from the record that did not map to the above fields.

## Mapping Instructions
1. **Semantic Matching:** Match columns dynamically (e.g. `Ph. Number`, `Contact`, `Phone` -> `mobiles`; `First Name` + `Last Name` -> `name`).
2. **Contact Extraction:** Inspect all fields (including notes or metadata) for emails or phone numbers using standard regex pattern matching. Collect them into `emails` and `mobiles` arrays.
3. **Clean Unmapped Data:** Keep any remaining information in `unmapped_data` so no user details are lost.
4. **Output Format:** You must output a JSON array of objects matching the length of the input batch.

Input raw records to process:
{{records}}
