/**
 * Branded ID types — opaque string aliases the compiler refuses to mix up.
 * UserId is not assignable to LeadId even though both are strings at runtime.
 */
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type LeadId = Brand<string, 'LeadId'>;
export type PropertyId = Brand<string, 'PropertyId'>;
export type VisitId = Brand<string, 'VisitId'>;
export type CampaignId = Brand<string, 'CampaignId'>;
export type WorkflowId = Brand<string, 'WorkflowId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type EventId = Brand<string, 'EventId'>;

export const asUserId = (raw: string): UserId => raw as UserId;
export const asLeadId = (raw: string): LeadId => raw as LeadId;
export const asPropertyId = (raw: string): PropertyId => raw as PropertyId;
export const asVisitId = (raw: string): VisitId => raw as VisitId;
export const asCampaignId = (raw: string): CampaignId => raw as CampaignId;
export const asWorkflowId = (raw: string): WorkflowId => raw as WorkflowId;
export const asDocumentId = (raw: string): DocumentId => raw as DocumentId;
export const asSessionId = (raw: string): SessionId => raw as SessionId;
export const asEventId = (raw: string): EventId => raw as EventId;
