import type { ApiResponse, WorkflowDefinition, WorkflowSummary } from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export class WorkflowClient {
  constructor(private readonly http: HttpClient) {}

  /** GET /api/workflows — catalog of every business workflow defined on the platform. */
  async list(): Promise<WorkflowSummary[]> {
    const response = await this.http.request<ApiResponse<{ workflows: WorkflowSummary[] }>>(
      '/api/workflows',
    );
    return unwrap(response).workflows;
  }

  /** GET /api/workflows/:slug — full definition (including steps[]) for one workflow. */
  async get(slug: string): Promise<WorkflowDefinition> {
    const response = await this.http.request<ApiResponse<{ workflow: WorkflowDefinition }>>(
      `/api/workflows/${encodeURIComponent(slug)}`,
    );
    return unwrap(response).workflow;
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
