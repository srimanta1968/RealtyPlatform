import { AuthClient, HttpClient, LeadClient, createBrowserTokenStorage } from '@kiana/sdk';
import type { LeadRecord, LeadSourceSummary } from '@kiana/contracts';

const http = new HttpClient({
  baseUrl: '',
  tokenStorage: createBrowserTokenStorage(),
});

export const authClient = new AuthClient(http);
export const leadClient = new LeadClient(http);

/** GET /api/leads — list every captured lead in creation-time order. */
export async function listLeads(): Promise<LeadRecord[]> {
  return leadClient.list();
}

/** GET /api/leads/:id — fetch a single captured lead. */
export async function fetchLead(id: string): Promise<LeadRecord> {
  return leadClient.get(id);
}

/** GET /api/leads/sources — catalog + per-source counts powering the inbox filter. */
export async function fetchLeadSources(): Promise<LeadSourceSummary> {
  return leadClient.listSources();
}
