/**
 * AI Gateway client — placeholder for Phase 1. The real implementation
 * lands alongside `services/ai-gateway` in Phase 6 (per Project-Structure
 * and Architecture docs).
 */

export type RouteHint = 'cheap' | 'balanced' | 'high_quality';

export interface InvokeOptions {
  prompt: string;
  promptId: string;
  routeHint?: RouteHint;
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface InvokeResult {
  content: string;
  promptId: string;
  routeHint: RouteHint;
  costUsd: number;
  latencyMs: number;
}

export interface AIClient {
  invoke(options: InvokeOptions): Promise<InvokeResult>;
}

export interface CreateAIClientOptions {
  gatewayUrl: string;
  apiKey: string;
}

export function createAIClient(_options: CreateAIClientOptions): AIClient {
  return {
    async invoke(_invokeOptions) {
      throw new Error(
        'AI Gateway is not yet wired up — see services/ai-gateway (Phase 6 in Project-Structure.md).',
      );
    },
  };
}
