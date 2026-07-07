import test from 'node:test';
import assert from 'node:assert';
import { parseCsv } from '../../apps/api/src/services/csv/parser';
import { normalizeRecord } from '../../apps/api/src/services/csv/normalizer';
import {
  escapeLineBreaks,
  escapeCsvInjection,
  cleanMobileNumber,
  formatDate,
} from '../../apps/api/src/services/crm/formatter';
import { mapToCrmLead, RawExtractedLead } from '../../apps/api/src/services/crm/mapper';
import { chunkArray } from '../../apps/api/src/services/ai/batch.service';
import { mapRowHeaders } from '../../apps/api/src/services/csv/headerMapper';


test('CSV Parser - parseCsv', async () => {
  const csvBuffer = Buffer.from(
    `Name,Email,Phone,Company\r\n` +
    `"John Doe","john@example.com","+91 9876543210","Acme Corp"\r\n` +
    `"Jane Smith","jane@example.com","1234567",""`
  );

  const parsed = await parseCsv(csvBuffer);
  
  assert.strictEqual(parsed.length, 2);
  assert.strictEqual(parsed[0].Name, 'John Doe');
  assert.strictEqual(parsed[0].Email, 'john@example.com');
  assert.strictEqual(parsed[0].Phone, '+91 9876543210');
  assert.strictEqual(parsed[0].Company, 'Acme Corp');
  assert.strictEqual(parsed[1].Name, 'Jane Smith');
  assert.strictEqual(parsed[1].Company, '');
});

test('CSV Normalizer - normalizeRecord', () => {
  const rawRow = {
    '  Full Name  ': ' John Doe  ',
    'Email ': 'john@example.com',
    '': 'empty key',
  };

  const normalized = normalizeRecord(rawRow);
  
  assert.strictEqual(normalized['Full Name'], 'John Doe');
  assert.strictEqual(normalized['Email'], 'john@example.com');
  assert.strictEqual(normalized[''], undefined);
});

test('CRM Formatter - escapeLineBreaks', () => {
  const text = 'Line 1\r\nLine 2\nLine 3';
  const escaped = escapeLineBreaks(text);
  assert.strictEqual(escaped, 'Line 1\\nLine 2\\nLine 3');
});

test('CRM Formatter - escapeCsvInjection', () => {
  assert.strictEqual(escapeCsvInjection('=SUM(A1:A5)'), "'=SUM(A1:A5)");
  assert.strictEqual(escapeCsvInjection('+1234'), "'+1234");
  assert.strictEqual(escapeCsvInjection('-abc'), "'-abc");
  assert.strictEqual(escapeCsvInjection('@check'), "'@check");
  assert.strictEqual(escapeCsvInjection('normal text'), 'normal text');
});

test('CRM Formatter - cleanMobileNumber', () => {
  assert.strictEqual(cleanMobileNumber('+91 98765-43210', '+91'), '9876543210');
  assert.strictEqual(cleanMobileNumber('98765 43210', '91'), '9876543210');
  assert.strictEqual(cleanMobileNumber('1-800-555-0199', '1'), '8005550199');
});

test('CRM Formatter - formatDate', () => {
  const valid = formatDate('2026-05-13');
  assert.ok(!isNaN(Date.parse(valid)));

  const dotSeparated = formatDate('13.05.2026');
  assert.strictEqual(new Date(dotSeparated).getUTCFullYear(), 2026);
  assert.strictEqual(new Date(dotSeparated).getUTCMonth(), 4); // May is 4 (0-indexed)
  assert.strictEqual(new Date(dotSeparated).getUTCDate(), 13);

  const epochDate = formatDate('1778747448000');
  assert.strictEqual(new Date(epochDate).getTime(), 1778747448000);

  const invalid = formatDate('invalid-date');
  assert.ok(!isNaN(Date.parse(invalid))); // Fallback to current time
});

test('CRM Lead Mapper - mapToCrmLead', () => {
  const rawLead: RawExtractedLead = {
    created_at: '2026-05-13',
    name: 'John Doe',
    emails: ['john@example.com', 'john.alternative@example.com'],
    mobiles: ['+91 9876543210', '9988776655'],
    company: 'Acme Corp',
    city: 'Mumbai',
    crm_status: 'GOOD_LEAD_FOLLOW_UP',
    data_source: 'leads_on_demand',
    unmapped_data: { 'Extra Field': 'val' },
  };

  const { lead, reason } = mapToCrmLead(rawLead, 1);
  
  assert.ok(lead);
  assert.strictEqual(reason, undefined);
  assert.strictEqual(lead.name, 'John Doe');
  assert.strictEqual(lead.email, 'john@example.com');
  assert.strictEqual(lead.mobile_without_country_code, '9876543210');
  assert.strictEqual(lead.company, 'Acme Corp');
  assert.strictEqual(lead.crm_status, 'GOOD_LEAD_FOLLOW_UP');
  assert.strictEqual(lead.data_source, 'leads_on_demand');
  
  // Verify de-duplication moves extras and metadata into crm_note
  assert.ok(lead.crm_note.includes('john.alternative@example.com'));
  assert.ok(lead.crm_note.includes('9988776655'));
  assert.ok(lead.crm_note.includes('Extra Field: val'));
});

test('CRM Lead Mapper - mapToCrmLead Skip Criteria', () => {
  const invalidLead: RawExtractedLead = {
    name: 'No Contacts',
    emails: [],
    mobiles: [],
  };

  const { lead, reason } = mapToCrmLead(invalidLead, 2);
  assert.strictEqual(lead, null);
  assert.ok(reason?.includes('neither a valid email nor mobile number'));
});

test('Batch Service - chunkArray', () => {
  const items = [1, 2, 3, 4, 5];
  const chunks = chunkArray(items, 2);
  
  assert.strictEqual(chunks.length, 3);
  assert.deepStrictEqual(chunks[0], [1, 2]);
  assert.deepStrictEqual(chunks[1], [3, 4]);
  assert.deepStrictEqual(chunks[2], [5]);
});

test('Header Mapper - mapRowHeaders', () => {
  const rawRow = {
    'Client_Name': 'John Smith',
    'MailBox': 'john.smith@example.com, alt@example.com',
    'Ph_No': '+91 9988776655; 1234567',
    'Org': 'Tech Corp',
    'CityName': 'Mumbai',
    'StateCode': 'MH',
    'CountryRegion': 'India',
    'OwnerEmail': 'owner@groweasy.ai',
    'StatusText': 'GOOD_LEAD_FOLLOW_UP',
    'SourceChannel': 'leads_on_demand',
    'PossessionTimeframe': '6 months',
    'ShortDescription': 'Interested in 2BHK',
    'Extra Column': 'value',
  };

  const mapped = mapRowHeaders(rawRow);

  assert.strictEqual(mapped.name, 'John Smith');
  assert.deepStrictEqual(mapped.emails, ['john.smith@example.com', 'alt@example.com']);
  assert.deepStrictEqual(mapped.mobiles, ['+91 9988776655', '1234567']);
  assert.strictEqual(mapped.company, 'Tech Corp');
  assert.strictEqual(mapped.city, 'Mumbai');
  assert.strictEqual(mapped.state, 'MH');
  assert.strictEqual(mapped.country, 'India');
  assert.strictEqual(mapped.lead_owner, 'owner@groweasy.ai');
  assert.strictEqual(mapped.crm_status, 'GOOD_LEAD_FOLLOW_UP');
  assert.strictEqual(mapped.data_source, 'leads_on_demand');
  assert.strictEqual(mapped.possession_time, '6 months');
  assert.strictEqual(mapped.description, 'Interested in 2BHK');
  assert.strictEqual(mapped.unmapped_data['Extra Column'], 'value');
});

test('Header Mapper - mapRowHeaders Name combination', () => {
  const rawRow = {
    'first_name': 'John',
    'last_name': 'Doe',
    'email': 'john@example.com',
  };
  const mapped = mapRowHeaders(rawRow);
  assert.strictEqual(mapped.name, 'John Doe');
});

