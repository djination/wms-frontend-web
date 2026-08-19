'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PlatformShell from '@/src/components/platform/PlatformShell';
import { getStoredPlatformToken } from '@/src/lib/session';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === '/platform/login';

  useEffect(() => {
    const token = getStoredPlatformToken();
    if (!token && !isLogin) {
      router.replace('/platform/login');
      return;
    }
    if (token && isLogin) {
      router.replace('/platform/tenants');
      return;
    }
    setReady(true);
  }, [isLogin, pathname, router]);

  if (!ready) return null;

  if (isLogin) {
    return <>{children}</>;
  }

  return <PlatformShell>{children}</PlatformShell>;
}
