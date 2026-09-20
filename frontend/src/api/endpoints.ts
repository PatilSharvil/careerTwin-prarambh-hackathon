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

// Endpoint 1: GET /health
export async function getHealth(): Promise<Health> {
  if (isMock()) {
    const res = await mockService.getHealth();
    validateResponseShape('/health', res);
    return res;
  }
  return apiClient<Health>('/health', { method: 'GET' });
}

// Endpoint 2: GET /roles
export async function getRoles(): Promise<RolesResponse> {
  if (isMock()) {
    const res = await mockService.getRoles();
    validateResponseShape('/roles', res);
    return res;
  }
  return apiClient<RolesResponse>('/roles', { method: 'GET' });
}

// Endpoint 3: POST /roles/custom
export async function createCustomRole(data: CustomRoleRequest): Promise<CustomRoleResponse> {
  if (isMock()) {
    const res = await mockService.createCustomRole(data);
    validateResponseShape('/roles/custom', res);
    return res;
  }
  return apiClient<CustomRoleResponse>('/roles/custom', {
    method: 'POST',
    body: data,
  });
}

// Endpoint 4: POST /profile
export async function createProfile(
  data: ProfileInput,
  resumeFile?: File | Blob
): Promise<ProfileResponse> {
  if (isMock()) {
    const res = await mockService.createProfile(data, resumeFile);
    validateResponseShape('/profile', res);
    return res;
  }

  const formData = new FormData();
  formData.append('data', JSON.stringify(data));
  if (resumeFile) {
    formData.append('resume', resumeFile);
  }

  return apiClient<ProfileResponse>('/profile', {
    method: 'POST',
    formData,
  });
}

// Endpoint 5: GET /profile
export async function getProfile(): Promise<ProfileResponse> {
  if (isMock()) {
    const res = await mockService.getProfile();
    validateResponseShape('/profile', res);
    return res;
  }
  return apiClient<ProfileResponse>('/profile', { method: 'GET' });
}

// Endpoint 6: POST /analyze
export async function analyzeProfile(data: AnalyzeRequest): Promise<AnalyzeResponse> {
  if (isMock()) {
    const res = await mockService.analyzeProfile(data);
    validateResponseShape('/analyze', res);
    return res;
  }
  return apiClient<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: data,
  });
}

// Endpoint 7: GET /roadmap
export async function getRoadmap(): Promise<AnalyzeResponse> {
  if (isMock()) {
    const res = await mockService.getRoadmap();
    validateResponseShape('/roadmap', res);
    return res;
  }
  return apiClient<AnalyzeResponse>('/roadmap', { method: 'GET' });
}

// Endpoint 8: POST /progress/complete
export async function completeProgress(data: CompleteRequest): Promise<ProgressResponse> {
  if (isMock()) {
    const res = await mockService.completeProgress(data);
    validateResponseShape('/progress/complete', res);
    return res;
  }
  return apiClient<ProgressResponse>('/progress/complete', {
    method: 'POST',
    body: data,
  });
}

// Endpoint 9: POST /progress/known
export async function markKnown(data: KnownRequest): Promise<ProgressResponse> {
  if (isMock()) {
    const res = await mockService.markKnown(data);
    validateResponseShape('/progress/known', res);
    return res;
  }
  return apiClient<ProgressResponse>('/progress/known', {
    method: 'POST',
    body: data,
  });
}

// Endpoint 10: GET /today
export async function getToday(): Promise<TodayResponse> {
  if (isMock()) {
    const res = await mockService.getToday();
    validateResponseShape('/today', res);
    return res;
  }
  return apiClient<TodayResponse>('/today', { method: 'GET' });
}

// Endpoint 11: POST /market/update
export async function updateMarket(data: MarketUpdateRequest): Promise<ProgressResponse> {
  if (isMock()) {
    const res = await mockService.updateMarket(data);
    validateResponseShape('/market/update', res);
    return res;
  }
  return apiClient<ProgressResponse>('/market/update', {
    method: 'POST',
    body: data,
  });
}

// Endpoint 12: POST /coach
export async function sendCoachMessage(data: CoachRequest): Promise<CoachResponse> {
  if (isMock()) {
    const res = await mockService.sendCoachMessage(data);
    validateResponseShape('/coach', res);
    return res;
  }
  return apiClient<CoachResponse>('/coach', {
    method: 'POST',
    body: data,
  });
}

// Endpoint 13: GET /eval/report
export async function getEvalReport(): Promise<EvalReport> {
  if (isMock()) {
    const res = await mockService.getEvalReport();
    validateResponseShape('/eval/report', res);
    return res;
  }
  return apiClient<EvalReport>('/eval/report', { method: 'GET' });
}
