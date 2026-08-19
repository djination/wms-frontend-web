'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import AppSidebar, { SidebarItem } from '@/src/components/app/AppSidebar';
import { clearStoredPlatformToken } from '@/src/lib/session';

const PLATFORM_MENUS: SidebarItem[] = [
  { key: 'tenants', label: 'Tenants', href: '/platform/tenants' },
  { key: 'plans', label: 'Plans', href: '/platform/plans' },
  { key: 'feature-flags', label: 'Feature Flags', href: '/platform/feature-flags' },
  { key: 'users', label: 'Platform Users', href: '/platform/users' },
  { key: 'settings', label: 'Settings', href: '/platform/settings' },
  { key: 'audit-logs', label: 'Audit Log', href: '/platform/audit-logs' },
];

type PlatformShellProps = {
  children: ReactNode;
};

export default function PlatformShell({ children }: PlatformShellProps) {
  const router = useRouter();

  const logout = () => {
    clearStoredPlatformToken();
    router.replace('/platform/login');
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-left">
          <strong>WMS Platform Admin</strong>
          <span className="badge">SaaS control plane</span>
        </div>
        <div className="navbar-right">
          <button type="button" className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="main-layout">
        <AppSidebar menus={PLATFORM_MENUS} />
        <main className="content">{children}</main>
      </div>

      <footer className="footer">
        <span>WMS Platform — Admin Console</span>
        <span>Ready</span>
      </footer>
    </div>
  );
}
