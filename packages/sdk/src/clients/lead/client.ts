import type {
  ApiResponse,
  LeadCreateRequest,
  LeadRecord,
  LeadSourceSummary,
} from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export class LeadClient {
  constructor(private readonly http: HttpClient) {}

  /** POST /api/leads — capture a new lead. */
  async create(input: LeadCreateRequest): Promise<LeadRecord> {
    const response = await this.http.request<ApiResponse<{ lead: LeadRecord }>>('/api/leads', {
      method: 'POST',
      body: input,
      authenticated: false,
    });
    return unwrap(response).lead;
  }

  /** GET /api/leads — list leads (paginated; cursor support added later). */
  async list(): Promise<LeadRecord[]> {
    const response = await this.http.request<ApiResponse<{ leads: LeadRecord[] }>>('/api/leads');
    return unwrap(response).leads;
  }

  /** GET /api/leads/:id — fetch a single lead. */
  async get(id: string): Promise<LeadRecord> {
    const response = await this.http.request<ApiResponse<{ lead: LeadRecord }>>(
      `/api/leads/${encodeURIComponent(id)}`,
    );
    return unwrap(response).lead;
  }

  /** GET /api/leads/sources — catalog of supported sources + per-source lead counts. */
  async listSources(): Promise<LeadSourceSummary> {
    const response = await this.http.request<ApiResponse<LeadSourceSummary>>(
      '/api/leads/sources',
      { authenticated: false },
    );
    return unwrap(response);
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
