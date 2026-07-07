Here are examples of how to map input CSV records to standard JSON output. Study these carefully — they demonstrate messy real-world inputs being mapped to the strict GrowEasy CRM schema.

IMPORTANT: These examples show the expected JSON directly — no markdown code fences, no explanation text. Your output must look exactly like the OUTPUT sections below.

---

EXAMPLE 1: Clean lead with standard headers

INPUT (array of 1 record):
[{"Date Created": "2026-05-12T10:00:00Z", "Full Name": "John Doe", "Email Address": "john.doe@example.com", "Phone": "+91 9876543210", "Organization": "Acme Corp", "City": "Mumbai", "State": "Maharashtra", "Country": "India", "Lead Agent": "agent@groweasy.ai", "Status Code": "GOOD_LEAD_FOLLOW_UP", "Source": "leads_on_demand", "Possession": "Ready to move"}]

OUTPUT:
[{"created_at": "2026-05-12T10:00:00.000Z", "name": "John Doe", "emails": ["john.doe@example.com"], "mobiles": ["9876543210"], "company": "Acme Corp", "city": "Mumbai", "state": "Maharashtra", "country": "India", "country_code": "+91", "lead_owner": "agent@groweasy.ai", "crm_status": "GOOD_LEAD_FOLLOW_UP", "data_source": "leads_on_demand", "possession_time": "Ready to move", "description": "", "crm_note": "", "unmapped_data": {}}]

---

EXAMPLE 2: Messy lead with non-standard headers and multiple contacts

INPUT (array of 1 record):
[{"created": "13/05/2026", "first_name": "Alice", "last_name": "Smith", "contact_info": "alice@gmail.com, alternative: alice.smith@work.com", "mobile": "9988776655", "home_phone": "022-1234567", "company_name": "Globex", "location": "Bangalore, Karnataka", "source_channel": "meridian_tower", "notes": "Spoke on call. Prefers 2BHK."}]

OUTPUT:
[{"created_at": "2026-05-13T00:00:00.000Z", "name": "Alice Smith", "emails": ["alice@gmail.com", "alice.smith@work.com"], "mobiles": ["9988776655", "022-1234567"], "company": "Globex", "city": "Bangalore", "state": "Karnataka", "country": "", "country_code": "+91", "lead_owner": "", "crm_status": "", "data_source": "meridian_tower", "possession_time": "", "description": "Spoke on call. Prefers 2BHK.", "crm_note": "Spoke on call. Prefers 2BHK.", "unmapped_data": {"location": "Bangalore, Karnataka"}}]

---

EXAMPLE 3: Lead with fuzzy status/source values requiring normalization

INPUT (array of 1 record):
[{"Date_Registered": "15/05/2026", "Client_Name": "Ravi Kumar", "MailBox": "ravi@outlook.com", "Ph_No": "+91-9876500001", "Org": "TechCorp", "CityName": "Hyderabad", "StateCode": "TG", "StatusText": "did not answer", "SourceChannel": "Sarjapur Plots"}]

OUTPUT:
[{"created_at": "2026-05-15T00:00:00.000Z", "name": "Ravi Kumar", "emails": ["ravi@outlook.com"], "mobiles": ["9876500001"], "company": "TechCorp", "city": "Hyderabad", "state": "TG", "country": "", "country_code": "+91", "lead_owner": "", "crm_status": "DID_NOT_CONNECT", "data_source": "sarjapur_plots", "possession_time": "", "description": "", "crm_note": "", "unmapped_data": {}}]

---

EXAMPLE 4: Lead with NO contact info — still include in output with empty arrays

CRITICAL RULE: Even when a record has no emails and no phones, you MUST still include it in the output array. Do NOT omit the record. Return it with empty emails: [] and mobiles: []. The downstream system is responsible for skipping it.

INPUT (array of 1 record):
[{"created": "14/05/2026", "first_name": "No", "last_name": "Contact", "company_name": "Missing Corp", "location": "Delhi"}]

OUTPUT:
[{"created_at": "2026-05-14T00:00:00.000Z", "name": "No Contact", "emails": [], "mobiles": [], "company": "Missing Corp", "city": "Delhi", "state": "", "country": "", "country_code": "", "lead_owner": "", "crm_status": "", "data_source": "", "possession_time": "", "description": "", "crm_note": "", "unmapped_data": {"location": "Delhi"}}]

---

EXAMPLE 5: Batch of 2 records — output must match input count exactly

INPUT (array of 2 records):
[{"name": "Priya Sharma", "email": "priya@example.com", "phone": "9000011111", "status": "interested customer", "source": "facebook ads"}, {"name": "Vikram Singh", "email": "vikram@example.com", "phone": "9000022222", "status": "junk lead", "source": "eden park"}]

OUTPUT:
[{"created_at": "", "name": "Priya Sharma", "emails": ["priya@example.com"], "mobiles": ["9000011111"], "company": "", "city": "", "state": "", "country": "", "country_code": "+91", "lead_owner": "", "crm_status": "GOOD_LEAD_FOLLOW_UP", "data_source": "", "possession_time": "", "description": "", "crm_note": "", "unmapped_data": {}}, {"created_at": "", "name": "Vikram Singh", "emails": ["vikram@example.com"], "mobiles": ["9000022222"], "company": "", "city": "", "state": "", "country": "", "country_code": "+91", "lead_owner": "", "crm_status": "BAD_LEAD", "data_source": "eden_park", "possession_time": "", "description": "", "crm_note": "", "unmapped_data": {}}]
