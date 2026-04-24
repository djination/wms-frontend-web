'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppShell from '@/src/components/app/AppShell';
import { WmsDataProvider } from '@/src/lib/useWmsData';
import { getStoredToken } from '@/src/lib/session';

export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;
  return (
    <WmsDataProvider>
      <AppShell>{children}</AppShell>
    </WmsDataProvider>
  );
}
