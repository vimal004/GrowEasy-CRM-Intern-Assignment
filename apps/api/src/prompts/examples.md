Here are examples of how to map input CSV records to standard JSON output.

### Example 1: Clean Lead
**Input:**
```json
{
  "Date Created": "2026-05-12T10:00:00Z",
  "Full Name": "John Doe",
  "Email Address": "john.doe@example.com",
  "Phone": "+91 9876543210",
  "Organization": "Acme Corp",
  "City": "Mumbai",
  "State": "Maharashtra",
  "Country": "India",
  "Lead Agent": "agent@groweasy.ai",
  "Status Code": "GOOD_LEAD_FOLLOW_UP",
  "Source": "leads_on_demand",
  "Possession": "Ready to move"
}
```

**Output:**
```json
[
  {
    "created_at": "2026-05-12T10:00:00Z",
    "name": "John Doe",
    "emails": ["john.doe@example.com"],
    "mobiles": ["+91 9876543210"],
    "company": "Acme Corp",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "country_code": "+91",
    "lead_owner": "agent@groweasy.ai",
    "crm_status": "GOOD_LEAD_FOLLOW_UP",
    "data_source": "leads_on_demand",
    "possession_time": "Ready to move",
    "description": "",
    "crm_note": "",
    "unmapped_data": {}
  }
]
```

### Example 2: Messy Lead with Multiple Contacts
**Input:**
```json
{
  "created": "13/05/2026",
  "first_name": "Alice",
  "last_name": "Smith",
  "contact_info": "alice@gmail.com, alternative: alice.smith@work.com",
  "mobile": "9988776655",
  "home_phone": "022-1234567",
  "company_name": "Globex",
  "location": "Bangalore, Karnataka",
  "source_channel": "meridian_tower",
  "notes": "Spoke on call. Prefers 2BHK."
}
```

**Output:**
```json
[
  {
    "created_at": "13/05/2026",
    "name": "Alice Smith",
    "emails": ["alice@gmail.com", "alice.smith@work.com"],
    "mobiles": ["9988776655", "022-1234567"],
    "company": "Globex",
    "city": "Bangalore",
    "state": "Karnataka",
    "country": "India",
    "country_code": "+91",
    "lead_owner": "",
    "crm_status": "",
    "data_source": "meridian_tower",
    "possession_time": "",
    "description": "Prefers 2BHK.",
    "crm_note": "Spoke on call. Prefers 2BHK.",
    "unmapped_data": {
      "location": "Bangalore, Karnataka"
    }
  }
]
```

### Example 3: Lead with No Contact Info (Must still be returned by LLM, but will have empty email/mobile lists)
**Input:**
```json
{
  "created": "14/05/2026",
  "first_name": "No",
  "last_name": "Contact",
  "company_name": "Missing Corp",
  "location": "Delhi"
}
```

**Output:**
```json
[
  {
    "created_at": "14/05/2026",
    "name": "No Contact",
    "emails": [],
    "mobiles": [],
    "company": "Missing Corp",
    "city": "Delhi",
    "state": "",
    "country": "",
    "country_code": "",
    "lead_owner": "",
    "crm_status": "",
    "data_source": "",
    "possession_time": "",
    "description": "",
    "crm_note": "",
    "unmapped_data": {}
  }
]
```

