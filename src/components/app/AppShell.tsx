'use client';

import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { callApi } from '@/src/lib/api';
import AppHeader from './AppHeader';
import AppSidebar, { SidebarItem } from './AppSidebar';
import {
  clearStoredToken,
  getStoredApiBase,
  getStoredToken,
  setStoredApiBase,
} from '@/src/lib/session';

type AppShellProps = {
  children: ReactNode;
};

const fallbackMenus: SidebarItem[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  {
    key: 'master-data',
    label: 'Master Data',
    href: '/master-data/customers',
    children: [
      { key: 'md-customers', label: 'Customers', href: '/master-data/customers' },
      { key: 'md-operators', label: 'Operators', href: '/master-data/operators' },
      { key: 'md-warehouses', label: 'Warehouses', href: '/master-data/warehouses' },
      { key: 'md-areas', label: 'Areas', href: '/master-data/areas' },
      { key: 'md-zones', label: 'Zones', href: '/master-data/zones' },
      { key: 'md-bins', label: 'Bins', href: '/master-data/bins' },
      { key: 'md-uoms', label: 'UOM', href: '/master-data/uoms' },
      { key: 'md-product-uom-conversions', label: 'Product UOM Conversions', href: '/master-data/product-uom-conversions' },
      { key: 'md-suppliers', label: 'Suppliers', href: '/master-data/suppliers' },
      { key: 'md-products', label: 'Products', href: '/master-data/products' },
    ],
  },
  {
    key: 'inbound',
    label: 'Inbound',
    href: '/inbound/asn',
    children: [
      { key: 'in-asn', label: 'ASN', href: '/inbound/asn' },
      { key: 'in-receiving', label: 'Receiving', href: '/inbound/receiving' },
      { key: 'in-history', label: 'History', href: '/inbound/history' },
      {
        key: 'in-manifest',
        label: 'Manifest review',
        href: '/inbound/manifest-review',
      },
    ],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    href: '/inventory/balance',
    children: [{ key: 'inv-balance', label: 'Inventory Balance', href: '/inventory/balance' }],
  },
  {
    key: 'process-flow',
    label: 'Process Flow',
    href: '/process/transfers',
    children: [
      { key: 'pf-transfers', label: 'Internal Transfers', href: '/process/transfers' },
      { key: 'pf-transformations', label: 'Material Transformations', href: '/process/transformations' },
      { key: 'pf-recipes', label: 'Recipes (BOM)', href: '/process/recipes' },
      { key: 'pf-activity', label: 'Activity & billing', href: '/process/activity' },
    ],
  },
  {
    key: 'outbound',
    label: 'Outbound',
    href: '/outbound/sales-orders',
    children: [
      { key: 'ob-so', label: 'Sales orders', href: '/outbound/sales-orders' },
      { key: 'ob-allocations', label: 'Allocations', href: '/outbound/sales-orders' },
      { key: 'ob-waves', label: 'Waves', href: '/outbound/waves' },
      { key: 'ob-tasks', label: 'Tasks', href: '/outbound/tasks' },
      { key: 'ob-events', label: 'Events', href: '/outbound/sales-orders' },
    ],
  },
  {
    key: 'integration',
    label: 'Integrasi data',
    href: '/integration/data-sync',
    children: [
      {
        key: 'int-data-sync',
        label: 'Sinkron antar database',
        href: '/integration/data-sync',
      },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    href: '/billing/contracts',
    children: [
      { key: 'bl-contracts', label: 'Contracts', href: '/billing/contracts' },
      { key: 'bl-rates', label: 'Rates', href: '/billing/rates' },
      { key: 'bl-transactions', label: 'Transactions', href: '/billing/transactions' },
      { key: 'bl-summary', label: 'Summary', href: '/billing/summary' },
    ],
  },
];

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [apiBase, setApiBase] = useState(getStoredApiBase());
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [menus, setMenus] = useState<SidebarItem[]>(fallbackMenus);

  useEffect(() => {
    setToken(getStoredToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    const loadMenus = async () => {
      try {
        const data = await callApi(apiBase, token, 'GET', '/access/my-menus');
        if (!Array.isArray(data) || data.length === 0) {
          setMenus(fallbackMenus);
          return;
        }
        const mapped: SidebarItem[] = data.map((m: Record<string, unknown>) => ({
          key: String(m.code ?? m.id ?? 'menu'),
          label: String(m.name ?? 'Menu'),
          href: String(m.path ?? '#'),
          children: Array.isArray(m.children)
            ? (m.children as Record<string, unknown>[])
                .filter((c) => !!c.path)
                .map((c) => ({
                  key: String(c.code ?? c.id ?? 'submenu'),
                  label: String(c.name ?? 'Submenu'),
                  href: String(c.path ?? '#'),
                }))
            : undefined,
        }));
        setMenus(mapped.filter((m) => m.href && m.href !== '#'));
      } catch {
        setMenus(fallbackMenus);
      }
    };
    void loadMenus();
  }, [apiBase, token]);

  const onHealth = async () => {
    setBusy(true);
    try {
      const health = await callApi(apiBase, token, 'GET', '/health');
      alert(`Health: ${JSON.stringify(health)}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed health check');
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    router.replace('/login');
  };

  const onApiBaseChange = (value: string) => {
    setApiBase(value);
    setStoredApiBase(value);
  };

  return (
    <div className="app-shell">
      <AppHeader
        apiBase={apiBase}
        busy={busy}
        onApiBaseChange={onApiBaseChange}
        onHealth={onHealth}
        onLogout={logout}
      />

      <div className="main-layout">
        <AppSidebar menus={menus} />

        <main className="content">{children}</main>
      </div>

      <footer className="footer">
        <span>WMS Platform - Internal Console</span>
        <span>{busy ? 'Processing...' : 'Ready'}</span>
      </footer>
    </div>
  );
}
