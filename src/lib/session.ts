export const TOKEN_KEY = 'wms_token';
export const API_BASE_KEY = 'wms_api_base';

export const defaultApiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredApiBase(): string {
  if (typeof window === 'undefined') return defaultApiBase;
  return window.localStorage.getItem(API_BASE_KEY) ?? defaultApiBase;
}

export function setStoredApiBase(apiBase: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(API_BASE_KEY, apiBase);
}
