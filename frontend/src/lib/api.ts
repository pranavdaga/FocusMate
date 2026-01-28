/**
 * API Client
 * Axios instance with base URL and JWT interceptor
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add JWT token
api.interceptors.request.use(
    (config) => {
        // Only run in browser
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/auth/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth API functions
export const authApi = {
    register: (data: { username: string; email: string; password: string }) =>
        api.post('/api/auth/register', data),

    login: (data: { email: string; password: string }) =>
        api.post('/api/auth/login', data),

    getMe: () => api.get('/api/auth/me')
};

// Room API functions
export const roomApi = {
    create: (data: { name: string }) =>
        api.post('/api/rooms', data),

    getAll: () =>
        api.get('/api/rooms'),

    getOne: (roomId: string) =>
        api.get(`/api/rooms/${roomId}`),

    join: (roomId: string) =>
        api.post(`/api/rooms/${roomId}/join`)
};

export default api;
