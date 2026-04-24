'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken } from '@/src/lib/session';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
