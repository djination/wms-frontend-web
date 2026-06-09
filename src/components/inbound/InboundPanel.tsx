'use client';

import { useMemo, useState } from 'react';

function formatInboundDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import SimpleTable from '@/src/components/ui/SimpleTable';
import CreateAsnForm from './CreateAsnForm';
import ReceiveItemForm from './ReceiveItemForm';

type InboundSection = 'asn' | 'receiving' | 'history';

type InboundPanelProps = {
  section: InboundSection;
};

export default function InboundPanel({ section }: InboundPanelProps) {
  const {
    apiBase,
    token,
    customers,
    suppliers,
    uoms,
    warehouses,
    products,
    bins,
    zones,
    asns,
    busy,
    refreshReferenceData,
  } = useWmsData();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const run = async (
    action: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    payload?: unknown,
  ): Promise<boolean> => {
    setError(null);
    setSuccess(null);
    setActionBusy(action);
    try {
      await callApi(apiBase, token, method, path, payload);
      if (method === 'POST') {
        setSuccess(
          path.includes('/customs-release')
            ? 'Pelepasan bea cukai untuk receipt berhasil dicatat'
            : 'Inbound transaction berhasil',
        );
      }
      if (method === 'PATCH') setSuccess('ASN berhasil diperbarui');
      if (method === 'DELETE') {
        setSuccess('ASN berhasil dibatalkan');
      }
      if (method !== 'GET') await refreshReferenceData();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request gagal');
      return false;
    } finally {
      setActionBusy(null);
    }
  };

  const asnById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of asns) {
      map.set(String(row.id), row as unknown as Record<string, unknown>);
    }
    return map;
  }, [asns]);

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />

      <section className="card">
        <h2>
          {section === 'asn'
            ? 'Inbound - ASN'
            : section === 'receiving'
              ? 'Inbound - Receiving'
              : 'Inbound - Receiving History'}
</h2>

        {section === 'asn' ? (
          <CreateAsnForm
            busy={busy || actionBusy === 'create-asn'}
            customers={customers}
            suppliers={suppliers}
            uoms={uoms}
            warehouses={warehouses}
            products={products}
            asns={asns}
            onSubmit={async (payload) => {
              await run('create-asn', 'POST', '/inbound/asns', payload);
            }}
          />
        ) : null}

        {section === 'receiving' ? (
          <ReceiveItemForm
            busy={busy || actionBusy === 'receive-item'}
            asns={asns}
            products={products}
            warehouses={warehouses}
            zones={zones}
            bins={bins}
            onSubmit={async (payload) => {
              await run('receive-item', 'POST', '/inbound/receive', payload);
            }}
          />
        ) : null}
      </section>

      <SimpleTable
        title={section === 'history' ? 'Receiving/ASN History' : 'Latest ASN'}
        hideViewAction={section !== 'history'}
        hideEditAction={section === 'history'}
        columns={[
          { key: 'asnNo', label: 'ASN No', sortType: 'text' },
          { key: 'status', label: 'Status', sortType: 'text' },
          { key: 'referenceNo', label: 'Reference', sortType: 'text' },
          { key: 'updatedAt', label: 'Updated', sortType: 'date' },
        ]}
        rows={asns.map((a) => ({
          id: String(a.id),
          asnNo: String(a.asnNo ?? ''),
          status: String((a as unknown as Record<string, unknown>).status ?? ''),
          referenceNo: String((a as unknown as Record<string, unknown>).referenceNo ?? ''),
          updatedAt: String((a as unknown as Record<string, unknown>).updatedAt ?? ''),
        }))}
        loading={busy}
        renderEditModal={(row, onClose, ctx) => {
          const readOnly = ctx?.variant === 'view';
          const asn = asnById.get(String(row.id ?? ''));
          const customerId = asn?.customerId != null ? String(asn.customerId) : '';
          const warehouseId = asn?.warehouseId != null ? String(asn.warehouseId) : '';
          const warehouse = warehouses.find((w) => w.id === warehouseId);
          const warehouseLabel =
            warehouse != null
              ? `${warehouse.code ?? '-'} - ${warehouse.name ?? '-'}`
              : warehouseId || '-';
          const status = asn?.status != null ? String(asn.status) : '';
          const initialReferenceNo = asn?.referenceNo != null ? String(asn.referenceNo) : '';
          const expectedAtRaw = asn?.expectedAt != null ? String(asn.expectedAt) : '';
          const expectedAtDateInput = expectedAtRaw ? new Date(expectedAtRaw).toISOString().slice(0, 10) : '';
          const rawItems = Array.isArray(asn?.items) ? (asn?.items as Record<string, unknown>[]) : [];
          const receiptList = Array.isArray(asn?.receipts) ? (asn.receipts as Record<string, unknown>[]) : [];
          const initialItems = rawItems.map((it) => ({
            productId: it.productId != null ? String(it.productId) : '',
            supplierId: it.supplierId != null ? String(it.supplierId) : '',
            uomId: it.uomId != null ? String(it.uomId) : '',
            qtyExpected: it.qtyExpected != null ? String(it.qtyExpected) : '0',
          }));

          function EditAsnItemsModal({ receipts }: { receipts: Record<string, unknown>[] }) {
            const [items, setItems] = useState(
              initialItems.length > 0
                ? initialItems
                : [{ productId: '', supplierId: '', uomId: '', qtyExpected: '1' }],
            );
            const [referenceNo, setReferenceNo] = useState(initialReferenceNo);
            const [expectedAtDate, setExpectedAtDate] = useState(expectedAtDateInput);
            const [releaseRefByReceiptId, setReleaseRefByReceiptId] = useState<Record<string, string>>({});
            const productsForCustomer = products.filter((p) => !customerId || p.customerId === customerId);
            const suppliersForCustomer = suppliers.filter((s) => !customerId || s.customerId === customerId);
            const editable = status === 'DRAFT' && !readOnly;
            const receiptRows = useMemo(() => {
              return receipts.map((r) => {
                const prod = (r.product ?? null) as Record<string, unknown> | null;
                const bin = (r.bin ?? null) as Record<string, unknown> | null;
                const uom = (r.uom ?? null) as Record<string, unknown> | null;
                const baseUom = (prod?.baseUom ?? null) as Record<string, unknown> | null;
                const sku = prod?.sku != null ? String(prod.sku) : '';
                const pname = prod?.name != null ? String(prod.name) : '';
                const productLabel = sku || pname ? `${sku}${sku && pname ? ' — ' : ''}${pname}` : String(r.productId ?? '—');
                const bcode = bin?.code != null ? String(bin.code) : '';
                const bname = bin?.name != null ? String(bin.name) : '';
                const binLabel = bcode || bname ? `${bcode}${bcode && bname ? ' — ' : ''}${bname}` : String(r.binId ?? '—');
                const uomCode = uom?.code != null ? String(uom.code) : '';
                const inputRaw = r.qtyReceivedInput;
                const inputStr =
                  inputRaw !== undefined && inputRaw !== null && String(inputRaw).trim() !== ''
                    ? String(inputRaw)
                    : '';
                const baseQtyStr = r.qtyReceived != null ? String(r.qtyReceived) : '';
                const baseCode = baseUom?.code != null ? String(baseUom.code) : '';
                const qtyReceivedLabel =
                  inputStr && uomCode && baseQtyStr && baseCode
                    ? `${inputStr} ${uomCode} → ${baseQtyStr} ${baseCode}`
                    : baseQtyStr && baseCode
                      ? `${baseQtyStr} ${baseCode}`
                      : baseQtyStr || '—';
                return {
                  id: String(r.id ?? ''),
                  receivedAt: r.receivedAt != null ? String(r.receivedAt) : '',
                  productLabel,
                  binLabel,
                  qtyReceived: qtyReceivedLabel,
                  customsClearanceStatus: String(r.customsClearanceStatus ?? 'NONE'),
                  customsHoldStartedAt: r.customsHoldStartedAt != null ? String(r.customsHoldStartedAt) : '',
                  customsReleasedAt: r.customsReleasedAt != null ? String(r.customsReleasedAt) : '',
                  customsReleaseRef: r.customsReleaseRef != null ? String(r.customsReleaseRef) : '',
                };
              });
            }, [receipts]);

            return (
              <>
                <h3 className="form-section-title">{readOnly ? 'ASN Items' : 'Edit ASN Items'}</h3>
                <p className="muted" style={{ marginBottom: 10 }}>
                  ASN: {String(row.asnNo ?? '-')} | Warehouse: {warehouseLabel} | Status: {status || '-'}
                </p>
                {status !== 'DRAFT' ? (
                  <p className="muted" style={{ marginBottom: 10 }}>
                    Hanya ASN status DRAFT yang bisa ubah item produk.
                  </p>
                ) : null}
                <div className="form-grid" style={{ marginBottom: 10 }}>
                  <div>
                    <label htmlFor="edit-asn-reference">Reference</label>
                    <input
                      id="edit-asn-reference"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      readOnly={!editable}
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-asn-expected-date">Expected date</label>
                    <input
                      id="edit-asn-expected-date"
                      type="date"
                      value={expectedAtDate}
                      onChange={(e) => setExpectedAtDate(e.target.value)}
                      readOnly={!editable}
                    />
                  </div>
                </div>
                <div className="asn-items-list">
                  {items.map((item, idx) => (
                    <div key={`edit-asn-item-${idx}`} className="asn-item-row asn-item-row--inbound">
                      <div className="asn-item-field asn-item-field--product">
                        <label>Produk #{idx + 1}</label>
                        <select
                          value={item.productId}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, productId: e.target.value, supplierId: '' } : it,
                              ),
                            )
                          }
                          disabled={!editable}
                        >
                          <option value="">Pilih produk</option>
                          {productsForCustomer.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku ?? p.code ?? '-'} - {p.name ?? '-'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="asn-item-field asn-item-field--supplier">
                        <label>Supplier</label>
                        <select
                          value={item.supplierId}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, supplierId: e.target.value } : it)),
                            )
                          }
                          disabled={!editable || !item.productId}
                        >
                          <option value="">{item.productId ? 'Pilih supplier' : 'Pilih produk dulu'}</option>
                          {(() => {
                            const product = productsForCustomer.find((p) => p.id === item.productId);
                            const mappedSupplierIds = new Set(Array.isArray(product?.supplierIds) ? product.supplierIds : []);
                            const options = suppliersForCustomer
                              .filter((s) => mappedSupplierIds.has(s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.code ?? '-'} - {s.name ?? '-'}
                                </option>
                              ));
                            if (item.supplierId && !mappedSupplierIds.has(item.supplierId)) {
                              const legacy = suppliers.find((s) => s.id === item.supplierId);
                              const legacyLabel = legacy
                                ? `${legacy.code ?? item.supplierId} - ${legacy.name ?? '-'}`
                                : item.supplierId;
                              options.unshift(
                                <option key={`legacy-${item.supplierId}`} value={item.supplierId}>
                                  {legacyLabel} (legacy)
                                </option>,
                              );
                            }
                            return options;
                          })()}
                        </select>
                      </div>
                      <div className="asn-item-field asn-item-field--supplier">
                        <label>UOM</label>
                        <select
                          value={item.uomId}
                          onChange={(e) =>
                            setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, uomId: e.target.value } : it)))
                          }
                          disabled={!editable}
                        >
                          <option value="">Pilih UOM</option>
                          {uoms
                            .filter((u) => u.isActive !== false)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.code ?? '-'} - {u.name ?? '-'}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="asn-item-field asn-item-field--qty">
                        <label>Qty expected</label>
                        <input
                          type="number"
                          min={1}
                          value={item.qtyExpected}
                          onChange={(e) =>
                            setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qtyExpected: e.target.value } : it)))
                          }
                          readOnly={!editable}
                        />
                      </div>
                      {editable ? (
                        <div className="asn-item-field asn-item-field--action">
                          <span className="asn-item-label-spacer" aria-hidden="true">
                            &nbsp;
                          </span>
                          <button
                            type="button"
                            className="btn-secondary asn-item-delete-btn"
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                            disabled={items.length <= 1}
                          >
                            Hapus
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <h3 className="form-section-title" style={{ marginTop: 16 }}>
                  Receipts &amp; bea cukai
                </h3>
                <p className="muted" style={{ marginBottom: 10 }}>
                  Receipt di gudang <strong>transit impor</strong> otomatis status <strong>HELD</strong> sampai pelepasan
                  dicatat. Pengamanan stok keluar (SO / transfer) di fase berikutnya.
                </p>
                {receiptRows.length === 0 ? (
                  <p className="muted">Belum ada receipt untuk ASN ini.</p>
                ) : (
                  <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Waktu terima</th>
                          <th>Produk</th>
                          <th>Bin</th>
                          <th>Qty (input → base)</th>
                          <th>Customs</th>
                          <th>Mulai hold</th>
                          <th>Released</th>
                          <th>Ref release</th>
                          {!readOnly ? <th>Aksi</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {receiptRows.map((rec) => (
                          <tr key={rec.id}>
                            <td>{formatInboundDateTime(rec.receivedAt)}</td>
                            <td>{rec.productLabel}</td>
                            <td>{rec.binLabel}</td>
                            <td>{rec.qtyReceived}</td>
                            <td>{rec.customsClearanceStatus}</td>
                            <td>{rec.customsHoldStartedAt ? formatInboundDateTime(rec.customsHoldStartedAt) : '—'}</td>
                            <td>{rec.customsReleasedAt ? formatInboundDateTime(rec.customsReleasedAt) : '—'}</td>
                            <td>{rec.customsReleaseRef || '—'}</td>
                            {!readOnly ? (
                              <td>
                                {rec.customsClearanceStatus === 'HELD' ? (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                    <input
                                      type="text"
                                      placeholder="Ref pelepasan (opsional)"
                                      value={releaseRefByReceiptId[rec.id] ?? ''}
                                      onChange={(e) =>
                                        setReleaseRefByReceiptId((prev) => ({ ...prev, [rec.id]: e.target.value }))
                                      }
                                      style={{ minWidth: 140, maxWidth: 200 }}
                                      aria-label={`Ref pelepasan receipt ${rec.id}`}
                                    />
                                    <button
                                      type="button"
                                      className="btn-secondary"
                                      disabled={busy || actionBusy === `release-customs-${rec.id}`}
                                      onClick={() =>
                                        (async () => {
                                          const ref = (releaseRefByReceiptId[rec.id] ?? '').trim();
                                          const ok = await run(
                                            `release-customs-${rec.id}`,
                                            'POST',
                                            `/inbound/receipts/${rec.id}/customs-release`,
                                            ref ? { releaseRef: ref } : {},
                                          );
                                          if (ok) {
                                            setReleaseRefByReceiptId((prev) => {
                                              const next = { ...prev };
                                              delete next[rec.id];
                                              return next;
                                            });
                                          }
                                        })()
                                      }
                                    >
                                      Release
                                    </button>
                                  </div>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {editable ? (
                  <div className="modal-form-actions">
                    <button
                      type="button"
                      className="btn-secondary btn-modal-action"
                      onClick={() => setItems((prev) => [...prev, { productId: '', supplierId: '', uomId: '', qtyExpected: '1' }])}
                    >
                      + Tambah item
                    </button>
                    <button type="button" className="btn-secondary btn-modal-action" onClick={onClose}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-modal-action"
                      disabled={
                        busy ||
                        items.length === 0 ||
                        items.some(
                          (it) =>
                            !it.productId || !it.supplierId || !it.uomId || Number(it.qtyExpected) <= 0,
                        )
                      }
                      onClick={() =>
                        (async () => {
                          const okHeader = await run(
                            'update-asn-header',
                            'PATCH',
                            `/inbound/asns/${String(row.id ?? '')}`,
                            {
                              referenceNo: referenceNo.trim() || undefined,
                              expectedAt: expectedAtDate
                                ? new Date(`${expectedAtDate}T00:00:00.000Z`).toISOString()
                                : undefined,
                            },
                          );
                          if (!okHeader) return;
                          const okItems = await run(
                            'update-asn-items',
                            'PATCH',
                            `/inbound/asns/${String(row.id ?? '')}/items`,
                            {
                              items: items.map((it) => ({
                                productId: it.productId,
                                supplierId: it.supplierId,
                                uomId: it.uomId,
                                qtyExpected: Number(it.qtyExpected),
                              })),
                            },
                          );
                          if (okItems) onClose();
                        })()
                      }
                    >
                      Save ASN Items
                    </button>
                  </div>
                ) : null}
              </>
            );
          }

          return <EditAsnItemsModal receipts={receiptList} />;
        }}
        onDeleteRow={async (row) => {
          await run('cancel-asn', 'DELETE', `/inbound/asns/${String(row.id ?? '')}`);
        }}
        deleteDialogTitle="Batalkan ASN?"
        deleteDialogDescription="ASN akan dibatalkan"
        deleteConfirmText="Batalkan"
      />
    </>
  );
}
