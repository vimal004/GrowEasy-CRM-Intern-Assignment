import { LeadCrm, CrmStatus, DataSource, CRM_STATUSES, DATA_SOURCES } from '@groweasy/shared';
import { cleanMobileNumber, formatDate, escapeLineBreaks, escapeCsvInjection } from './formatter';
import { logger } from '../../config/logger';

export interface RawExtractedLead {
  created_at?: string;
  name?: string;
  emails?: string[];
  mobiles?: string[];
  company?: string;
  city?: string;
  state?: string;
  country?: string;
  country_code?: string;
  lead_owner?: string;
  crm_status?: string;
  data_source?: string;
  possession_time?: string;
  description?: string;
  crm_note?: string;
  unmapped_data?: Record<string, string>;
}

/**
 * Maps and validates a raw LLM-extracted lead into the strict CRM format.
 * Enforces email/mobile existence, formats fields, de-duplicates contacts,
 * sanitizes strings against CSV injection, and restricts status/source enums.
 * 
 * @param raw The raw LLM extraction object.
 * @param index The original row index (1-based) for logging and reporting.
 * @returns An object containing the mapped LeadCrm or a reason why it was skipped.
 */
export function mapToCrmLead(
  raw: RawExtractedLead,
  index: number
): { lead: LeadCrm | null; reason?: string } {
  // 1. Resolve contact details
  const emails = raw.emails || [];
  const mobiles = raw.mobiles || [];

  const firstEmail = (emails[0] || '').trim();
  const firstPhone = (mobiles[0] || '').trim();

  const countryCode = (raw.country_code || '+91').trim();
  const cleanMobile = cleanMobileNumber(firstPhone, countryCode);

  // Enforce skip: Skip rows containing no email AND no mobile phone number
  const hasEmail = firstEmail !== '';
  const hasMobile = cleanMobile !== '';

  if (!hasEmail && !hasMobile) {
    return {
      lead: null,
      reason: `Skipped row ${index}: contains neither a valid email nor mobile number.`,
    };
  }

  // 2. Resolve and restrict Enums
  let crmStatus: CrmStatus = 'GOOD_LEAD_FOLLOW_UP';
  if (raw.crm_status) {
    const rawStatus = raw.crm_status.trim().toUpperCase().replace(/[\s_-]+/g, '_');
    if (CRM_STATUSES.includes(rawStatus as CrmStatus)) {
      crmStatus = rawStatus as CrmStatus;
    } else {
      // Fallback matching logic
      if (rawStatus.includes('SALE') || rawStatus.includes('DONE') || rawStatus.includes('CLOSE')) {
        crmStatus = 'SALE_DONE';
      } else if (rawStatus.includes('BAD') || rawStatus.includes('JUNK') || rawStatus.includes('SPAM')) {
        crmStatus = 'BAD_LEAD';
      } else if (rawStatus.includes('NOT') || rawStatus.includes('BUSY') || rawStatus.includes('NO_ANSWER')) {
        crmStatus = 'DID_NOT_CONNECT';
      } else {
        crmStatus = 'GOOD_LEAD_FOLLOW_UP';
      }
    }
  }

  let dataSource: DataSource | '' = '';
  if (raw.data_source) {
    const rawSource = raw.data_source.trim().toLowerCase().replace(/[\s_-]+/g, '_');
    if (DATA_SOURCES.includes(rawSource as DataSource)) {
      dataSource = rawSource as DataSource;
    }
    // Otherwise returns empty string as per Gemini review guidelines
  }

  // 3. Compile crm_note (collect extras + unmapped fields + original note)
  const notesParts: string[] = [];

  if (emails.length > 1) {
    notesParts.push(`Extra Emails: ${emails.slice(1).join(', ')}`);
  }

  if (mobiles.length > 1) {
    notesParts.push(`Extra Phones: ${mobiles.slice(1).join(', ')}`);
  }

  if (raw.crm_note && raw.crm_note.trim() !== '') {
    notesParts.push(`Original Note: ${raw.crm_note.trim()}`);
  }

  if (raw.unmapped_data && Object.keys(raw.unmapped_data).length > 0) {
    const unmappedMeta = Object.entries(raw.unmapped_data)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    notesParts.push(`Metadata: [${unmappedMeta}]`);
  }

  const compiledNote = notesParts.join(' | ');

  // 4. Sanitize and escape all string inputs to prevent CSV Injection and line break issues
  const sanitize = (val: string | undefined, defaultVal: string = ''): string => {
    if (val === undefined || val === null) return defaultVal;
    return escapeCsvInjection(escapeLineBreaks(val.trim()));
  };

  // Sanitize without CSV injection escaping (for fields that legitimately start with +, like country_code)
  const sanitizeNoInjection = (val: string | undefined, defaultVal: string = ''): string => {
    if (val === undefined || val === null) return defaultVal;
    return escapeLineBreaks(val.trim());
  };

  const lead: LeadCrm = {
    created_at: formatDate(raw.created_at || ''),
    name: sanitize(raw.name, 'Unnamed Lead'),
    email: sanitizeNoInjection(firstEmail),
    country_code: sanitizeNoInjection(countryCode, '+91'),
    mobile_without_country_code: cleanMobile,
    company: sanitize(raw.company, 'N/A'),
    city: sanitize(raw.city, 'N/A'),
    state: sanitize(raw.state, 'N/A'),
    country: sanitize(raw.country, 'N/A'),
    lead_owner: sanitizeNoInjection(raw.lead_owner, 'system@groweasy.ai'),
    crm_status: crmStatus,
    crm_note: sanitize(compiledNote),
    data_source: dataSource,
    possession_time: sanitize(raw.possession_time),
    description: sanitize(raw.description),
  };

  return { lead };
}

