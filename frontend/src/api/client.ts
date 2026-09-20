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

  return (await response.json()) as T;
}
