'use client';

import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page"><section className="auth-card"><p className="muted">Memuat...</p></section></main>}>
      <LoginForm />
    </Suspense>
  );
}
