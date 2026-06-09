'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import SimpleTable from '@/src/components/ui/SimpleTable';

export default function AccessRolesPanel() {
  const { apiBase, token, busy } = useWmsData();
  const [roles, setRoles] = useState<Array<Record<string, unknown>>>([]);
  const [menus, setMenus] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [code, setCode] = useState('ADMIN_OPS');
  const [name, setName] = useState('Admin Ops');
  const [scope, setScope] = useState('OPERATIONAL');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedMenuIds, setSelectedMenuIds] = useState<string[]>([]);
  const [menuQuery, setMenuQuery] = useState('');

  const roleRows = useMemo(() => {
    return roles.map((r) => {
      const role = r as Record<string, unknown>;
      const mappings = Array.isArray(role.roleMenus)
        ? (role.roleMenus as Array<Record<string, unknown>>)
        : [];
      const menuLabels = mappings
        .map((m) => {
          const menu = (m.menu ?? null) as Record<string, unknown> | null;
          if (!menu) return null;
          const code = menu.code != null ? String(menu.code) : '';
          const name = menu.name != null ? String(menu.name) : '';
          const path = menu.path != null ? String(menu.path) : '';
          const label = [code, name].filter(Boolean).join(' - ');
          return path ? `${label || '-'} (${path})` : label || '-';
        })
        .filter((v): v is string => Boolean(v));
      return {
        id: String(role.id ?? ''),
        code: String(role.code ?? ''),
        name: String(role.name ?? ''),
        scope: String(role.scope ?? ''),
        menus: menuLabels.length ? menuLabels.join(', ') : '-',
      };
    });
  }, [roles]);

  const roleById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const r of roles) {
      const role = r as Record<string, unknown>;
      const id = role.id != null ? String(role.id) : '';
      if (id) map.set(id, role);
    }
    return map;
  }, [roles]);

  const activeMenuIds = useMemo(() => {
    return menus
      .map((m) => String((m as Record<string, unknown>).id ?? ''))
      .filter(Boolean);
  }, [menus]);

  const selectedRoleMenus = useMemo(() => {
    if (!selectedRoleId) return [] as string[];
    const role = roleById.get(selectedRoleId);
    if (!role || !Array.isArray(role.roleMenus)) return [] as string[];
    const activeMenuIdSet = new Set(activeMenuIds);
    return (role.roleMenus as Array<Record<string, unknown>>)
      .map((m) => (m.menuId != null ? String(m.menuId) : ''))
      .filter((id) => Boolean(id) && activeMenuIdSet.has(id));
  }, [selectedRoleId, roleById, activeMenuIds]);

  useEffect(() => {
    setSelectedMenuIds(selectedRoleMenus);
  }, [selectedRoleMenus]);

  const groupedMenus = useMemo(() => {
    const items = menus.map((m) => {
      const row = m as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        code: String(row.code ?? ''),
        name: String(row.name ?? ''),
        path: row.path != null ? String(row.path) : '',
        parentId: row.parentId != null ? String(row.parentId) : '',
      };
    });
    const byId = new Map(items.map((i) => [i.id, i] as const));
    const childrenByParent = new Map<string, typeof items>();
    for (const item of items) {
      const pid = item.parentId || '';
      const list = childrenByParent.get(pid) ?? [];
      list.push(item);
      childrenByParent.set(pid, list);
    }
    const roots = items.filter((i) => !i.parentId || !byId.has(i.parentId));
    const needle = menuQuery.trim().toLowerCase();
    const matches = (i: (typeof items)[number]) =>
      `${i.code} ${i.name} ${i.path}`.toLowerCase().includes(needle);

    const groups = roots.map((root) => {
      const children = (childrenByParent.get(root.id) ?? []).sort((a, b) => a.name.localeCompare(b.name));
      if (!needle) return { root, children };
      const rootMatch = matches(root);
      const matchedChildren = children.filter(matches);
      if (!rootMatch && matchedChildren.length === 0) return null;
      return { root, children: rootMatch ? children : matchedChildren };
    });
    return groups
      .filter((g): g is { root: (typeof items)[number]; children: (typeof items) } => Boolean(g))
      .sort((a, b) => a.root.name.localeCompare(b.root.name));
  }, [menus, menuQuery]);

  const visibleMenuIds = useMemo(() => {
    return groupedMenus.flatMap((g) => [g.root.id, ...g.children.map((c) => c.id)]).filter(Boolean);
  }, [groupedMenus]);

  const loadRef = useCallback(async () => {
    const [r, m] = await Promise.all([
      callApi(apiBase, token, 'GET', '/access/roles'),
      callApi(apiBase, token, 'GET', '/access/menus'),
    ]);
    setRoles(Array.isArray(r) ? r : []);
    setMenus(Array.isArray(m) ? m : []);
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    void loadRef().catch(() => {});
  }, [token, loadRef]);

  const run = async (cb: () => Promise<unknown>, successText?: string) => {
    setError(null);
    setSuccess(null);
    try {
      await cb();
      if (successText) setSuccess(successText);
      await loadRef();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request gagal');
    }
  };

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />
      <section className="card">
        <h2>Access Management - Roles</h2>

        <h3 className="form-section-title">Create role</h3>
        <div className="form-grid">
          <div>
            <label htmlFor="acc-role-code">Code</label>
            <input id="acc-role-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ADMIN_OPS" />
          </div>
          <div>
            <label htmlFor="acc-role-name">Name</label>
            <input id="acc-role-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama role" />
          </div>
          <div>
            <label htmlFor="acc-role-scope">Scope</label>
            <select id="acc-role-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="SYSTEM">SYSTEM</option>
              <option value="OPERATIONAL">OPERATIONAL</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => run(() => callApi(apiBase, token, 'POST', '/access/roles', { code, name, scope }), 'Role created')}
          disabled={busy}
        >
          Create Role
        </button>

        <h3 className="form-section-title">Assign menus to role</h3>
        <div className="form-grid">
          <div>
            <label htmlFor="acc-role-pick">Role</label>
            <select id="acc-role-pick" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
              <option value="">Pilih role</option>
              {roles.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  {String(r.code)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="muted" style={{ margin: '4px 0 10px' }}>
          Pilih role, lalu centang menu yang ingin di-assign ({selectedMenuIds.length} dipilih).
        </p>
        <div className="row" style={{ marginBottom: 10 }}>
          <input
            value={menuQuery}
            onChange={(e) => setMenuQuery(e.target.value)}
            placeholder="Cari menu code/name/path..."
            style={{ maxWidth: 320 }}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={!selectedRoleId}
            onClick={() =>
              setSelectedMenuIds((prev) => [...new Set([...prev, ...visibleMenuIds])])
            }
          >
            Select all (visible)
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!selectedRoleId}
            onClick={() =>
              setSelectedMenuIds((prev) => prev.filter((id) => !visibleMenuIds.includes(id)))
            }
          >
            Clear visible
          </button>
        </div>
        <div className="table-wrap" style={{ maxHeight: 320, marginBottom: 10 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Assign</th>
                <th>Code</th>
                <th>Name</th>
                <th>Path</th>
              </tr>
            </thead>
            <tbody>
              {groupedMenus.length === 0 ? (
                <tr>
                  <td colSpan={4} className="table-empty">
                    Tidak ada menu yang cocok.
                  </td>
                </tr>
              ) : (
                groupedMenus.flatMap((g) => {
                  const rootChecked = selectedMenuIds.includes(g.root.id);
                  const rootRow = (
                    <tr key={g.root.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={rootChecked}
                          disabled={!selectedRoleId}
                          onChange={(e) => {
                            setSelectedMenuIds((prev) =>
                              e.target.checked
                                ? [...new Set([...prev, g.root.id])]
                                : prev.filter((x) => x !== g.root.id),
                            );
                          }}
                        />
                      </td>
                      <td><strong>{g.root.code || '-'}</strong></td>
                      <td><strong>{g.root.name || '-'}</strong></td>
                      <td>{g.root.path || '-'}</td>
                    </tr>
                  );
                  const childRows = g.children.map((c) => {
                    const checked = selectedMenuIds.includes(c.id);
                    return (
                      <tr key={c.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!selectedRoleId}
                            onChange={(e) => {
                              setSelectedMenuIds((prev) =>
                                e.target.checked
                                  ? [...new Set([...prev, c.id])]
                                  : prev.filter((x) => x !== c.id),
                              );
                            }}
                          />
                        </td>
                        <td style={{ paddingLeft: 28 }}>{c.code || '-'}</td>
                        <td>{c.name || '-'}</td>
                        <td>{c.path || '-'}</td>
                      </tr>
                    );
                  });
                  return [rootRow, ...childRows];
                })
              )}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() =>
            run(
              () =>
                callApi(apiBase, token, 'POST', '/access/roles/assign-menus', {
                  roleId: selectedRoleId,
                  menuIds: selectedMenuIds.filter((id) => activeMenuIds.includes(id)),
                }),
              'Role menu mapping updated',
            )
          }
          disabled={busy || !selectedRoleId}
        >
          Assign Menus
        </button>
      </section>

      <SimpleTable
        title="Roles"
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'scope', label: 'Scope' },
          // { key: 'menus', label: 'Menus', sortType: 'text' },
        ]}
        rows={roleRows as Array<Record<string, string | number | null | undefined>>}
        loading={busy}
        hideViewAction
        renderEditModal={(row, onClose) => {
          const roleId = row.id != null ? String(row.id) : '';
          const role = roleById.get(roleId);
          const mappings = Array.isArray(role?.roleMenus)
            ? (role?.roleMenus as Array<Record<string, unknown>>)
            : [];
          const initialMenuIds = mappings
            .map((m) => (m.menuId != null ? String(m.menuId) : ''))
            .filter((id) => Boolean(id) && activeMenuIds.includes(id));
          const menuOptions = menus.map((m) => {
            const item = m as Record<string, unknown>;
            return {
              id: String(item.id ?? ''),
              code: String(item.code ?? ''),
              name: String(item.name ?? ''),
              path: item.path != null ? String(item.path) : '',
            };
          });

          function EditRoleModalBody() {
            const [editCode, setEditCode] = useState(String(row.code ?? ''));
            const [editName, setEditName] = useState(String(row.name ?? ''));
            const [editScope, setEditScope] = useState(String(row.scope ?? 'OPERATIONAL'));
            const [editMenuIds, setEditMenuIds] = useState<string[]>(initialMenuIds);
            const [editMenuQuery, setEditMenuQuery] = useState('');
            const filteredMenus = menuOptions.filter((m) =>
              `${m.code} ${m.name} ${m.path}`.toLowerCase().includes(editMenuQuery.trim().toLowerCase()),
            );
            const visibleIds = filteredMenus.map((m) => m.id);

            return (
              <div>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Detail role dan daftar menu yang ter-assign.
                </p>
                <div className="form-grid" style={{ marginBottom: 12 }}>
                  <div>
                    <label>Code</label>
                    <input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                  </div>
                  <div>
                    <label>Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label>Scope</label>
                    <select value={editScope} onChange={(e) => setEditScope(e.target.value)}>
                      <option value="SYSTEM">SYSTEM</option>
                      <option value="OPERATIONAL">OPERATIONAL</option>
                    </select>
                  </div>
                </div>

                <h4 style={{ margin: '4px 0 8px' }}>Assigned Menus</h4>
                <div className="row" style={{ marginBottom: 10 }}>
                  <input
                    value={editMenuQuery}
                    onChange={(e) => setEditMenuQuery(e.target.value)}
                    placeholder="Cari menu code/name/path..."
                    style={{ maxWidth: 320 }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditMenuIds((prev) => [...new Set([...prev, ...visibleIds])])}
                    disabled={visibleIds.length === 0}
                  >
                    Select all (visible)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditMenuIds((prev) => prev.filter((id) => !visibleIds.includes(id)))}
                    disabled={visibleIds.length === 0}
                  >
                    Clear visible
                  </button>
                </div>
                <div className="table-wrap" style={{ maxHeight: 280 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 84 }}>Assign</th>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Path</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMenus.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="table-empty">
                            Tidak ada menu yang cocok.
                          </td>
                        </tr>
                      ) : (
                        filteredMenus.map((menu) => {
                          const checked = editMenuIds.includes(menu.id);
                          return (
                            <tr key={menu.id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setEditMenuIds((prev) =>
                                      e.target.checked
                                        ? [...new Set([...prev, menu.id])]
                                        : prev.filter((id) => id !== menu.id),
                                    )
                                  }
                                />
                              </td>
                              <td>{menu.code || '-'}</td>
                              <td>{menu.name || '-'}</td>
                              <td>{menu.path || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="modal-form-actions">
                  <button type="button" className="btn-secondary btn-modal-action" onClick={onClose} disabled={busy}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn-modal-action"
                    onClick={() =>
                      run(
                        async () => {
                          await callApi(apiBase, token, 'PATCH', `/access/roles/${roleId}`, {
                            code: editCode,
                            name: editName,
                            scope: editScope,
                          });
                          await callApi(apiBase, token, 'POST', '/access/roles/assign-menus', {
                            roleId,
                            menuIds: editMenuIds.filter((id) => activeMenuIds.includes(id)),
                          });
                          onClose();
                        },
                        'Role menu mapping updated',
                      )
                    }
                    disabled={busy || !roleId || !editCode.trim() || !editName.trim()}
                  >
                    Save Role
                  </button>
                </div>
              </div>
            );
          }

          return <EditRoleModalBody />;
        }}
      />

      {/* <SimpleTable
        title="Menus (Reference)"
        columns={[
          { key: 'id', label: 'Menu ID' },
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'path', label: 'Path' },
        ]}
        rows={menus as Array<Record<string, string | number | null | undefined>>}
        loading={busy}
      /> */}
    </>
  );
}
