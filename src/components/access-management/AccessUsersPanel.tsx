'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import SimpleTable, { type SimpleTableRow } from '@/src/components/ui/SimpleTable';

export default function AccessUsersPanel() {
  const { apiBase, token, busy, operators, warehouses } = useWmsData();
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [roles, setRoles] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [email, setEmail] = useState('user@wms.local');
  const [name, setName] = useState('New User');
  const [password, setPassword] = useState('password123');
  const [createRoleIds, setCreateRoleIds] = useState<string[]>([]);
  const [createOperatorCompanyId, setCreateOperatorCompanyId] = useState('');
  const [createWarehouseIds, setCreateWarehouseIds] = useState<string[]>([]);
  const [createRoleQuery, setCreateRoleQuery] = useState('');
  const [createRolePickerOpen, setCreateRolePickerOpen] = useState(false);
  const createRolePickerRef = useRef<HTMLDivElement | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignRoleIds, setAssignRoleIds] = useState<string[]>([]);
  const [assignRoleQuery, setAssignRoleQuery] = useState('');
  const [assignRolePickerOpen, setAssignRolePickerOpen] = useState(false);
  const assignRolePickerRef = useRef<HTMLDivElement | null>(null);

  const loadRef = useCallback(async () => {
    const [u, r] = await Promise.all([
      callApi(apiBase, token, 'GET', '/access/users'),
      callApi(apiBase, token, 'GET', '/access/roles'),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setRoles(Array.isArray(r) ? r : []);
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    void loadRef().catch(() => {});
  }, [token, loadRef]);

  useEffect(() => {
    if (!assignRolePickerOpen && !createRolePickerOpen) return;
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (assignRolePickerRef.current && !assignRolePickerRef.current.contains(target)) {
        setAssignRolePickerOpen(false);
      }
      if (createRolePickerRef.current && !createRolePickerRef.current.contains(target)) {
        setCreateRolePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [assignRolePickerOpen, createRolePickerOpen]);

  const roleOptions = useMemo(
    () =>
      roles.map((r) => ({
        id: String(r.id ?? ''),
        label: String(r.name ?? r.code ?? r.id ?? '-'),
      })),
    [roles],
  );
  const filteredRoleOptions = useMemo(() => {
    const needle = assignRoleQuery.trim().toLowerCase();
    if (!needle) return roleOptions;
    return roleOptions.filter((r) => r.label.toLowerCase().includes(needle));
  }, [roleOptions, assignRoleQuery]);
  const filteredCreateRoleOptions = useMemo(() => {
    const needle = createRoleQuery.trim().toLowerCase();
    if (!needle) return roleOptions;
    return roleOptions.filter((r) => r.label.toLowerCase().includes(needle));
  }, [roleOptions, createRoleQuery]);
  const warehouseOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        id: String(w.id ?? ''),
        label: `${String(w.code ?? '-')} - ${String(w.name ?? '-')}`,
      })),
    [warehouses],
  );
  const userById = useMemo(() => {
    return new Map(users.map((u) => [String(u.id ?? ''), u]));
  }, [users]);

  useEffect(() => {
    if (!selectedUserId) {
      setAssignRoleIds([]);
      return;
    }
    const selected = users.find((u) => String(u.id ?? '') === selectedUserId);
    const mappings = Array.isArray((selected as Record<string, unknown> | undefined)?.userRoles)
      ? ((selected as Record<string, unknown>).userRoles as Array<Record<string, unknown>>)
      : [];
    const next = mappings
      .map((m) => {
        const role = m.role as Record<string, unknown> | undefined;
        const roleId = role?.id ?? m.roleId;
        return roleId != null ? String(roleId) : '';
      })
      .filter(Boolean);
    setAssignRoleIds(next);
  }, [selectedUserId, users]);

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
        <h2>Access Management - Users</h2>

        <h3 className="form-section-title">Create user</h3>
        <div className="form-grid">
          <div>
            <label htmlFor="acc-user-email">Email</label>
            <input id="acc-user-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@wms.local" />
          </div>
          <div>
            <label htmlFor="acc-user-name">Name</label>
            <input id="acc-user-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama" />
          </div>
          <div>
            <label htmlFor="acc-user-password">Password</label>
            <input
              id="acc-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="new-password"
            />
          </div>
          <div className="full-row" ref={createRolePickerRef}>
            <label htmlFor="acc-user-create-roles-search">Roles</label>
            <div className="multi-select-wrap">
              <button
                type="button"
                className="multi-select-trigger"
                onClick={() => setCreateRolePickerOpen((prev) => !prev)}
                aria-expanded={createRolePickerOpen}
              >
                {createRoleIds.length === 0 ? (
                  <span className="muted">Pilih role (opsional)...</span>
                ) : (
                  <span className="multi-select-tags">
                    {createRoleIds.map((id) => {
                      const role = roleOptions.find((r) => r.id === id);
                      return (
                        <span key={id} className="multi-select-tag">
                          {role?.label ?? id}
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
              {createRolePickerOpen ? (
                <div className="multi-select-panel">
                  <div className="multi-select-toolbar">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setCreateRoleIds([])}
                      disabled={createRoleIds.length === 0}
                    >
                      Clear all
                    </button>
                  </div>
                  <input
                    id="acc-user-create-roles-search"
                    className="modal-search"
                    placeholder="Cari role..."
                    value={createRoleQuery}
                    onChange={(e) => setCreateRoleQuery(e.target.value)}
                  />
                  <div className="multi-select-list">
                    {filteredCreateRoleOptions.map((role) => {
                      const checked = createRoleIds.includes(role.id);
                      return (
                        <label key={role.id} className="multi-select-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setCreateRoleIds((prev) =>
                                e.target.checked ? [...prev, role.id] : prev.filter((id) => id !== role.id),
                              )
                            }
                          />
                          <span>{role.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
          <div>
            <label htmlFor="acc-user-create-operator">Operator Scope</label>
            <select
              id="acc-user-create-operator"
              value={createOperatorCompanyId}
              onChange={(e) => setCreateOperatorCompanyId(e.target.value)}
            >
              <option value="">No operator scope</option>
              {operators.map((o) => (
                <option key={String(o.id)} value={String(o.id)}>
                  {String(o.code ?? '-')} - {String(o.name ?? '-')}
                </option>
              ))}
            </select>
          </div>
          <div className="full-row">
            <label>Warehouse Scope (multi)</label>
            <div className="selection-list">
              {warehouseOptions.map((w) => (
                <label key={w.id} className="selection-item">
                  <input
                    type="checkbox"
                    checked={createWarehouseIds.includes(w.id)}
                    onChange={(e) =>
                      setCreateWarehouseIds((prev) =>
                        e.target.checked ? [...new Set([...prev, w.id])] : prev.filter((id) => id !== w.id),
                      )
                    }
                  />
                  {w.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            run(
              () =>
                callApi(apiBase, token, 'POST', '/access/users', {
                  email,
                  name,
                  password,
                  roleIds: createRoleIds,
                  operatorCompanyId: createOperatorCompanyId || undefined,
                  warehouseIds: createWarehouseIds,
                }),
              'User created',
            )
          }
          disabled={busy}
        >
          Create User
        </button>

        <h3 className="form-section-title">Assign roles to user</h3>
        <div className="form-grid">
          <div>
            <label htmlFor="acc-user-pick">User</label>
            <select id="acc-user-pick" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Pilih user</option>
              {users.map((u) => (
                <option key={String(u.id)} value={String(u.id)}>
                  {String(u.email)}
                </option>
              ))}
            </select>
          </div>
          <div ref={assignRolePickerRef}>
            <label htmlFor="acc-user-assign-roles-search">Roles</label>
            <div className="multi-select-wrap">
              <button
                type="button"
                className="multi-select-trigger"
                onClick={() => setAssignRolePickerOpen((prev) => !prev)}
                aria-expanded={assignRolePickerOpen}
              >
                {assignRoleIds.length === 0 ? (
                  <span className="muted">Pilih role...</span>
                ) : (
                  <span className="multi-select-tags">
                    {assignRoleIds.map((id) => {
                      const role = roleOptions.find((r) => r.id === id);
                      return (
                        <span key={id} className="multi-select-tag">
                          {role?.label ?? id}
                        </span>
                      );
                    })}
                  </span>
                )}
              </button>
              {assignRolePickerOpen ? (
                <div className="multi-select-panel">
                  <div className="multi-select-toolbar">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setAssignRoleIds([])}
                      disabled={assignRoleIds.length === 0}
                    >
                      Clear all
                    </button>
                  </div>
                  <input
                    id="acc-user-assign-roles-search"
                    className="modal-search"
                    placeholder="Cari role..."
                    value={assignRoleQuery}
                    onChange={(e) => setAssignRoleQuery(e.target.value)}
                  />
                  <div className="multi-select-list">
                    {filteredRoleOptions.map((role) => {
                      const checked = assignRoleIds.includes(role.id);
                      return (
                        <label key={role.id} className="multi-select-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setAssignRoleIds((prev) =>
                                e.target.checked ? [...prev, role.id] : prev.filter((id) => id !== role.id),
                              )
                            }
                          />
                          <span>{role.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            run(
              () =>
                callApi(apiBase, token, 'POST', '/access/users/assign-roles', {
                  userId: selectedUserId,
                  roleIds: assignRoleIds,
                }),
              'User role mapping updated',
            )
          }
          disabled={busy || !selectedUserId}
        >
          Assign Roles
        </button>
      </section>

      <SimpleTable
        title="Users"
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'name', label: 'Name' },
          {
            key: 'operatorScope',
            label: 'Operator Scope',
            renderCell: (row) =>
              String((row.operatorCompany as Record<string, unknown> | undefined)?.name ?? '-'),
          },
          {
            key: 'warehouseScope',
            label: 'Warehouse Scope',
            renderCell: (row) => {
              const mappings = Array.isArray((row as Record<string, unknown>).warehouseMappings)
                ? ((row as Record<string, unknown>).warehouseMappings as Array<Record<string, unknown>>)
                : [];
              return `${mappings.length} warehouse`;
            },
          },
          { key: 'isActive', label: 'Active' },
        ]}
        rows={users as Array<Record<string, string | number | null | undefined>>}
        loading={busy}
        hideViewAction
        renderEditModal={(row, onClose) => {
          const userId = String(row.id ?? '');
          const fullUser = userById.get(userId) as Record<string, unknown> | undefined;
          const mappedRoles = Array.isArray(fullUser?.userRoles)
            ? (fullUser?.userRoles as Array<Record<string, unknown>>)
            : [];
          const initialRoleIds = mappedRoles
            .map((m) => {
              const role = m.role as Record<string, unknown> | undefined;
              const roleId = role?.id ?? m.roleId;
              return roleId != null ? String(roleId) : '';
            })
            .filter(Boolean);

          function EditUserForm() {
            const [editEmail, setEditEmail] = useState(String(row.email ?? ''));
            const [editName, setEditName] = useState(String(row.name ?? '').trim());
            const [editPassword, setEditPassword] = useState('');
            const [editActive, setEditActive] = useState(Boolean(row.isActive));
            const [editRoleIds, setEditRoleIds] = useState<string[]>(initialRoleIds);
            const [editOperatorCompanyId, setEditOperatorCompanyId] = useState(
              String((fullUser?.operatorCompanyId as string | undefined) ?? ''),
            );
            const [editWarehouseIds, setEditWarehouseIds] = useState<string[]>(
              Array.isArray(fullUser?.warehouseMappings)
                ? (fullUser?.warehouseMappings as Array<Record<string, unknown>>)
                    .map((m) => String(m.warehouseId ?? ''))
                    .filter(Boolean)
                : [],
            );
            const [editRoleQuery, setEditRoleQuery] = useState('');
            const [editRolePickerOpen, setEditRolePickerOpen] = useState(false);
            const filteredEditRoles = roleOptions.filter((r) =>
              r.label.toLowerCase().includes(editRoleQuery.trim().toLowerCase()),
            );
            const editUsername = editEmail.includes('@') ? editEmail.split('@')[0] : editEmail;

            return (
              <div className="form-grid">
                <div>
                  <label>Username</label>
                  <input value={editUsername} readOnly />
                </div>
                <div>
                  <label>Email</label>
                  <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div className="full-row">
                  <label>Name</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="full-row">
                  <label>Password (optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave empty to keep current password"
                  />
                </div>
                <div className="full-row">
                  <label>Roles</label>
                  <div className="multi-select-wrap">
                    <button
                      type="button"
                      className="multi-select-trigger"
                      onClick={() => setEditRolePickerOpen((prev) => !prev)}
                      aria-expanded={editRolePickerOpen}
                    >
                      {editRoleIds.length === 0 ? (
                        <span className="muted">Pilih role...</span>
                      ) : (
                        <span className="multi-select-tags">
                          {editRoleIds.map((id) => {
                            const role = roleOptions.find((r) => r.id === id);
                            return (
                              <span key={id} className="multi-select-tag">
                                {role?.label ?? id}
                              </span>
                            );
                          })}
                        </span>
                      )}
                    </button>
                    {editRolePickerOpen ? (
                      <div className="multi-select-panel">
                        <div className="multi-select-toolbar">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setEditRoleIds([])}
                            disabled={editRoleIds.length === 0}
                          >
                            Clear all
                          </button>
                        </div>
                        <input
                          className="modal-search"
                          placeholder="Cari role..."
                          value={editRoleQuery}
                          onChange={(e) => setEditRoleQuery(e.target.value)}
                        />
                        <div className="multi-select-list">
                          {filteredEditRoles.map((role) => {
                            const checked = editRoleIds.includes(role.id);
                            return (
                              <label key={role.id} className="multi-select-item">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) =>
                                    setEditRoleIds((prev) =>
                                      e.target.checked ? [...prev, role.id] : prev.filter((id) => id !== role.id),
                                    )
                                  }
                                />
                                <span>{role.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="full-row">
                  <label>Active</label>
                  <div className="acc-active-row">
                    <label className="acc-active-switch" htmlFor={`acc-user-active-${userId}`}>
                      <input
                        id={`acc-user-active-${userId}`}
                        type="checkbox"
                        checked={editActive}
                        onChange={(e) => setEditActive(e.target.checked)}
                      />
                      <span className="acc-active-slider" />
                    </label>
                    <span className="acc-active-text">{editActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div className="full-row">
                  <label htmlFor={`acc-user-edit-operator-${userId}`}>Operator Scope</label>
                  <select
                    id={`acc-user-edit-operator-${userId}`}
                    value={editOperatorCompanyId}
                    onChange={(e) => setEditOperatorCompanyId(e.target.value)}
                  >
                    <option value="">No operator scope</option>
                    {operators.map((o) => (
                      <option key={String(o.id)} value={String(o.id)}>
                        {String(o.code ?? '-')} - {String(o.name ?? '-')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="full-row">
                  <label>Warehouse Scope (multi)</label>
                  <div className="selection-list">
                    {warehouseOptions.map((w) => (
                      <label key={w.id} className="selection-item">
                        <input
                          type="checkbox"
                          checked={editWarehouseIds.includes(w.id)}
                          onChange={(e) =>
                            setEditWarehouseIds((prev) =>
                              e.target.checked ? [...new Set([...prev, w.id])] : prev.filter((id) => id !== w.id),
                            )
                          }
                        />
                        {w.label}
                      </label>
                    ))}
                  </div>
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
                          await callApi(apiBase, token, 'PATCH', `/access/users/${userId}`, {
                            email: editEmail,
                            name: editName.trim() || undefined,
                            ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
                            isActive: editActive,
                            operatorCompanyId: editOperatorCompanyId || undefined,
                            warehouseIds: editWarehouseIds,
                          });
                          await callApi(apiBase, token, 'POST', '/access/users/assign-roles', {
                            userId,
                            roleIds: editRoleIds,
                          });
                          onClose();
                        },
                        'User updated',
                      )
                    }
                    disabled={busy || !editEmail.trim()}
                  >
                    Save User
                  </button>
                </div>
              </div>
            );
          }

          return <EditUserForm />;
        }}
        onDeleteRow={(row) =>
          run(() => callApi(apiBase, token, 'DELETE', `/access/users/${String(row.id ?? '')}`), 'User deleted')
        }
      />

      {/* <SimpleTable
        title="Roles (Reference)"
        columns={[
          { key: 'id', label: 'Role ID' },
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
        ]}
        rows={roles as Array<Record<string, string | number | null | undefined>>}
        loading={busy}
      /> */}
    </>
  );
}
