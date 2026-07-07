import Papa from 'papaparse';
import { LeadCrm, CSVMetadata, ImportResult, CrmStatus, DataSource } from '@groweasy/shared';

// Regular expressions for matching emails and mobile numbers
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,4}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,6}/g;

export const CRM_STATUS_VALUES: CrmStatus[] = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
];

export const DATA_SOURCE_VALUES: DataSource[] = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
];

export interface ProcessingUpdate {
  stage: string;
  progress: number;
  processedCount: number;
  estimatedRemainingSeconds: number;
  log?: string;
  result?: ImportResult;
}

/**
 * Parses the raw file content and returns metadata along with a preview of the first few rows
 */
export function parseCsvPreview(file: File): Promise<{ metadata: CSVMetadata; previewRows: any[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        reject(new Error('Empty file content'));
        return;
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rows = results.data;
          const metadata: CSVMetadata = {
            fileName: file.name,
            fileSize: file.size,
            rowCount: rows.length,
            columnCount: headers.length,
            uploadTime: new Date().toISOString(),
            headers,
          };

          // Return preview of first 15 rows
          const previewRows = rows.slice(0, 15);
          resolve({ metadata, previewRows });
        },
        error: (err) => {
          reject(new Error(`CSV parsing failed: ${err.message}`));
        },
      });
    };

    reader.onerror = () => {
      reject(new Error('File reading error'));
    };

    reader.readAsText(file);
  });
}

/**
 * Normalizes a lead row into GrowEasy CRM format according to the rules:
 * 1. Extract first email and first mobile, pushing extras into crm_note.
 * 2. Validate enums (crm_status, data_source).
 * 3. Escape line breaks to single-row compatibility.
 * 4. Format created_at to a valid Date ISO string.
 * 5. If neither email nor mobile is present, returns null (to be skipped).
 */
export function normalizeRecord(
  rawRow: Record<string, string>,
  index: number
): { lead: LeadCrm | null; reason?: string } {
  // 1. Gather all values and scan for contact details
  const allText = Object.entries(rawRow)
    .map(([key, val]) => `${key}: ${val}`)
    .join(' | ');

  const emailsFound = allText.match(EMAIL_REGEX) || [];
  const phonesFound = allText.match(PHONE_REGEX) || [];

  const firstEmail = emailsFound[0] || '';
  const firstPhone = phonesFound[0] || '';

  // Enforce skip: If neither email nor mobile_without_country_code is present
  if (!firstEmail && !firstPhone) {
    return {
      lead: null,
      reason: 'No email or mobile number found in the record',
    };
  }

  // 2. Identify and normalize specific CRM fields from headers
  let name = '';
  let company = '';
  let city = '';
  let state = '';
  let country = '';
  let countryCode = '+91'; // Default
  let crmStatus: CrmStatus = 'GOOD_LEAD_FOLLOW_UP'; // Default
  let dataSource: DataSource | '' = '';
  let leadOwner = 'system@groweasy.ai';
  let createdAtStr = new Date().toISOString();
  let possessionTime = '';
  let description = '';
  const unmappedData: Record<string, string> = {};

  // Simple key mapping lookup
  for (const [key, val] of Object.entries(rawRow)) {
    const cleanKey = key.toLowerCase().trim().replace(/[\s_-]+/g, '');
    const cleanVal = (val || '').trim();

    if (!cleanVal) continue;

    if (cleanKey.includes('name')) {
      name = cleanVal;
    } else if (cleanKey.includes('company') || cleanKey.includes('org')) {
      company = cleanVal;
    } else if (cleanKey === 'city') {
      city = cleanVal;
    } else if (cleanKey === 'state' || cleanKey === 'region') {
      state = cleanVal;
    } else if (cleanKey === 'country') {
      country = cleanVal;
    } else if (cleanKey === 'countrycode') {
      countryCode = cleanVal;
    } else if (cleanKey.includes('owner') || cleanKey.includes('assignee')) {
      leadOwner = cleanVal;
    } else if (cleanKey.includes('possession') || cleanKey.includes('time')) {
      possessionTime = cleanVal;
    } else if (cleanKey.includes('desc')) {
      description = cleanVal;
    } else if (cleanKey.includes('status')) {
      // Map to correct enum
      const upperVal = cleanVal.toUpperCase().replace(/[\s_-]+/g, '_');
      if (CRM_STATUS_VALUES.includes(upperVal as CrmStatus)) {
        crmStatus = upperVal as CrmStatus;
      } else {
        // Fallback matching
        if (upperVal.includes('SALE') || upperVal.includes('DONE') || upperVal.includes('CLOSE')) {
          crmStatus = 'SALE_DONE';
        } else if (upperVal.includes('BAD') || upperVal.includes('JUNK') || upperVal.includes('SPAM')) {
          crmStatus = 'BAD_LEAD';
        } else if (upperVal.includes('NOT') || upperVal.includes('BUSY') || upperVal.includes('NO_ANSWER')) {
          crmStatus = 'DID_NOT_CONNECT';
        } else {
          crmStatus = 'GOOD_LEAD_FOLLOW_UP';
        }
      }
    } else if (cleanKey.includes('source')) {
      // Map to correct source
      const lowerVal = cleanVal.toLowerCase().replace(/[\s_-]+/g, '_');
      if (DATA_SOURCE_VALUES.includes(lowerVal as DataSource)) {
        dataSource = lowerVal as DataSource;
      } else {
        dataSource = ''; // Unmatched falls back to empty string
      }
    } else if (cleanKey.includes('created')) {
      // Parse date safely
      const parsedDate = Date.parse(cleanVal);
      if (!isNaN(parsedDate)) {
        createdAtStr = new Date(parsedDate).toISOString();
      }
    } else {
      // Keep track of unmapped info
      unmappedData[key] = cleanVal;
    }
  }

  // 3. Compile crm_note (extras + unmapped fields)
  const notesParts: string[] = [];

  // Add extra emails if any
  if (emailsFound.length > 1) {
    notesParts.push(`Extra Emails: ${emailsFound.slice(1).join(', ')}`);
  }

  // Add extra phones if any
  if (phonesFound.length > 1) {
    notesParts.push(`Extra Phones: ${phonesFound.slice(1).join(', ')}`);
  }

  // Add original note if present
  const originalNote = rawRow['crm_note'] || rawRow['note'] || rawRow['notes'] || '';
  if (originalNote) {
    notesParts.push(`Original Note: ${originalNote}`);
  }

  // Add other unmapped key-value pairs
  if (Object.keys(unmappedData).length > 0) {
    notesParts.push(
      `Metadata: [${Object.entries(unmappedData)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}]`
    );
  }

  // Escape any raw line breaks in the notes or description to avoid breaking CSV formatting later
  const escapeString = (str: string) => str.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\\n');

  const crmNote = escapeString(notesParts.join(' | '));
  const finalDescription = escapeString(description);

  // Clean country code from first phone number if present
  let cleanMobile = firstPhone;
  if (cleanMobile.startsWith(countryCode)) {
    cleanMobile = cleanMobile.substring(countryCode.length).trim();
  }
  // Strip non-digit characters for standard mobile representation
  cleanMobile = cleanMobile.replace(/\D/g, '');

  const lead: LeadCrm = {
    created_at: createdAtStr,
    name: name || 'Unnamed Lead',
    email: firstEmail,
    country_code: countryCode,
    mobile_without_country_code: cleanMobile,
    company: company || 'N/A',
    city: city || 'N/A',
    state: state || 'N/A',
    country: country || 'N/A',
    lead_owner: leadOwner,
    crm_status: crmStatus,
    crm_note: crmNote,
    data_source: dataSource,
    possession_time: possessionTime,
    description: finalDescription,
  };

  return { lead };
}

/**
 * Simulates import processing in a step-by-step batch wizard, providing status updates
 */
export function simulateImport(
  file: File,
  onUpdate: (update: ProcessingUpdate) => void
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        reject(new Error('Empty file content'));
        return;
      }

      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: async (results) => {
          const rawRows = results.data as Record<string, string>[];
          const totalRows = rawRows.length;

          // Simulated stages and progress weights
          const stages = [
            { name: 'Uploading CSV file...', duration: 600, weight: 10 },
            { name: 'Parsing raw columns...', duration: 500, weight: 20 },
            { name: 'Normalizing column mappings...', duration: 700, weight: 35 },
            { name: 'Extracting and de-duplicating leads (AI)...', duration: 1500, weight: 70 },
            { name: 'Validating CRM target constraints...', duration: 800, weight: 85 },
            { name: 'Compiling import metrics...', duration: 500, weight: 95 },
            { name: 'Finalizing CRM data import...', duration: 400, weight: 100 },
          ];

          const startTime = Date.now();
          const importedRecords: LeadCrm[] = [];
          const skippedRecords: ImportResult['skippedRecords'] = [];

          // Process records
          rawRows.forEach((row, index) => {
            const { lead, reason } = normalizeRecord(row, index);
            if (lead) {
              importedRecords.push(lead);
            } else {
              skippedRecords.push({
                rowIndex: index + 1,
                reason: reason || 'Unknown reason',
                rawRecord: row,
              });
            }
          });

          const metrics = {
            importedCount: importedRecords.length,
            skippedCount: skippedRecords.length,
            successRate: totalRows > 0 ? Math.round((importedRecords.length / totalRows) * 100) : 0,
            processingTimeMs: 0,
          };

          const finalResult: ImportResult = {
            importedRecords,
            skippedRecords,
            metrics,
          };

          // Step through stages with visual delay
          for (let i = 0; i < stages.length; i++) {
            const stage = stages[i];
            const remainingStages = stages.length - 1 - i;
            const avgRemainingMs = remainingStages * 700;

            onUpdate({
              stage: stage.name,
              progress: stage.weight,
              processedCount: Math.round((stage.weight / 100) * totalRows),
              estimatedRemainingSeconds: Math.max(1, Math.round(avgRemainingMs / 1000)),
              log: `[${new Date().toLocaleTimeString()}] Stage ${i + 1}/${stages.length}: ${stage.name}`,
            });

            // If it's the AI mapping stage, simulate batch-by-batch progress
            if (stage.name.includes('Extracting and de-duplicating')) {
              const batchSize = Math.max(5, Math.floor(totalRows / 5));
              const totalBatches = Math.ceil(totalRows / batchSize);
              
              for (let b = 1; b <= totalBatches; b++) {
                const batchProgress = stage.weight + ((b / totalBatches) * 15);
                const recordsProcessed = Math.min(totalRows, b * batchSize);

                onUpdate({
                  stage: stage.name,
                  progress: Math.min(84, Math.round(batchProgress)),
                  processedCount: recordsProcessed,
                  estimatedRemainingSeconds: Math.max(1, Math.round((avgRemainingMs * (1 - b / totalBatches)) / 1000)),
                  log: `[${new Date().toLocaleTimeString()}] AI Batch ${b}/${totalBatches} complete (${recordsProcessed}/${totalRows} rows)`,
                });
                
                await new Promise((r) => setTimeout(r, stage.duration / totalBatches));
              }
            } else {
              await new Promise((r) => setTimeout(r, stage.duration));
            }
          }

          const endTime = Date.now();
          finalResult.metrics.processingTimeMs = endTime - startTime;

          // Send final completion update
          onUpdate({
            stage: 'Import completed successfully!',
            progress: 100,
            processedCount: totalRows,
            estimatedRemainingSeconds: 0,
            log: `[${new Date().toLocaleTimeString()}] Import complete. Imported: ${metrics.importedCount}, Skipped: ${metrics.skippedCount}`,
            result: finalResult,
          });

          resolve(finalResult);
        },
        error: (err) => {
          reject(new Error(`CSV processing error: ${err.message}`));
        },
      });
    };

    reader.onerror = () => {
      reject(new Error('File reading error'));
    };

    reader.readAsText(file);
  });
}
