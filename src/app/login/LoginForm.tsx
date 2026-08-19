'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { callApi } from '@/src/lib/api';
import { isValidTenantSlug, resolveTenantSlug } from '@/src/lib/tenant-context';
import {
  defaultApiBase,
  getStoredToken,
  setStoredApiBase,
  setStoredTenantSlug,
  setStoredToken,
} from '@/src/lib/session';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiBase] = useState(defaultApiBase);
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getStoredToken()) {
      router.replace('/dashboard');
      return;
    }
    const fromQuery = searchParams.get('tenant')?.trim().toLowerCase();
    const resolved = fromQuery && isValidTenantSlug(fromQuery) ? fromQuery : resolveTenantSlug();
    if (resolved) setTenantSlug(resolved);
  }, [router, searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const slug = tenantSlug.trim().toLowerCase();
    if (!slug || !isValidTenantSlug(slug)) {
      setError('Isi slug tenant yang valid (contoh: demo, acme).');
      setBusy(false);
      return;
    }
    try {
      const data = await callApi(apiBase, '', 'POST', '/auth/login', { email, password, platform: 'web' }, {
        tenantSlug: slug,
      });
      const token = (data as { accessToken?: string })?.accessToken;
      if (!token) throw new Error('Token tidak ditemukan');
      setStoredApiBase(apiBase);
      setStoredTenantSlug(slug);
      setStoredToken(token);
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login gagal';
      if (message.toLowerCase().includes('no web access')) {
        setError('Akun ini tidak memiliki akses ke aplikasi web. Hubungi admin.');
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>WMS Login</h1>
        <p className="muted">Masuk ke tenant operasional Anda</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="login-tenant">Tenant slug</label>
          <input
            id="login-tenant"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            placeholder="demo"
            autoComplete="off"
          />
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        <p className="muted" style={{ marginTop: 16 }}>
          Belum punya tenant? <Link href="/signup">Daftar tenant baru</Link>
          {' · '}
          <Link href="/platform/login">Platform admin</Link>
        </p>
      </section>
    </main>
  );
}
