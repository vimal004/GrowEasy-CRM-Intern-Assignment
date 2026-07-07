import { z } from 'zod';
import { CRM_STATUSES, DATA_SOURCES } from '../constants/crm';

export const LeadCrmSchema = z.object({
  created_at: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'created_at must be a valid date string convertible via new Date()',
  }),
  name: z.string().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  country_code: z.string().default(''),
  mobile_without_country_code: z.string().default(''),
  company: z.string().default(''),
  city: z.string().default(''),
  state: z.string().default(''),
  country: z.string().default(''),
  lead_owner: z.string().default(''),
  crm_status: z.enum(CRM_STATUSES),
  crm_note: z.string().default(''),
  data_source: z.enum([...DATA_SOURCES, '']).default(''),
  possession_time: z.string().default(''),
  description: z.string().default(''),
}).refine((data) => {
  // Enforce field validation: skip records containing neither email nor mobile_without_country_code
  const hasEmail = data.email && data.email.trim() !== '';
  const hasMobile = data.mobile_without_country_code && data.mobile_without_country_code.trim() !== '';
  return hasEmail || hasMobile;
}, {
  message: 'Record must contain at least one contact method: email or mobile_without_country_code',
  path: ['email', 'mobile_without_country_code'],
});

export type LeadCrmInput = z.infer<typeof LeadCrmSchema>;
