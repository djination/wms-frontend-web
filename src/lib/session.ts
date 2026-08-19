import { resolveTenantSlug } from './tenant-context';

export const TOKEN_KEY = 'wms_token';
export const API_BASE_KEY = 'wms_api_base';
export const TENANT_SLUG_KEY = 'wms_tenant_slug';
export const PLATFORM_TOKEN_KEY = 'wms_platform_token';

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

export function getStoredTenantSlug(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TENANT_SLUG_KEY) ?? '';
}

export function setStoredTenantSlug(slug: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TENANT_SLUG_KEY, slug.trim().toLowerCase());
}

export function clearStoredTenantSlug() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TENANT_SLUG_KEY);
}

/** Effective tenant slug for API calls: stored preference, then host/query/env. */
export function getEffectiveTenantSlug(override?: string | null): string {
  if (override?.trim()) return override.trim().toLowerCase();
  const stored = getStoredTenantSlug();
  if (stored) return stored;
  return resolveTenantSlug() ?? '';
}

export function getStoredPlatformToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(PLATFORM_TOKEN_KEY) ?? '';
}

export function setStoredPlatformToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PLATFORM_TOKEN_KEY, token);
}

export function clearStoredPlatformToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PLATFORM_TOKEN_KEY);
}
