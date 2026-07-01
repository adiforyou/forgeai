import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  signup: (email: string, password: string, name?: string) =>
    api.post('/auth/signup', { email, password, name }),
  verifyOtp: (email: string, otp: string) =>
    api.post('/auth/verify-otp', { email, otp }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () =>
    api.get('/auth/me'),
  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),
};

// Settings API
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: any) => api.put('/settings', data),
  testKey: (provider: string) => api.post('/settings/test-key', { provider }),
};

// Repository API
export const repositoryApi = {
  list: (params?: any) => api.get('/repositories', { params }),
  create: (data: any) => api.post('/repositories', data),
  add: (data: any) => api.post('/repositories', data),
  get: (id: string) => api.get(`/repositories/${id}`),
  update: (id: string, data: any) => api.put(`/repositories/${id}`, data),
  delete: (id: string) => api.delete(`/repositories/${id}`),
  sync: (id: string) => api.post(`/repositories/${id}/sync`),
  fetchGithub: () => api.get('/repositories/fetch-github'),
  fetchGitlab: () => api.get('/repositories/fetch-gitlab'),
  fetchBitbucket: () => api.get('/repositories/fetch-bitbucket'),
};

// Pull Request API
export const pullRequestApi = {
  list: (params?: any) => api.get('/pull-requests', { params }),
  get: (id: string) => api.get(`/pull-requests/${id}`),
  review: (id: string, strategy?: string) =>
    api.post(`/pull-requests/${id}/review`, { strategy }),
};

// Review API
export const reviewApi = {
  list: (params?: any) => api.get('/reviews', { params }),
  get: (id: string) => api.get(`/reviews/${id}`),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  rerun: (id: string) => api.post(`/reviews/${id}/rerun`),
  manual: (data: any) => api.post('/reviews/manual', data),
};

// Analytics API
export const analyticsApi = {
  dashboard: (period?: string) =>
    api.get('/analytics/dashboard', { params: { period } }),
  costs: (startDate?: string, endDate?: string) =>
    api.get('/analytics/costs', { params: { startDate, endDate } }),
  trends: (period?: string) => api.get('/analytics/trends', { params: { period } }),
};
