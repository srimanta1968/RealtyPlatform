export const LeadStage = {
  NEW: 'new',
  QUALIFIED: 'qualified',
  CONTACTED: 'contacted',
  VISIT_SCHEDULED: 'visit_scheduled',
  VISIT_COMPLETED: 'visit_completed',
  NEGOTIATION: 'negotiation',
  CONVERTED: 'converted',
  LOST: 'lost',
} as const;
export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

export const VisitStatus = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus];

export const Channel = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
} as const;
export type Channel = (typeof Channel)[keyof typeof Channel];

export const UserRole = {
  ADMIN: 'admin',
  PRESALES: 'presales',
  FIELD_AGENT: 'field_agent',
  MARKETER: 'marketer',
  CUSTOMER: 'customer',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
