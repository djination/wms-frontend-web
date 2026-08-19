import { getEffectiveTenantSlug } from './session';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type ApiErrorBody = {
  statusCode?: number;
  message?: string | string[];
  code?: string;
  path?: string;
};

function mapApiErrorMessage(status: number, body: ApiErrorBody | null, statusText: string): string {
  const scopeMessages: Record<string, string> = {
    FORBIDDEN_SCOPE_WAREHOUSE: 'Akses ditolak: warehouse ini tidak termasuk scope user.',
    FORBIDDEN_SCOPE_OPERATOR: 'Akses ditolak: operator ini tidak termasuk scope user.',
    FORBIDDEN_SCOPE_CUSTOMER: 'Akses ditolak: customer ini tidak termasuk scope user.',
    FORBIDDEN_SCOPE_SYSTEM_ADMIN_REQUIRED: 'Aksi ini hanya boleh dilakukan oleh System Administrator.',
    MISSING_SCOPE_WAREHOUSE: 'Akses ditolak: user belum memiliki scope warehouse.',
    MISSING_SCOPE_OPERATOR: 'Akses ditolak: user belum memiliki scope operator.',
  };

  const code = body?.code;
  if (code && scopeMessages[code]) {
    return scopeMessages[code];
  }

  const rawMessage = body?.message;
  if (Array.isArray(rawMessage) && rawMessage.length > 0) {
    return rawMessage.join(', ');
  }
  if (typeof rawMessage === 'string' && rawMessage.trim()) {
    return rawMessage;
  }
  return `${status} ${statusText}`;
}

export type CallApiOptions = {
  tenantSlug?: string | null;
  skipTenantHeader?: boolean;
};

export async function callApi(
  apiBase: string,
  token: string,
  method: HttpMethod,
  path: string,
  payload?: unknown,
  options?: CallApiOptions,
) {
  const tenantSlug = options?.skipTenantHeader ? '' : getEffectiveTenantSlug(options?.tenantSlug);
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
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
    const message = mapApiErrorMessage(res.status, (data as ApiErrorBody | null) ?? null, res.statusText);
    throw new Error(message);
  }
  return data;
}
