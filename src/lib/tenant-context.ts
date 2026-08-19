const SLUG_PATTERN = /^[a-z][a-z0-9-]{2,30}$/;

export function isValidTenantSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug.trim().toLowerCase());
}

/**
 * Resolve tenant slug from subdomain, query ?tenant=, or env default.
 * Skips `admin` subdomain (platform console).
 */
export function resolveTenantSlug(): string | null {
  const envDefault = process.env.NEXT_PUBLIC_TENANT_DEFAULT_SLUG?.trim().toLowerCase() || null;

  if (typeof window === 'undefined') {
    return envDefault;
  }

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('tenant')?.trim().toLowerCase();
  if (fromQuery && isValidTenantSlug(fromQuery)) {
    return fromQuery;
  }

  const host = window.location.hostname.toLowerCase();
  if (isPlatformHost(host)) {
    return null;
  }

  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim().toLowerCase();
  if (baseDomain && host.endsWith(`.${baseDomain}`)) {
    const sub = host.slice(0, -(baseDomain.length + 1)).split('.')[0];
    if (sub && sub !== 'admin' && isValidTenantSlug(sub)) return sub;
  }

  if (host.endsWith('.localhost')) {
    const sub = host.replace(/\.localhost$/, '').split('.')[0];
    if (sub && sub !== 'admin' && isValidTenantSlug(sub)) return sub;
  }

  return envDefault;
}

export function isPlatformHost(hostname?: string): boolean {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  const prefix = process.env.NEXT_PUBLIC_PLATFORM_SUBDOMAIN?.trim().toLowerCase() || 'admin';
  if (host === prefix || host.startsWith(`${prefix}.`)) return true;
  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim().toLowerCase();
  if (baseDomain && host === `${prefix}.${baseDomain}`) return true;
  if (host === `${prefix}.localhost`) return true;
  return false;
}
