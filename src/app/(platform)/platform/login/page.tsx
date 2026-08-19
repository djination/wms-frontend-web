'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { platformLogin } from '@/src/lib/platform-api';
import { setStoredApiBase, setStoredPlatformToken, defaultApiBase } from '@/src/lib/session';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('platform@wms.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await platformLogin(email, password);
      if (!data.accessToken) throw new Error('Token platform tidak ditemukan');
      setStoredApiBase(defaultApiBase);
      setStoredPlatformToken(data.accessToken);
      router.replace('/platform/tenants');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login platform gagal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Platform Admin</h1>
        <p className="muted">Login konsol SaaS (bukan user tenant)</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="platform-email">Email</label>
          <input id="platform-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="platform-password">Password</label>
          <input
            id="platform-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        <p className="muted" style={{ marginTop: 16 }}>
          <Link href="/login">Kembali ke login tenant</Link>
        </p>
      </section>
    </main>
  );
}
