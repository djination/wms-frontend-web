import { callApi } from './api';
import { defaultApiBase, getStoredApiBase, getStoredPlatformToken } from './session';

export type PlatformTenantRow = {
  id: string;
  slug: string;
  schemaName: string;
  name: string;
  status: string;
  provisionedAt?: string | null;
  trialEndsAt?: string | null;
  createdAt?: string;
  plan?: { id?: string; code: string; name: string } | null;
  subscription?: { status: string } | null;
};

export type PlatformTenantListResponse = {
  items: PlatformTenantRow[];
  total: number;
  page: number;
  limit: number;
};

export type PlatformTenantDetail = PlatformTenantRow & {
  usage?: { users: number; warehouses: number; customers: number };
  provisioningJobs?: Array<{
    id: string;
    step: string;
    status: string;
    error?: string | null;
    attemptCount: number;
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt: string;
  }>;
};

export type PlatformUserRow = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlatformPlanRow = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  maxWarehouses: number;
  maxUsers: number;
  maxCustomers: number;
  features: Record<string, unknown>;
  priceMonthly: string | number;
  isActive: boolean;
};

export type PlatformSettingRow = {
  key: string;
  value: Record<string, unknown>;
  updatedAt: string;
};

export type FeatureFlagCatalogEntry = {
  key: string;
  label: string;
  description?: string;
};

export type TenantFeatureFlagItem = {
  flagKey: string;
  label: string;
  description?: string;
  enabled: boolean;
};

export type PlatformAuditLogRow = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  platformUser?: { id: string; email: string; name?: string | null } | null;
  tenant?: { id: string; slug: string; name: string } | null;
};

function apiBase() {
  return getStoredApiBase() || defaultApiBase;
}

function platformToken() {
  return getStoredPlatformToken();
}

function platformCall<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  payload?: unknown,
) {
  return callApi(apiBase(), platformToken(), method, path, payload, {
    skipTenantHeader: true,
  }) as Promise<T>;
}

export async function platformLogin(email: string, password: string) {
  return platformCall<{ accessToken: string; expiresIn: string }>(
    'POST',
    '/platform/auth/login',
    { email, password },
  );
}

export async function fetchPlatformMe() {
  return platformCall<PlatformUserRow>('GET', '/platform/auth/me');
}

export async function fetchPlatformTenants(page = 1, limit = 20, status?: string) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) qs.set('status', status);
  return platformCall<PlatformTenantListResponse>('GET', `/platform/tenants?${qs}`);
}

export async function fetchPlatformTenant(id: string) {
  return platformCall<PlatformTenantDetail>('GET', `/platform/tenants/${id}`);
}

export async function createPlatformTenant(payload: {
  slug: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  planCode?: string;
}) {
  return platformCall('POST', '/platform/tenants', payload);
}

export async function fetchPlatformTenantProvisionStatus(id: string) {
  return platformCall<Record<string, unknown>>('GET', `/platform/tenants/${id}/provision-status`);
}

export async function retryPlatformTenantProvision(
  id: string,
  payload?: { adminEmail?: string; adminPassword?: string; adminName?: string },
) {
  return platformCall('POST', `/platform/tenants/${id}/retry-provision`, payload ?? {});
}

export async function suspendPlatformTenant(id: string) {
  return platformCall('PATCH', `/platform/tenants/${id}/suspend`);
}

export async function reactivatePlatformTenant(id: string) {
  return platformCall('PATCH', `/platform/tenants/${id}/reactivate`);
}

export async function impersonatePlatformTenant(id: string, adminEmail?: string) {
  return platformCall<{ accessToken: string; tenant: { slug: string } }>(
    'POST',
    `/platform/tenants/${id}/impersonate`,
    adminEmail ? { adminEmail } : {},
  );
}

export async function fetchPlatformUsers() {
  return platformCall<{ items: PlatformUserRow[] }>('GET', '/platform/users');
}

export async function createPlatformUser(payload: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}) {
  return platformCall<PlatformUserRow>('POST', '/platform/users', payload);
}

export async function updatePlatformUser(
  id: string,
  payload: { name?: string; role?: string; isActive?: boolean },
) {
  return platformCall<PlatformUserRow>('PATCH', `/platform/users/${id}`, payload);
}

export async function resetPlatformUserPassword(id: string, password: string) {
  return platformCall('POST', `/platform/users/${id}/reset-password`, { password });
}

export async function fetchPlatformPlans() {
  return platformCall<{ items: PlatformPlanRow[] }>('GET', '/platform/plans');
}

export async function updatePlatformPlan(
  id: string,
  payload: Partial<{
    name: string;
    sortOrder: number;
    maxWarehouses: number;
    maxUsers: number;
    maxCustomers: number;
    priceMonthly: number;
    isActive: boolean;
  }>,
) {
  return platformCall<PlatformPlanRow>('PATCH', `/platform/plans/${id}`, payload);
}

export async function fetchPlatformSettings() {
  return platformCall<{ items: PlatformSettingRow[] }>('GET', '/platform/settings');
}

export async function upsertPlatformSetting(key: string, value: Record<string, unknown>) {
  return platformCall<PlatformSettingRow>('PUT', `/platform/settings/${key}`, { value });
}

export async function fetchFeatureFlagCatalog() {
  return platformCall<{ catalog: FeatureFlagCatalogEntry[] }>('GET', '/platform/feature-flags/catalog');
}

export async function updateFeatureFlagCatalog(catalog: FeatureFlagCatalogEntry[]) {
  return platformCall('PUT', '/platform/feature-flags/catalog', { catalog });
}

export async function fetchTenantFeatureFlags(tenantId: string) {
  return platformCall<{ tenantId: string; items: TenantFeatureFlagItem[] }>(
    'GET',
    `/platform/feature-flags/tenants/${tenantId}`,
  );
}

export async function upsertTenantFeatureFlags(
  tenantId: string,
  flags: Array<{ flagKey: string; enabled: boolean }>,
) {
  return platformCall('PUT', `/platform/feature-flags/tenants/${tenantId}`, { flags });
}

export async function fetchPlatformAuditLogs(page = 1, limit = 50, tenantId?: string) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (tenantId) qs.set('tenantId', tenantId);
  return platformCall<{ items: PlatformAuditLogRow[]; total: number }>(
    'GET',
    `/platform/audit-logs?${qs}`,
  );
}
