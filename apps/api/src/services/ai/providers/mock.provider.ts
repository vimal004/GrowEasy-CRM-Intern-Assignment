import { LLMProvider } from './provider.interface';
import { RawExtractedLead } from '../../crm/mapper';
import { logger } from '../../../config/logger';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/g;

export class MockProvider implements LLMProvider {
  public readonly name = 'mock';

  public async extractLeads(
    records: any[],
    systemPrompt: string,
    extractionPromptTemplate: string
  ): Promise<string> {
    logger.info(`[MockProvider] Simulating extraction for batch of ${records.length} records...`);

    const extracted: RawExtractedLead[] = records.map((record) => {
      if (record && typeof record === 'object' && ('emails' in record || 'mobiles' in record)) {
        return {
          created_at: record.created_at || new Date().toISOString(),
          name: record.name || 'Unnamed Lead',
          emails: record.emails || [],
          mobiles: record.mobiles || [],
          company: record.company || 'N/A',
          city: record.city || 'N/A',
          state: record.state || 'N/A',
          country: record.country || 'N/A',
          country_code: record.country_code || '+91',
          lead_owner: record.lead_owner || 'system@groweasy.ai',
          crm_status: record.crm_status || '',
          data_source: record.data_source || '',
          possession_time: record.possession_time || '',
          description: record.description || '',
          crm_note: record.crm_note || '',
          unmapped_data: record.unmapped_data || {},
        };
      }

      // 1. Scan for emails and phone numbers across the entire row
      const allText = Object.entries(record || {})
        .map(([key, val]) => `${key}: ${val}`)
        .join(' | ');

      const emails = allText.match(EMAIL_REGEX) || [];
      const mobiles = allText.match(PHONE_REGEX) || [];

      // 2. Identify fields using column matches
      let name = '';
      let company = '';
      let city = '';
      let state = '';
      let country = '';
      let countryCode = '+91';
      let crmStatus = '';
      let dataSource = '';
      let leadOwner = '';
      let createdAt = new Date().toISOString();
      let possessionTime = '';
      let description = '';
      let crmNote = '';
      const unmappedData: Record<string, string> = {};

      for (const [key, val] of Object.entries(record || {})) {
        const cleanKey = key.toLowerCase().trim().replace(/[\s_-]+/g, '');
        const cleanVal = String(val || '').trim();

        if (!cleanVal) continue;

        if (cleanKey.includes('name')) {
          name = cleanVal;
        } else if (cleanKey.includes('company') || cleanKey.includes('org') || cleanKey.includes('business')) {
          company = cleanVal;
        } else if (cleanKey === 'city') {
          city = cleanVal;
        } else if (cleanKey === 'state' || cleanKey === 'region' || cleanKey === 'province') {
          state = cleanVal;
        } else if (cleanKey === 'country') {
          country = cleanVal;
        } else if (cleanKey === 'countrycode') {
          countryCode = cleanVal;
        } else if (cleanKey.includes('owner') || cleanKey.includes('assignee') || cleanKey.includes('agent')) {
          leadOwner = cleanVal;
        } else if (cleanKey.includes('possession') || cleanKey.includes('timeframe') || cleanKey.includes('schedule')) {
          possessionTime = cleanVal;
        } else if (cleanKey.includes('desc') || cleanKey.includes('detail') || cleanKey.includes('comment')) {
          description = cleanVal;
        } else if (cleanKey.includes('status')) {
          crmStatus = cleanVal;
        } else if (cleanKey.includes('source') || cleanKey.includes('channel')) {
          dataSource = cleanVal;
        } else if (cleanKey.includes('created') || cleanKey.includes('date')) {
          createdAt = cleanVal;
        } else if (cleanKey.includes('note')) {
          crmNote = cleanVal;
        } else {
          unmappedData[key] = cleanVal;
        }
      }

      return {
        created_at: createdAt,
        name: name || 'Unnamed Lead',
        emails,
        mobiles,
        company: company || 'N/A',
        city: city || 'N/A',
        state: state || 'N/A',
        country: country || 'N/A',
        country_code: countryCode,
        lead_owner: leadOwner || 'system@groweasy.ai',
        crm_status: crmStatus,
        data_source: dataSource,
        possession_time: possessionTime,
        description,
        crm_note: crmNote,
        unmapped_data: unmappedData,
      };
    });

    // Simulate standard model latency
    await new Promise((resolve) => setTimeout(resolve, 200));

    return JSON.stringify(extracted);
  }
}
