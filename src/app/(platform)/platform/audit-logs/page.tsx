'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPlatformAuditLogs, PlatformAuditLogRow } from '@/src/lib/platform-api';

export default function PlatformAuditLogsPage() {
  const [items, setItems] = useState<PlatformAuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPlatformAuditLogs(1, 100);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat audit log');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <h1>Audit Log ({total})</h1>
      <p className="muted">Aktivitas platform admin (schema platform.platform_audit_logs).</p>
      {error ? <p className="error">{error}</p> : null}

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Tenant</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {items.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>
                  <code>{log.action}</code>
                </td>
                <td>{log.platformUser?.email ?? '—'}</td>
                <td>
                  {log.tenant ? (
                    <Link href={`/platform/tenants/${log.tenant.id}`}>{log.tenant.slug}</Link>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <code style={{ fontSize: 12 }}>{JSON.stringify(log.metadata)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
