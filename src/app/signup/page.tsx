'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProvisionStatus, signupTenant } from '@/src/lib/tenant-signup-api';
import { isValidTenantSlug, resolveTenantSlug } from '@/src/lib/tenant-context';
import { setStoredTenantSlug } from '@/src/lib/session';

export default function SignupPage() {
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('Tenant Admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'provisioning' | 'ready'>('form');
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    const initial = resolveTenantSlug();
    if (initial) setSlug(initial);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = (tenantSlug: string) => {
    setPhase('provisioning');
    const poll = async () => {
      try {
        const status = await fetchProvisionStatus(tenantSlug);
        setStatusText(`Status: ${status.status}${status.job ? ` — ${status.job.step} (${status.job.status})` : ''}`);
        if (status.ready) {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase('ready');
          setStoredTenantSlug(tenantSlug);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memeriksa status provisioning');
        if (pollRef.current) clearInterval(pollRef.current);
        setPhase('form');
      }
    };
    void poll();
    pollRef.current = setInterval(poll, 2500);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = slug.trim().toLowerCase();
    if (!isValidTenantSlug(normalized)) {
      setError('Slug tenant: huruf kecil, angka, strip; 3–31 karakter; diawali huruf.');
      return;
    }
    setBusy(true);
    try {
      await signupTenant({
        slug: normalized,
        name: name.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
        adminPassword,
        adminName: adminName.trim() || undefined,
      });
      startPolling(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup gagal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Daftar Tenant WMS</h1>
        <p className="muted">Buat organisasi baru — schema database disiapkan otomatis.</p>

        {phase === 'form' ? (
          <form onSubmit={onSubmit}>
            <label htmlFor="signup-slug">Slug tenant</label>
            <input
              id="signup-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme"
              autoComplete="off"
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Akses nanti: <code>{slug || 'acme'}.localhost</code> atau header <code>X-Tenant-Slug</code>
            </p>
            <label htmlFor="signup-name">Nama perusahaan</label>
            <input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} />
            <label htmlFor="signup-admin-name">Nama admin</label>
            <input id="signup-admin-name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            <label htmlFor="signup-email">Email admin</label>
            <input
              id="signup-email"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              autoComplete="email"
            />
            <label htmlFor="signup-password">Password admin</label>
            <input
              id="signup-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button type="submit" disabled={busy}>
              {busy ? 'Mendaftar...' : 'Daftar & Provision'}
            </button>
          </form>
        ) : null}

        {phase === 'provisioning' ? (
          <div>
            <p>Menyiapkan tenant <strong>{slug}</strong>...</p>
            <p className="muted">{statusText || 'Memulai provisioning...'}</p>
          </div>
        ) : null}

        {phase === 'ready' ? (
          <div>
            <p>Tenant <strong>{slug}</strong> siap digunakan.</p>
            <button type="button" onClick={() => router.push(`/login?tenant=${encodeURIComponent(slug)}`)}>
              Ke halaman login
            </button>
          </div>
        ) : null}

        {error ? <p className="error">{error}</p> : null}

        <p className="muted" style={{ marginTop: 16 }}>
          Sudah punya akun? <Link href="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
