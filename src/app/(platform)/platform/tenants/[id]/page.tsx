'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  fetchPlatformTenant,
  fetchPlatformTenantProvisionStatus,
  fetchTenantFeatureFlags,
  impersonatePlatformTenant,
  PlatformTenantDetail,
  reactivatePlatformTenant,
  retryPlatformTenantProvision,
  suspendPlatformTenant,
  TenantFeatureFlagItem,
  upsertTenantFeatureFlags,
} from '@/src/lib/platform-api';
import { setStoredTenantSlug, setStoredToken } from '@/src/lib/session';

export default function PlatformTenantDetailPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const [tenant, setTenant] = useState<PlatformTenantDetail | null>(null);
  const [provisionStatus, setProvisionStatus] = useState<Record<string, unknown> | null>(null);
  const [flags, setFlags] = useState<TenantFeatureFlagItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [detail, prov, flagData] = await Promise.all([
        fetchPlatformTenant(id),
        fetchPlatformTenantProvisionStatus(id).catch(() => null),
        fetchTenantFeatureFlags(id).catch(() => ({ items: [] as TenantFeatureFlagItem[] })),
      ]);
      setTenant(detail);
      setProvisionStatus(prov);
      setFlags(flagData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail tenant');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (action: () => Promise<unknown>, okMessage: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(okMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aksi gagal');
    } finally {
      setBusy(false);
    }
  };

  const onSaveFlags = async () => {
    await runAction(
      () =>
        upsertTenantFeatureFlags(
          id,
          flags.map((f) => ({ flagKey: f.flagKey, enabled: f.enabled })),
        ),
      'Feature flags disimpan',
    );
  };

  const onImpersonate = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await impersonatePlatformTenant(id);
      setStoredToken(result.accessToken);
      setStoredTenantSlug(result.tenant.slug);
      window.open('/dashboard', '_blank');
      setSuccess('Token impersonate diterbitkan — buka tab tenant baru');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impersonate gagal');
    } finally {
      setBusy(false);
    }
  };

  if (!tenant) {
    return (
      <div>
        <Link href="/platform/tenants">← Tenants</Link>
        {error ? <p className="error">{error}</p> : <p className="muted">Memuat...</p>}
      </div>
    );
  }

  return (
    <div>
      <p>
        <Link href="/platform/tenants">← Kembali ke daftar tenant</Link>
      </p>
      <h1>
        {tenant.name} <code>({tenant.slug})</code>
      </h1>
      <p className="muted">Status: {tenant.status} · Schema: {tenant.schemaName}</p>
      {error ? <p className="error">{error}</p> : null}
      {success ? <p style={{ color: 'green' }}>{success}</p> : null}

      <section style={{ marginTop: 24 }}>
        <h2>Overview</h2>
        <table className="table">
          <tbody>
            <tr>
              <th>Plan</th>
              <td>{tenant.plan?.name ?? '—'} ({tenant.plan?.code ?? '—'})</td>
            </tr>
            <tr>
              <th>Subscription</th>
              <td>{tenant.subscription?.status ?? '—'}</td>
            </tr>
            <tr>
              <th>Provisioned at</th>
              <td>{tenant.provisionedAt ? new Date(tenant.provisionedAt).toLocaleString() : '—'}</td>
            </tr>
            <tr>
              <th>Trial ends</th>
              <td>{tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleString() : '—'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {tenant.usage ? (
        <section style={{ marginTop: 24 }}>
          <h2>Usage</h2>
          <p>
            Users: {tenant.usage.users} · Warehouses: {tenant.usage.warehouses} · Customers:{' '}
            {tenant.usage.customers}
          </p>
        </section>
      ) : null}

      <section style={{ marginTop: 24 }}>
        <h2>Provisioning</h2>
        {provisionStatus ? (
          <pre style={{ background: '#f5f5f5', padding: 12, overflow: 'auto' }}>
            {JSON.stringify(provisionStatus, null, 2)}
          </pre>
        ) : (
          <p className="muted">Status provisioning tidak tersedia.</p>
        )}
        {tenant.provisioningJobs?.length ? (
          <table className="table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Step</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Error</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {tenant.provisioningJobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.step}</td>
                  <td>{job.status}</td>
                  <td>{job.attemptCount}</td>
                  <td>{job.error ?? '—'}</td>
                  <td>{new Date(job.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tenant.status === 'SUSPENDED' ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => reactivatePlatformTenant(id), 'Tenant diaktifkan')}
          >
            Aktifkan
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => suspendPlatformTenant(id), 'Tenant disuspend')}
          >
            Suspend
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => runAction(() => retryPlatformTenantProvision(id), 'Retry provisioning dijalankan')}
        >
          Retry Provision
        </button>
        <button type="button" disabled={busy} onClick={() => void onImpersonate()}>
          Impersonate (buka tenant)
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Feature Flags (per tenant)</h2>
        {flags.length === 0 ? (
          <p className="muted">Belum ada flag — pastikan catalog sudah didefinisi di menu Feature Flags.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Flag</th>
                <th>Deskripsi</th>
                <th>Enabled</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((flag, idx) => (
                <tr key={flag.flagKey}>
                  <td>
                    <strong>{flag.label}</strong>
                    <br />
                    <code>{flag.flagKey}</code>
                  </td>
                  <td>{flag.description ?? '—'}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={(e) => {
                        const next = [...flags];
                        next[idx] = { ...flag, enabled: e.target.checked };
                        setFlags(next);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {flags.length > 0 ? (
          <button type="button" disabled={busy} onClick={() => void onSaveFlags()} style={{ marginTop: 12 }}>
            Simpan Feature Flags
          </button>
        ) : null}
      </section>
    </div>
  );
}
