'use client';

import { useCallback, useEffect, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import SimpleTable from '@/src/components/ui/SimpleTable';

export default function AccessMenusPanel() {
  const { apiBase, token, busy } = useWmsData();
  const [menus, setMenus] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [code, setCode] = useState('NEW_MENU');
  const [name, setName] = useState('New Menu');
  const [path, setPath] = useState('/new-menu');
  const [sortOrder, setSortOrder] = useState('100');
  const [parentId, setParentId] = useState('');

  const loadMenus = useCallback(async () => {
    const data = await callApi(apiBase, token, 'GET', '/access/menus');
    setMenus(Array.isArray(data) ? data : []);
  }, [apiBase, token]);

  useEffect(() => {
    if (!token) return;
    void loadMenus().catch(() => {});
  }, [token, loadMenus]);

  const run = async (cb: () => Promise<unknown>, successText?: string) => {
    setError(null);
    setSuccess(null);
    try {
      await cb();
      if (successText) setSuccess(successText);
      await loadMenus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request gagal');
    }
  };

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />
      <section className="card">
        <h2>Access Management - Menus</h2>

        <h3 className="form-section-title">Create menu</h3>
        <div className="form-grid">
          <div>
            <label htmlFor="acc-menu-code">Code</label>
            <input id="acc-menu-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="NEW_MENU" />
          </div>
          <div>
            <label htmlFor="acc-menu-name">Name</label>
            <input id="acc-menu-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama menu" />
          </div>
          <div>
            <label htmlFor="acc-menu-path">Path</label>
            <input id="acc-menu-path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="/path" />
          </div>
          <div>
            <label htmlFor="acc-menu-sort">Sort order</label>
            <input id="acc-menu-sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number" />
          </div>
          <div>
            <label htmlFor="acc-menu-parent">Parent menu</label>
            <select id="acc-menu-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">Opsional</option>
              {menus.map((m) => (
                <option key={String(m.id)} value={String(m.id)}>
                  {String(m.code)} - {String(m.name)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            run(
              () =>
                callApi(apiBase, token, 'POST', '/access/menus', {
                  code,
                  name,
                  path,
                  sortOrder: Number(sortOrder),
                  ...(parentId ? { parentId } : {}),
                }),
              'Menu created',
            )
          }
          disabled={busy}
        >
          Create Menu
        </button>
      </section>

      <SimpleTable
        title="Menus"
        columns={[
          // { key: 'id', label: 'Menu ID' },
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Name' },
          { key: 'path', label: 'Path' },
          // { key: 'parentId', label: 'Parent ID' },
          { key: 'sortOrder', label: 'Sort', sortType: 'number' },
        ]}
        rows={menus as Array<Record<string, string | number | null | undefined>>}
        loading={busy}
        hideViewAction
        renderEditModal={(row, onClose) => {
          const menuId = String(row.id ?? '');
          const currentParentId = String(row.parentId ?? '');
          const parentOptions = menus
            .map((m) => m as Record<string, unknown>)
            .filter((m) => String(m.id ?? '') !== menuId);

          function EditMenuForm() {
            const [editCode, setEditCode] = useState(String(row.code ?? ''));
            const [editName, setEditName] = useState(String(row.name ?? ''));
            const [editPath, setEditPath] = useState(String(row.path ?? ''));
            const [editSortOrder, setEditSortOrder] = useState(String(row.sortOrder ?? '0'));
            const [editParentId, setEditParentId] = useState(currentParentId);

            return (
              <>
                <div className="form-grid">
                  <div>
                    <label>Code</label>
                    <input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                  </div>
                  <div>
                    <label>Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div>
                    <label>Path</label>
                    <input value={editPath} onChange={(e) => setEditPath(e.target.value)} />
                  </div>
                  <div>
                    <label>Sort</label>
                    <input
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Parent menu</label>
                    <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)}>
                      <option value="">Tanpa parent</option>
                      {parentOptions.map((m) => (
                        <option key={String(m.id ?? '')} value={String(m.id ?? '')}>
                          {String(m.code ?? '')} - {String(m.name ?? '')}
                        </option>
                      ))}
                    </select>
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
                          await callApi(apiBase, token, 'PATCH', `/access/menus/${menuId}`, {
                            code: editCode,
                            name: editName,
                            path: editPath,
                            sortOrder: Number(editSortOrder || '0'),
                            ...(editParentId ? { parentId: editParentId } : { parentId: null }),
                            isActive: Boolean(row.isActive ?? true),
                          });
                          onClose();
                        },
                        'Menu updated',
                      )
                    }
                    disabled={busy || !editCode.trim() || !editName.trim()}
                  >
                    Save Menu
                  </button>
                </div>
              </>
            );
          }

          return <EditMenuForm />;
        }}
        onDeleteRow={(row) =>
          run(() => callApi(apiBase, token, 'DELETE', `/access/menus/${String(row.id ?? '')}`), 'Menu deleted')
        }
      />
    </>
  );
}
