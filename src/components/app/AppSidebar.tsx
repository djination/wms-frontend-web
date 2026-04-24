'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export type SidebarItem = {
  key: string;
  label: string;
  href: string;
  children?: SidebarItem[];
};

type AppSidebarProps = {
  menus: SidebarItem[];
};

function isSubActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));
}

export default function AppSidebar({ menus }: AppSidebarProps) {
  const pathname = usePathname();
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      for (const m of menus) {
        if (!m.children?.length) continue;
        const childActive = m.children.some((sub) => isSubActive(pathname, sub.href));
        const exactParent = pathname === m.href;
        if (childActive || exactParent) {
          next.add(m.key);
        }
      }
      return next;
    });
  }, [pathname, menus]);

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  return (
    <aside className="sidebar">
      {menus.map((menu) => {
        const isChildActive = !!menu.children?.some((sub) => isSubActive(pathname, sub.href));
        const isActive =
          isSubActive(pathname, menu.href) || isChildActive;
        const isOpen = menu.children ? openKeys.has(menu.key) : false;

        if (!menu.children) {
          return (
            <div key={menu.key} className="sidebar-menu-group">
              <Link className={isActive ? 'menu active' : 'menu'} href={menu.href}>
                {menu.label}
              </Link>
            </div>
          );
        }

        return (
          <div key={menu.key} className="sidebar-menu-group">
            <div className="menu-row">
              <Link className={isActive ? 'menu active' : 'menu'} href={menu.href}>
                {menu.label}
              </Link>
              <button
                type="button"
                className={isOpen ? 'menu-toggle is-open' : 'menu-toggle'}
                onClick={() => toggle(menu.key)}
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Tutup submenu' : 'Buka submenu'}
              >
                <span className="menu-chevron-icon" aria-hidden />
              </button>
            </div>
            {isOpen ? (
              <div className="submenu">
                {menu.children.map((sub) => (
                  <Link
                    key={sub.key}
                    className={pathname === sub.href ? 'submenu-item active' : 'submenu-item'}
                    href={sub.href}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </aside>
  );
}
