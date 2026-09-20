import { apiClient, validateResponseShape } from './client';
import { mockService } from '../mocks/mockService';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CoachRequest,
  CoachResponse,
  CompleteRequest,
  CustomRoleRequest,
  CustomRoleResponse,
  EvalReport,
  Health,
  KnownRequest,
  MarketUpdateRequest,
  ProfileInput,
  ProfileResponse,
  ProgressResponse,
  RolesResponse,
  TodayResponse,
} from '../types/api';

const isMock = (): boolean => import.meta.env.VITE_USE_MOCK === 'true';

async function callWithFallback<T>(
  apiFn: () => Promise<T>,
  mockFn: () => Promise<T>,
  shapeKey?: string
): Promise<T> {
  if (isMock()) {
    const res = await mockFn();
    if (shapeKey) validateResponseShape(shapeKey, res);
    return res;
  }
  try {
    return await apiFn();
  } catch (err) {
    console.warn(`[CareerTwin Fallback] API request failed, serving from mock service:`, err);
    const res = await mockFn();
    if (shapeKey) validateResponseShape(shapeKey, res);
    return res;
  }
}

// Endpoint 1: GET /health
export async function getHealth(): Promise<Health> {
  return callWithFallback(
    () => apiClient<Health>('/health', { method: 'GET' }),
    () => mockService.getHealth(),
    '/health'
  );
}

// Endpoint 2: GET /roles
export async function getRoles(): Promise<RolesResponse> {
  return callWithFallback(
    () => apiClient<RolesResponse>('/roles', { method: 'GET' }),
    () => mockService.getRoles(),
    '/roles'
  );
}

// Endpoint 3: POST /roles/custom
export async function createCustomRole(data: CustomRoleRequest): Promise<CustomRoleResponse> {
  return callWithFallback(
    () => apiClient<CustomRoleResponse>('/roles/custom', { method: 'POST', body: data }),
    () => mockService.createCustomRole(data),
    '/roles/custom'
  );
}

// Endpoint 4: POST /profile
export async function createProfile(
  data: ProfileInput,
  resumeFile?: File | Blob
): Promise<ProfileResponse> {
  const submitApi = async () => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(data));
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }
    return apiClient<ProfileResponse>('/profile', {
      method: 'POST',
      formData,
    });
  };

  return callWithFallback(
    submitApi,
    () => mockService.createProfile(data, resumeFile),
    '/profile'
  );
}

// Endpoint 5: GET /profile
export async function getProfile(): Promise<ProfileResponse> {
  return callWithFallback(
    () => apiClient<ProfileResponse>('/profile', { method: 'GET' }),
    () => mockService.getProfile(),
    '/profile'
  );
}

// Endpoint 6: POST /analyze
export async function analyzeProfile(data: AnalyzeRequest): Promise<AnalyzeResponse> {
  return callWithFallback(
    () => apiClient<AnalyzeResponse>('/analyze', { method: 'POST', body: data }),
    () => mockService.analyzeProfile(data),
    '/analyze'
  );
}

// Endpoint 7: GET /roadmap
export async function getRoadmap(): Promise<AnalyzeResponse> {
  return callWithFallback(
    () => apiClient<AnalyzeResponse>('/roadmap', { method: 'GET' }),
    () => mockService.getRoadmap(),
    '/roadmap'
  );
}

// Endpoint 8: POST /progress/complete
export async function completeProgress(data: CompleteRequest): Promise<ProgressResponse> {
  return callWithFallback(
    () => apiClient<ProgressResponse>('/progress/complete', { method: 'POST', body: data }),
    () => mockService.completeProgress(data),
    '/progress/complete'
  );
}

// Endpoint 9: POST /progress/known
export async function markKnown(data: KnownRequest): Promise<ProgressResponse> {
  return callWithFallback(
    () => apiClient<ProgressResponse>('/progress/known', { method: 'POST', body: data }),
    () => mockService.markKnown(data),
    '/progress/known'
  );
}

// Endpoint 10: GET /today
export async function getToday(): Promise<TodayResponse> {
  return callWithFallback(
    () => apiClient<TodayResponse>('/today', { method: 'GET' }),
    () => mockService.getToday(),
    '/today'
  );
}

// Endpoint 11: POST /market/update
export async function updateMarket(data: MarketUpdateRequest): Promise<ProgressResponse> {
  return callWithFallback(
    () => apiClient<ProgressResponse>('/market/update', { method: 'POST', body: data }),
    () => mockService.updateMarket(data),
    '/market/update'
  );
}

// Endpoint 12: POST /coach
export async function sendCoachMessage(data: CoachRequest): Promise<CoachResponse> {
  return callWithFallback(
    () => apiClient<CoachResponse>('/coach', { method: 'POST', body: data }),
    () => mockService.sendCoachMessage(data),
    '/coach'
  );
}

// Endpoint 13: GET /eval/report
export async function getEvalReport(): Promise<EvalReport> {
  return callWithFallback(
    () => apiClient<EvalReport>('/eval/report', { method: 'GET' }),
    () => mockService.getEvalReport(),
    '/eval/report'
  );
}
