'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchPlatformTenants,
  PlatformTenantRow,
  reactivatePlatformTenant,
  suspendPlatformTenant,
} from '@/src/lib/platform-api';

export default function PlatformTenantsPage() {
  const [items, setItems] = useState<PlatformTenantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPlatformTenants(1, 50, statusFilter || undefined);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat tenants');
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSuspend = async (id: string) => {
    setBusyId(id);
    try {
      await suspendPlatformTenant(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suspend gagal');
    } finally {
      setBusyId(null);
    }
  };

  const onReactivate = async (id: string) => {
    setBusyId(id);
    try {
      await reactivatePlatformTenant(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reactivate gagal');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h1>Tenants ({total})</h1>
          <p className="muted">Registry tenant SaaS — data dari schema platform.</p>
        </div>
        <Link href="/platform/tenants/new">
          <button type="button">+ Buat Tenant</button>
        </Link>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="status-filter">Filter status </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Semua</option>
          <option value="PROVISIONING">PROVISIONING</option>
          <option value="TRIAL">TRIAL</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PAST_DUE">PAST_DUE</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {error ? <p className="error">{error}</p> : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', marginTop: 16 }}>
          <thead>
            <tr>
              <th>Slug</th>
              <th>Nama</th>
              <th>Schema</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td>
                  <Link href={`/platform/tenants/${t.id}`}>
                    <code>{t.slug}</code>
                  </Link>
                </td>
                <td>{t.name}</td>
                <td>
                  <code>{t.schemaName}</code>
                </td>
                <td>{t.status}</td>
                <td>{t.plan?.code ?? '—'}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/platform/tenants/${t.id}`}>Detail</Link>
                  {t.status === 'SUSPENDED' ? (
                    <button type="button" disabled={busyId === t.id} onClick={() => onReactivate(t.id)}>
                      Aktifkan
                    </button>
                  ) : (
                    <button type="button" disabled={busyId === t.id} onClick={() => onSuspend(t.id)}>
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
