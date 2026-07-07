import { CrmStatus, DataSource } from '../constants/crm';

export interface LeadCrm {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | '';
  crm_note: string;
  data_source: DataSource | '';
  possession_time: string;
  description: string;
}

export interface CSVMetadata {
  fileName: string;
  fileSize: number;
  rowCount: number;
  columnCount: number;
  uploadTime: string;
  headers: string[];
}

export interface ImportResult {
  importedRecords: LeadCrm[];
  skippedRecords: Array<{
    rowIndex: number;
    reason: string;
    rawRecord: Record<string, string>;
  }>;
  metrics: {
    importedCount: number;
    skippedCount: number;
    successRate: number; // percentage
    processingTimeMs: number;
  };
}
