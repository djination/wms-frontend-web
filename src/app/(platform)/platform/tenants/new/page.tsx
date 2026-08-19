'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPlatformTenant, fetchPlatformPlans } from '@/src/lib/platform-api';

export default function PlatformTenantCreatePage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('password123');
  const [adminName, setAdminName] = useState('Tenant Admin');
  const [planCode, setPlanCode] = useState('STARTER');
  const [plans, setPlans] = useState<Array<{ code: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchPlatformPlans()
      .then((data) => setPlans(data.items.map((p) => ({ code: p.code, name: p.name }))))
      .catch(() => {});
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = (await createPlatformTenant({
        slug,
        name,
        adminEmail,
        adminPassword,
        adminName,
        planCode,
      })) as { tenantId?: string };
      if (result.tenantId) {
        router.push(`/platform/tenants/${result.tenantId}`);
      } else {
        router.push('/platform/tenants');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat tenant');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p>
        <Link href="/platform/tenants">← Kembali ke daftar tenant</Link>
      </p>
      <h1>Buat Tenant Baru</h1>
      <p className="muted">Registrasi tenant dan enqueue provisioning otomatis.</p>
      <form onSubmit={onSubmit} style={{ maxWidth: 480, marginTop: 16 }}>
        <label htmlFor="slug">Slug</label>
        <input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        <label htmlFor="name">Nama tenant</label>
        <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        <label htmlFor="plan">Plan</label>
        <select id="plan" value={planCode} onChange={(e) => setPlanCode(e.target.value)}>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        <label htmlFor="adminEmail">Admin email</label>
        <input
          id="adminEmail"
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          required
        />
        <label htmlFor="adminName">Admin name</label>
        <input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
        <label htmlFor="adminPassword">Admin password</label>
        <input
          id="adminPassword"
          type="password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={busy} style={{ marginTop: 12 }}>
          {busy ? 'Memproses...' : 'Buat & Provision'}
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
