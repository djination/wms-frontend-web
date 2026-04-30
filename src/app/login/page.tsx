'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { callApi } from '@/src/lib/api';
import { defaultApiBase, getStoredToken, setStoredApiBase, setStoredToken } from '@/src/lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [apiBase, setApiBase] = useState(defaultApiBase);
  const [email, setEmail] = useState('admin@wms.local');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getStoredToken()) {
      router.replace('/dashboard');
    }
  }, [router]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await callApi(apiBase, '', 'POST', '/auth/login', { email, password, platform: 'web' });
      const token = (data as { accessToken?: string })?.accessToken;
      if (!token) throw new Error('Token tidak ditemukan');
      setStoredApiBase(apiBase);
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
        <p className="muted">Masuk untuk akses aplikasi WMS</p>
        <form onSubmit={onSubmit}>
          {/* <label>API Base URL</label>
          <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} /> */}
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
      </section>
    </main>
  );
}
