'use client';

import { ReactNode, useId, useMemo, useState } from 'react';
import { IconDelete, IconEdit, IconView } from '@/src/components/ui/TableRowActionIcons';

export type SimpleTableRow = Record<string, string | number | boolean | null | undefined>;

type Column = {
  key: string;
  label: string;
  sortable?: boolean;
  sortType?: 'text' | 'number' | 'date';
  /** Custom cell content; search/sort still use `row[key]` when present */
  renderCell?: (row: SimpleTableRow) => ReactNode;
};

type DialogState = { mode: 'view' | 'edit' | 'delete'; row: SimpleTableRow };

type SimpleTableProps = {
  title: string;
  columns: Column[];
  rows: SimpleTableRow[];
  pageSize?: number;
  loading?: boolean;
  /** Sembunyikan kolom View / Edit / Delete */
  hideRowActions?: boolean;
  /** Sembunyikan tombol View, aksi utama jadi Edit */
  hideViewAction?: boolean;
  /** Sembunyikan tombol Edit */
  hideEditAction?: boolean;
  /** Konten modal Edit / Lihat (variant `view` = hanya baca, sama layout dengan edit) */
  renderEditModal?: (
    row: SimpleTableRow,
    onClose: () => void,
    ctx?: { variant: 'edit' | 'view' },
  ) => ReactNode;
  /** Jika di-set, tombol hapus memanggil ini; jika tidak, modal menjelaskan bahwa API hapus belum dihubungkan */
  onDeleteRow?: (row: SimpleTableRow) => Promise<void>;
  /** Override teks modal aksi delete/cancel */
  deleteDialogTitle?: string;
  deleteDialogDescription?: string;
  deleteConfirmText?: string;
};

export default function SimpleTable({
  title,
  columns,
  rows,
  pageSize = 8,
  loading = false,
  hideRowActions = false,
  hideViewAction = true,
  hideEditAction = false,
  renderEditModal,
  onDeleteRow,
  deleteDialogTitle = 'Hapus baris?',
  deleteDialogDescription = 'Data akan dihapus di server sesuai implementasi API.',
  deleteConfirmText = 'Hapus',
}: SimpleTableProps) {
  const searchFieldId = useId();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>(columns[0]?.key ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const showActions = !hideRowActions;
  const colCount = columns.length + (showActions ? 1 : 0);

  const preparedRows = useMemo(() => {
    if (!query.trim()) return rows;
    const needle = query.toLowerCase();
    return rows.filter((row) =>
      columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(needle)),
    );
  }, [rows, columns, query]);

  const filteredRows = useMemo(() => {
    if (!sortKey) return preparedRows;
    const sortCol = columns.find((c) => c.key === sortKey);
    const sortType = sortCol?.sortType ?? 'text';
    return [...preparedRows].sort((a, b) => {
      const aRaw = a[sortKey];
      const bRaw = b[sortKey];
      let cmp = 0;
      if (sortType === 'number') {
        const av = Number(aRaw ?? 0);
        const bv = Number(bRaw ?? 0);
        cmp = av === bv ? 0 : av > bv ? 1 : -1;
      } else if (sortType === 'date') {
        const av = new Date(String(aRaw ?? '')).getTime() || 0;
        const bv = new Date(String(bRaw ?? '')).getTime() || 0;
        cmp = av === bv ? 0 : av > bv ? 1 : -1;
      } else {
        const av = String(aRaw ?? '').toLowerCase();
        const bv = String(bRaw ?? '').toLowerCase();
        cmp = av === bv ? 0 : av > bv ? 1 : -1;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [preparedRows, sortDir, sortKey, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const closeDialog = () => {
    setDialog(null);
    setDialogError(null);
  };

  const rowLabel = (row: SimpleTableRow) => {
    const preferredKeys = [
      'asnNo',
      'orderNo',
      'waveNo',
      'code',
      'email',
      'name',
      'sku',
      'id',
    ] as const;
    const foundKey = preferredKeys.find((k) => row[k] != null && String(row[k]).trim().length > 0);
    if (foundKey) {
      const labels: Record<string, string> = {
        asnNo: 'ASN No',
        orderNo: 'Order No',
        waveNo: 'Wave No',
        code: 'Code',
        email: 'Email',
        name: 'Name',
        sku: 'SKU',
        id: 'ID',
      };
      return `${labels[foundKey]}: ${String(row[foundKey])}`;
    }

    const first = columns[0] ? String(row[columns[0].key] ?? '') : '';
    return first || 'Data ini';
  };

  const confirmDelete = async () => {
    if (!dialog || dialog.mode !== 'delete') return;
    setDialogError(null);
    if (!onDeleteRow) {
      closeDialog();
      return;
    }
    setDeleteBusy(true);
    try {
      await onDeleteRow(dialog.row);
      closeDialog();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section className="card">
      <div className="table-header">
        <h2>{title}</h2>
        <div className="table-search-wrap">
          <label htmlFor={searchFieldId}>Cari di tabel</label>
          <input
            id={searchFieldId}
            className="table-search"
            placeholder="Ketik untuk menyaring…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.sortable === false ? '' : 'sortable'}
                  onClick={() => {
                    if (col.sortable === false) return;
                    if (sortKey === col.key) {
                      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortKey(col.key);
                      setSortDir('asc');
                    }
                    setPage(1);
                  }}
                >
                  {col.label}{' '}
                  {col.sortable === false ? '' : sortKey === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              {showActions ? <th className="table-actions-col">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(Math.min(pageSize, 5))].map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {columns.map((c) => (
                      <td key={`${c.key}-${i}`}>
                        <div className="skeleton-line" />
                      </td>
                    ))}
                    {showActions ? (
                      <td key={`skeleton-act-${i}`}>
                        <div className="skeleton-line" />
                      </td>
                    ) : null}
                  </tr>
                ))
              : null}
            {!loading && visibleRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="table-empty">
                  No data
                </td>
              </tr>
            ) : !loading ? (
              visibleRows.map((row, idx) => (
                <tr key={String(row.id ?? `row-${idx}`)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.renderCell ? col.renderCell(row) : String(row[col.key] ?? '-')}
                    </td>
                  ))}
                  {showActions ? (
                    <td className="table-actions-cell">
                      <div className="table-row-actions">
                        {!hideViewAction ? (
                          <button
                            type="button"
                            className="table-icon-btn"
                            title="Lihat"
                            aria-label="Lihat"
                            onClick={() => setDialog({ mode: 'view', row })}
                          >
                            <IconView />
                          </button>
                        ) : null}
                        {!hideEditAction ? (
                          <button
                            type="button"
                            className="table-icon-btn"
                            title="Ubah"
                            aria-label="Ubah"
                            onClick={() => setDialog({ mode: 'edit', row })}
                          >
                            <IconEdit />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="table-icon-btn table-icon-btn-danger"
                          title="Hapus"
                          aria-label="Hapus"
                          onClick={() => setDialog({ mode: 'delete', row })}
                        >
                          <IconDelete />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <span>
          Showing {(currentPage - 1) * pageSize + (visibleRows.length ? 1 : 0)}-
          {(currentPage - 1) * pageSize + visibleRows.length} of {filteredRows.length}
        </span>
        <div>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>
            Prev
          </button>
          <span className="page-indicator">
            Page {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {dialog ? (
        <div className="modal-backdrop" onClick={closeDialog}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            {dialog.mode === 'view' ? (
              <>
                <div className="modal-header">
                  <strong>Lihat data</strong>
                  <div className="modal-header-actions">
                    {renderEditModal && !hideEditAction ? (
                      <button
                        type="button"
                        className="btn-modal-action"
                        onClick={() => setDialog({ mode: 'edit', row: dialog.row })}
                      >
                        Edit
                      </button>
                    ) : null}
                    <button type="button" className="btn-secondary" onClick={closeDialog}>
                      Tutup
                    </button>
                  </div>
                </div>
                {renderEditModal ? (
                  <div key={`view-${String(dialog.row.id ?? '')}`}>
                    {renderEditModal(dialog.row, closeDialog, { variant: 'view' })}
                  </div>
                ) : (
                  <div className="table-modal-generic-edit" style={{ marginTop: 4 }}>
                    <div className="form-grid">
                      {columns.map((col) => (
                        <div key={col.key}>
                          <label>{col.label}</label>
                          <input readOnly value={String(dialog.row[col.key] ?? '')} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {dialog.mode === 'edit' ? (
              <>
                <div className="modal-header">
                  <strong>Ubah data</strong>
                  <button type="button" className="btn-secondary" onClick={closeDialog}>
                    Tutup
                  </button>
                </div>
                {renderEditModal ? (
                  <div key={`edit-${String(dialog.row.id ?? '')}`}>
                    {renderEditModal(dialog.row, closeDialog, { variant: 'edit' })}
                  </div>
                ) : (
                  <div className="table-modal-generic-edit">
                    <p className="muted">
                      Form ubah khusus belum di-set untuk tabel ini. Berikut nilai saat ini (baca saja):
                    </p>
                    <div className="form-grid" style={{ marginTop: 12 }}>
                      {columns.map((col) => (
                        <div key={col.key}>
                          <label>{col.label}</label>
                          <input readOnly value={String(dialog.row[col.key] ?? '')} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {dialog.mode === 'delete' ? (
              <>
                <div className="modal-header">
                  <strong>{deleteDialogTitle}</strong>
                  <button type="button" className="btn-secondary" onClick={closeDialog}>
                    Tutup
                  </button>
                </div>
                <p style={{ marginBottom: 12 }}>{rowLabel(dialog.row)}</p>
                {onDeleteRow ? (
                  <p className="muted">{deleteDialogDescription}</p>
                ) : (
                  <p className="muted">
                    Aksi dari konsol ini belum dihubungkan ke API backend. Tombol &quot;Mengerti&quot; hanya
                    menutup dialog.
                  </p>
                )}
                {dialogError ? <p className="error" style={{ marginTop: 8 }}>{dialogError}</p> : null}
                <div className="row" style={{ marginTop: 16 }}>
                  <button type="button" className="btn-secondary" onClick={closeDialog}>
                    Batal
                  </button>
                  <button
                    type="button"
                    className={onDeleteRow ? 'btn-danger' : undefined}
                    onClick={() => void confirmDelete()}
                    disabled={deleteBusy}
                  >
                    {deleteBusy ? 'Memproses…' : onDeleteRow ? deleteConfirmText : 'Mengerti'}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
