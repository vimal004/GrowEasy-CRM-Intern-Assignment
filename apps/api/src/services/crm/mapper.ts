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

  const firstEmailRaw = (emails[0] || '').trim();
  const firstEmail = firstEmailRaw.split(/[,;\s]+/)[0]?.trim() || '';

  const firstPhoneRaw = (mobiles[0] || '').trim();
  const firstPhone = firstPhoneRaw.split(/[,;\/]+/)[0]?.trim() || '';

  const countryCode = (raw.country_code || '+91').trim();
  let cleanMobile = cleanMobileNumber(firstPhone, countryCode);

  // Defensive guard: a valid phone number (without country code) should be ≤ 15 digits.
  // Anything longer is almost certainly a concatenation artifact from the CSV.
  // Treat it as invalid to prevent corrupt data reaching the CRM.
  if (cleanMobile.length > 15) {
    logger.warn(
      `[Mapper] Row ${index}: Suspicious mobile "${cleanMobile}" (${cleanMobile.length} digits) — ` +
      `likely a concatenation artifact. Clearing field to prevent CRM data corruption.`
    );
    cleanMobile = '';
  }

  // Enforce skip: Skip rows containing no email AND no mobile phone number
  // Safety-net: also validate email format (must contain @ and a domain with a dot)
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasEmail = firstEmail !== '' && isValidEmail(firstEmail);
  const hasMobile = cleanMobile !== '';

  if (!hasEmail && !hasMobile) {
    return {
      lead: null,
      reason: `Skipped row ${index}: contains neither a valid email nor mobile number.`,
    };
  }

  // 2. Resolve and restrict Enums
  // The LLM prompt already performs fuzzy normalization; the mapper provides a robust
  // safety net for any values that slip through. If a value cannot be confidently mapped,
  // it returns "" (empty string) — never silently defaults to GOOD_LEAD_FOLLOW_UP.
  let crmStatus: CrmStatus | '' = '';
  if (raw.crm_status && raw.crm_status.trim() !== '') {
    // Normalize: uppercase, collapse spaces/underscores/hyphens to underscore
    const rawStatus = raw.crm_status.trim().toUpperCase().replace(/[\s_-]+/g, '_');
    if (CRM_STATUSES.includes(rawStatus as CrmStatus)) {
      crmStatus = rawStatus as CrmStatus;
    } else {
      // Safety-net fuzzy match using whole-word regex to avoid partial substring false positives
      // (e.g. "interest" must NOT match "interesting" or "not interested later")
      const sw = raw.crm_status.trim().toLowerCase();
      const hasWord = (word: string) => new RegExp(`\\b${word}\\b`).test(sw);

      if (
        hasWord('sale') || hasWord('done') || hasWord('close') || hasWord('closed') ||
        hasWord('sold') || hasWord('won') || hasWord('booked') || hasWord('converted')
      ) {
        crmStatus = 'SALE_DONE';
      } else if (
        hasWord('voicemail') || hasWord('unreachable') || hasWord('busy') ||
        sw.includes('did not') || sw.includes('not connect') || sw.includes('no answer') ||
        sw.includes('no response') || sw.includes('switched off')
      ) {
        crmStatus = 'DID_NOT_CONNECT';
      } else if (
        hasWord('junk') || hasWord('spam') || hasWord('fake') || hasWord('unqualified') ||
        sw.includes('bad lead') || sw.includes('not interested') || sw.includes('wrong number') ||
        sw.includes('invalid number')
      ) {
        crmStatus = 'BAD_LEAD';
      } else if (
        hasWord('good') || hasWord('warm') || hasWord('hot') || hasWord('callback') ||
        hasWord('prospect') || sw.includes('follow up') || sw.includes('follow-up') ||
        sw.includes('interested') && !sw.includes('not interested')
      ) {
        crmStatus = 'GOOD_LEAD_FOLLOW_UP';
      } else {
        // Cannot confidently map — return empty string per spec.
        // The LLM should have handled this; if it reaches here the value is truly unknown.
        crmStatus = '';
      }
    }
  }


  let dataSource: DataSource | '' = '';
  if (raw.data_source) {
    // Normalize: lowercase, collapse all non-alphanumeric (spaces, hyphens, underscores) to underscore
    const rawSource = raw.data_source.trim().toLowerCase().replace(/[\s_\-\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (DATA_SOURCES.includes(rawSource as DataSource)) {
      dataSource = rawSource as DataSource;
    } else {
      // Fuzzy: try stripping down further for partial matches (e.g. "sarjapur plots" → "sarjapur_plots")
      const candidate = DATA_SOURCES.find((src) => {
        const normSrc = src.replace(/_/g, '');
        const normRaw = rawSource.replace(/_/g, '');
        return normSrc === normRaw || normSrc.includes(normRaw) || normRaw.includes(normSrc);
      });
      if (candidate) {
        dataSource = candidate;
      }
      // Otherwise returns empty string as per spec
    }
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

