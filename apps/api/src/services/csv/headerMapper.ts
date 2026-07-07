/**
 * Helper to normalize key names by converting to lowercase and stripping non-alphanumeric characters.
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface DeterministicLead {
  created_at: string;
  name: string;
  emails: string[];
  mobiles: string[];
  company: string;
  city: string;
  state: string;
  country: string;
  country_code: string;
  lead_owner: string;
  crm_status: string;
  data_source: string;
  possession_time: string;
  description: string;
  crm_note: string;
  unmapped_data: Record<string, string>;
}

/**
 * Maps a raw CSV record to a standardized intermediate shape using deterministic matching rules.
 * 
 * @param row Raw CSV row key-value pairs.
 * @returns Standardized record structure.
 */
export function mapRowHeaders(row: Record<string, string>): DeterministicLead {
  const lead: DeterministicLead = {
    created_at: '',
    name: '',
    emails: [],
    mobiles: [],
    company: '',
    city: '',
    state: '',
    country: '',
    country_code: '',
    lead_owner: '',
    crm_status: '',
    data_source: '',
    possession_time: '',
    description: '',
    crm_note: '',
    unmapped_data: {},
  };

  const firstNames: string[] = [];
  const lastNames: string[] = [];
  const nameParts: string[] = [];

  for (const [rawKey, rawVal] of Object.entries(row)) {
    const val = (rawVal || '').trim();
    if (!val) continue;

    const normKey = normalizeKey(rawKey);

    // 1. Match Email
    if (
      normKey === 'email' ||
      normKey === 'emailaddress' ||
      normKey === 'emails' ||
      normKey === 'mailbox' ||
      normKey === 'primaryemail' ||
      normKey === 'contactemail' ||
      normKey === 'mail'
    ) {
      // Split comma/semicolon separated list
      const splitEmails = val.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
      lead.emails.push(...splitEmails);
    }
    // 2. Match Mobile/Phone
    else if (
      normKey === 'phone' ||
      normKey === 'phonenumber' ||
      normKey === 'phoneno' ||
      normKey === 'phnumber' ||
      normKey === 'mobile' ||
      normKey === 'mobiles' ||
      normKey === 'mobilenumber' ||
      normKey === 'mobilewithoutcountrycode' ||
      normKey === 'contact' ||
      normKey === 'contactnumber' ||
      normKey === 'contactphone' ||
      normKey === 'phno' ||
      normKey === 'phones' ||
      normKey === 'primaryphone' ||
      normKey === 'primarymobile' ||
      normKey === 'tel' ||
      normKey === 'telephone'
    ) {
      // Split comma/semicolon separated list
      const splitPhones = val.split(/[,;]+/).map(p => p.trim()).filter(Boolean);
      lead.mobiles.push(...splitPhones);
    }
    // 3. Match Country Code
    else if (
      normKey === 'countrycode' ||
      normKey === 'dialcode' ||
      normKey === 'phonecode'
    ) {
      lead.country_code = val;
    }
    // 4. Match Name variations
    else if (normKey === 'firstname' || normKey === 'fname' || normKey === 'first') {
      firstNames.push(val);
    } else if (normKey === 'lastname' || normKey === 'lname' || normKey === 'last') {
      lastNames.push(val);
    } else if (
      normKey === 'name' ||
      normKey === 'fullname' ||
      normKey === 'leadname' ||
      normKey === 'clientname' ||
      normKey === 'contactname' ||
      normKey === 'customername' ||
      normKey === 'username' ||
      normKey === 'lead'
    ) {
      nameParts.push(val);
    }
    // 5. Match Company
    else if (
      normKey === 'company' ||
      normKey === 'companyname' ||
      normKey === 'org' ||
      normKey === 'organization' ||
      normKey === 'business' ||
      normKey === 'employer'
    ) {
      lead.company = val;
    }
    // 6. Match City
    else if (normKey === 'city' || normKey === 'cityname' || normKey === 'town') {
      lead.city = val;
    }
    // 7. Match State
    else if (
      normKey === 'state' ||
      normKey === 'statecode' ||
      normKey === 'region' ||
      normKey === 'province'
    ) {
      lead.state = val;
    }
    // 8. Match Country
    else if (normKey === 'country' || normKey === 'countryregion' || normKey === 'nation') {
      lead.country = val;
    }
    // 9. Match Lead Owner
    else if (
      normKey === 'leadowner' ||
      normKey === 'owner' ||
      normKey === 'owneremail' ||
      normKey === 'assignee' ||
      normKey === 'agent' ||
      normKey === 'leadagent'
    ) {
      lead.lead_owner = val;
    }
    // 10. Match CRM Status
    else if (
      normKey === 'crmstatus' ||
      normKey === 'status' ||
      normKey === 'statustext' ||
      normKey === 'statuscode' ||
      normKey === 'leadstatus'
    ) {
      lead.crm_status = val;
    }
    // 11. Match Data Source
    else if (
      normKey === 'datasource' ||
      normKey === 'source' ||
      normKey === 'sourcechannel' ||
      normKey === 'channel'
    ) {
      lead.data_source = val;
    }
    // 12. Match Possession Time
    else if (
      normKey === 'possessiontime' ||
      normKey === 'possession' ||
      normKey === 'timeframe' ||
      normKey === 'possessiontimeframe' ||
      normKey === 'schedule'
    ) {
      lead.possession_time = val;
    }
    // 13. Match Description
    else if (
      normKey === 'description' ||
      normKey === 'shortdescription' ||
      normKey === 'desc' ||
      normKey === 'detail' ||
      normKey === 'details' ||
      normKey === 'comments' ||
      normKey === 'comment'
    ) {
      lead.description = val;
    }
    // 14. Match CRM Note
    else if (
      normKey === 'crmnote' ||
      normKey === 'note' ||
      normKey === 'notes' ||
      normKey === 'remarks' ||
      normKey === 'remark'
    ) {
      lead.crm_note = val;
    }
    // 15. Match Created At
    else if (
      normKey === 'createdat' ||
      normKey === 'created' ||
      normKey === 'date' ||
      normKey === 'datecreated' ||
      normKey === 'createddate' ||
      normKey === 'registrationdate' ||
      normKey === 'registered'
    ) {
      lead.created_at = val;
    }
    // Unmapped columns
    else {
      lead.unmapped_data[rawKey] = val;
    }
  }

  // Combine name fields
  if (firstNames.length > 0 || lastNames.length > 0) {
    const combined = [...firstNames, ...lastNames].join(' ').trim();
    if (combined) {
      lead.name = combined;
    }
  }

  // Fallback to nameParts if lead.name was not set
  if (!lead.name && nameParts.length > 0) {
    lead.name = nameParts.join(' ').trim();
  }

  // De-duplicate emails and mobiles while maintaining order
  lead.emails = Array.from(new Set(lead.emails));
  lead.mobiles = Array.from(new Set(lead.mobiles));

  return lead;
}
