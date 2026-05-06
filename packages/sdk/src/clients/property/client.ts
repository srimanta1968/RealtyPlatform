import type {
  ApiResponse,
  PropertyCreateRequest,
  PropertyRecord,
  PropertyStatus,
  PropertyType,
  PropertyUpdateRequest,
} from '@kiana/contracts';

import { HttpClient } from '../../core/http-client.js';
import { SdkError } from '../../core/errors.js';

export interface PropertyListFilter {
  type?: PropertyType;
  location?: string;
  price_min_minor?: number;
  price_max_minor?: number;
}

/**
 * SDK wrapper around property-service routes (Phase-1 Tasks 15-17).
 * The two admin-only endpoints (POST + PATCH) require the caller to
 * carry an admin JWT; the public list / detail / publish endpoints
 * do not.
 */
export class PropertyClient {
  constructor(private readonly http: HttpClient) {}

  /** POST /api/properties — admin creates a draft property. */
  async create(input: PropertyCreateRequest): Promise<PropertyRecord> {
    const response = await this.http.request<ApiResponse<{ property: PropertyRecord }>>(
      '/api/properties',
      { method: 'POST', body: input },
    );
    return unwrap(response).property;
  }

  /** PATCH /api/properties/:id — admin partial update. */
  async update(id: string, input: PropertyUpdateRequest): Promise<PropertyRecord> {
    const response = await this.http.request<ApiResponse<{ property: PropertyRecord }>>(
      `/api/properties/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: input },
    );
    return unwrap(response).property;
  }

  /** PATCH /api/properties/:id/publish — admin moves the publish state machine. */
  async publish(id: string, status: PropertyStatus = 'published'): Promise<PropertyRecord> {
    const response = await this.http.request<ApiResponse<{ property: PropertyRecord }>>(
      `/api/properties/${encodeURIComponent(id)}/publish`,
      { method: 'PATCH', body: { status } },
    );
    return unwrap(response).property;
  }

  /** GET /api/properties — public list of published properties (with filters). */
  async list(filter: PropertyListFilter = {}): Promise<PropertyRecord[]> {
    const params = new URLSearchParams();
    if (filter.type) params.set('type', filter.type);
    if (filter.location) params.set('location', filter.location);
    if (filter.price_min_minor !== undefined)
      params.set('price_min_minor', String(filter.price_min_minor));
    if (filter.price_max_minor !== undefined)
      params.set('price_max_minor', String(filter.price_max_minor));
    const qs = params.toString();
    const path = qs ? `/api/properties?${qs}` : '/api/properties';
    const response = await this.http.request<ApiResponse<{ properties: PropertyRecord[] }>>(
      path,
      { authenticated: false },
    );
    return unwrap(response).properties;
  }

  /** GET /api/properties/:slug — public property detail by URL slug. */
  async getBySlug(slug: string): Promise<PropertyRecord> {
    const response = await this.http.request<ApiResponse<{ property: PropertyRecord }>>(
      `/api/properties/${encodeURIComponent(slug)}`,
      { authenticated: false },
    );
    return unwrap(response).property;
  }
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new SdkError(response.error, 400, response);
  }
  return response.data;
}
