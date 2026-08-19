'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isPlatformHost } from '@/src/lib/tenant-context';
import { getStoredPlatformToken, getStoredToken } from '@/src/lib/session';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    if (isPlatformHost()) {
      router.replace(getStoredPlatformToken() ? '/platform/tenants' : '/platform/login');
      return;
    }
    const token = getStoredToken();
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return null;
}
