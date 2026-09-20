import type { ApiErrorEnvelope, ErrorCode } from '../types/api';

export class ApiError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>;
  status: number;

  constructor(code: ErrorCode, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  formData?: FormData;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Required keys map for development contract drift detection (SPEC §10.2 / §10.3)
const EXPECTED_RESPONSE_KEYS: Record<string, string[]> = {
  '/health': ['status', 'version', 'llm', 'chroma', 'db'],
  '/roles': ['roles'],
  '/roles/custom': ['role', 'meta'],
  '/profile': ['profile', 'meta'],
  '/analyze': ['role', 'analysis', 'roadmap', 'meta'],
  '/roadmap': ['role', 'analysis', 'roadmap', 'meta'],
  '/progress/complete': ['state', 'diff', 'narrative', 'narrative_source', 'meta'],
  '/progress/known': ['state', 'diff', 'narrative', 'narrative_source', 'meta'],
  '/today': ['today', 'message', 'meta'],
  '/market/update': ['state', 'diff', 'narrative', 'narrative_source', 'meta'],
  '/coach': ['reply', 'tool_calls', 'state_changed', 'meta'],
  '/eval/report': ['generated_at', 'summary', 'metrics', 'personas', 'adk'],
};

export function validateResponseShape(endpoint: string, data: unknown): void {
  // Run ONLY in development mode (SPEC §10 development response shape checks)
  if (!import.meta.env.DEV) return;
  if (!data || typeof data !== 'object') return;

  // Normalize endpoint string (remove leading slash or query params for matching)
  const normalized = '/' + endpoint.replace(/^\//, '').split('?')[0];
  const requiredKeys = EXPECTED_RESPONSE_KEYS[normalized];

  if (requiredKeys) {
    const obj = data as Record<string, unknown>;
    const missingKeys = requiredKeys.filter((key) => !(key in obj));
    if (missingKeys.length > 0) {
      console.warn(
        `[API Contract Drift Warning] Endpoint "${normalized}" is missing required key(s): ${missingKeys
          .map((k) => `"${k}"`)
          .join(', ')}`,
        data
      );
    }
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  const headers: Record<string, string> = {
    'X-User-Id': 'demo',
    ...options.headers,
  };

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  });

  if (!response.ok) {
    let errorEnvelope: ApiErrorEnvelope | null = null;
    try {
      errorEnvelope = (await response.json()) as ApiErrorEnvelope;
    } catch {
      // Fallback if not valid JSON
    }

    if (errorEnvelope?.error) {
      throw new ApiError(
        errorEnvelope.error.code,
        errorEnvelope.error.message,
        response.status,
        errorEnvelope.error.details
      );
    }

    throw new ApiError(
      'INTERNAL_ERROR',
      `HTTP error ${response.status}: ${response.statusText}`,
      response.status
    );
  }

  const data = (await response.json()) as T;

  // Perform dev-mode response shape checks
  validateResponseShape(endpoint, data);

  return data;
}
