The previous output was invalid JSON or did not conform to the expected schema. 

## Target Lead Schema
The output must be a valid JSON array of objects, where each object has these fields:
- `created_at` (string)
- `name` (string)
- `emails` (array of strings)
- `mobiles` (array of strings)
- `company` (string)
- `city` (string)
- `state` (string)
- `country` (string)
- `country_code` (string)
- `lead_owner` (string)
- `crm_status` (string)
- `data_source` (string)
- `possession_time` (string)
- `description` (string)
- `crm_note` (string)
- `unmapped_data` (object)

## Validation Errors
The validation failed with the following error:
{{errors}}

## Original Output
Here is the original output that was generated:
{{originalOutput}}

Please repair the JSON. Your response must contain ONLY the valid, repaired JSON array of objects. Do NOT wrap it in code blocks. Do NOT provide explanations.
