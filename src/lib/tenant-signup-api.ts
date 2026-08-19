import { callApi } from './api';
import { defaultApiBase, getStoredApiBase } from './session';

export type TenantSignupPayload = {
  slug: string;
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminName?: string;
  planCode?: string;
};

export type TenantSignupResponse = {
  tenantId: string;
  slug: string;
  schemaName: string;
  status: string;
  message?: string;
  pollPath?: string;
};

export type ProvisionStatusResponse = {
  tenantId: string;
  slug: string;
  schemaName: string;
  status: string;
  provisionedAt?: string | null;
  ready: boolean;
  job?: {
    step: string;
    status: string;
    error?: string | null;
  } | null;
};

function apiBase() {
  return getStoredApiBase() || defaultApiBase;
}

export async function signupTenant(payload: TenantSignupPayload) {
  return callApi(apiBase(), '', 'POST', '/tenants/signup', payload, { skipTenantHeader: true }) as Promise<
    TenantSignupResponse
  >;
}

export async function fetchProvisionStatus(slug: string) {
  return callApi(apiBase(), '', 'GET', `/tenants/${encodeURIComponent(slug)}/provision-status`, undefined, {
    skipTenantHeader: true,
  }) as Promise<ProvisionStatusResponse>;
}
