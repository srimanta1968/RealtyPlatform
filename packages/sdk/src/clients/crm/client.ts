import type { ApiResponse } from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export interface PipelineLeadCard {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  stage: string;
  source: string;
  owner_id: string | null;
  updated_at: string;
}

export interface PipelineColumn {
  stage: string;
  count: number;
  cards: PipelineLeadCard[];
}

export interface PipelineKanban {
  total_leads: number;
  columns: PipelineColumn[];
}

export interface PipelineQuery {
  owner_id?: string;
  per_stage_limit?: number;
}

/**
 * SDK wrapper around crm-service's kanban aggregation (Phase-1 Task 21).
 * The endpoint is read-only and returns one column per LeadStage with
 * the most-recent N cards; pass owner_id to scope to a single
 * presales user (powers the admin-cockpit's "My pipeline" toggle).
 */
export class CrmClient {
  constructor(private readonly http: HttpClient) {}

  async getKanban(query: PipelineQuery = {}): Promise<PipelineKanban> {
    const params = new URLSearchParams();
    if (query.owner_id) params.set('owner_id', query.owner_id);
    if (query.per_stage_limit !== undefined) {
      params.set('per_stage_limit', String(query.per_stage_limit));
    }
    const qs = params.toString();
    const path = qs ? `/api/crm/pipeline?${qs}` : '/api/crm/pipeline';
    const response = await this.http.request<ApiResponse<PipelineKanban>>(path);
    return unwrap(response);
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
