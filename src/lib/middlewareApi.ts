/**
 * HTTP helpers for the Python integration middleware.
 * Sends X-Tenant-Slug so jobs and connection refs are scoped per tenant.
 */

import { getEffectiveTenantSlug } from './session';

export async function middlewareJson<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  const root = base.replace(/\/$/, '');
  const url = `${root}${path.startsWith('/') ? path : `/${path}`}`;
  const tenantSlug = getEffectiveTenantSlug();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    let msg = text || `${res.status} ${res.statusText}`;
    if (data && typeof data === 'object' && data !== null && 'detail' in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === 'string') msg = d;
      else if (Array.isArray(d)) msg = d.map(String).join(', ');
    }
    throw new Error(msg);
  }
  return data as T;
}
