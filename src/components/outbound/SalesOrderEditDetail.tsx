'use client';

import { useMemo, useState } from 'react';
import type { SimpleTableRow } from '@/src/components/ui/SimpleTable';
import type { OptionItem } from '@/src/lib/useWmsData';

type Props = {
  row: SimpleTableRow;
  salesOrder?: Record<string, unknown>;
  products: OptionItem[];
  onClose: () => void;
  busy: boolean;
  readOnly?: boolean;
  onUpdate: (
    id: string,
    body: { referenceNo?: string; consigneeName?: string; requestedAt?: string; status?: string },
  ) => Promise<void>;
  onUpdateItems: (
    id: string,
    body: { items: Array<{ productId: string; qtyOrdered: number }> },
  ) => Promise<void>;
};

export default function SalesOrderEditDetail({
  row,
  salesOrder,
  products,
  onClose,
  busy,
  readOnly = false,
  onUpdate,
  onUpdateItems,
}: Props) {
  const id = String(row.id ?? '');
  const [referenceNo, setReferenceNo] = useState(String(row.referenceNo ?? ''));
  const [consigneeName, setConsigneeName] = useState(String(row.consigneeName ?? ''));
  const [requestedAt, setRequestedAt] = useState(String(row.requestedAt ?? '').slice(0, 10));
  const [status, setStatus] = useState(String(row.status ?? 'RELEASED'));
  const [items, setItems] = useState<Array<{ productId: string; qtyOrdered: string }>>(() => {
    const rawItems = Array.isArray(salesOrder?.items) ? (salesOrder.items as Record<string, unknown>[]) : [];
    const mapped = rawItems.map((it) => ({
      productId: it.productId != null ? String(it.productId) : '',
      qtyOrdered: it.qtyOrdered != null ? String(it.qtyOrdered) : '0',
    }));
    return mapped.length > 0 ? mapped : [{ productId: '', qtyOrdered: '1' }];
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const customerId = salesOrder?.customerId != null ? String(salesOrder.customerId) : '';
  const editableItems = !readOnly && (status === 'DRAFT' || status === 'RELEASED' || status === 'ALLOCATED');
  const productsForCustomer = useMemo(
    () => products.filter((p) => !customerId || p.customerId === customerId),
    [products, customerId],
  );

  const save = async () => {
    if (!id) return;
    try {
      await onUpdate(id, {
        referenceNo: referenceNo.trim() || undefined,
        consigneeName: consigneeName.trim() || undefined,
        requestedAt: requestedAt ? new Date(`${requestedAt}T00:00:00.000Z`).toISOString() : undefined,
        status,
      });
      if (editableItems) {
        await onUpdateItems(id, {
          items: items.map((it) => ({
            productId: it.productId,
            qtyOrdered: Number(it.qtyOrdered),
          })),
        });
      }
      onClose();
    } catch (error) {
      console.error('Error saving sales order:', error);
      setLocalError('Failed to save sales order');
      throw error;
    }
  };

  return (
    <div className="product-edit-detail">
      <div className="form-grid product-edit-form">
        <div>
          <label htmlFor="so-edit-order-no">Order No</label>
          <input id="so-edit-order-no" value={String(row.orderNo ?? '')} readOnly disabled />
        </div>
        <div>
          <label htmlFor="so-edit-status">Status</label>
          <select
            id="so-edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={busy || readOnly}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="RELEASED">RELEASED</option>
            <option value="ALLOCATED">ALLOCATED</option>
            <option value="PICKING">PICKING</option>
            <option value="PACKING">PACKING</option>
            <option value="LOADING">LOADING</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div>
          <label htmlFor="so-edit-reference">Reference</label>
          <input
            id="so-edit-reference"
            readOnly={readOnly}
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            disabled={!readOnly && busy}
          />
        </div>
        <div>
          <label htmlFor="so-edit-consignee">Consignee</label>
          <input
            id="so-edit-consignee"
            readOnly={readOnly}
            value={consigneeName}
            onChange={(e) => setConsigneeName(e.target.value)}
            disabled={!readOnly && busy}
          />
        </div>
        <div>
          <label htmlFor="so-edit-requested">Requested At</label>
          <input
            id="so-edit-requested"
            type="date"
            value={requestedAt}
            onChange={(e) => setRequestedAt(e.target.value)}
            disabled={busy || readOnly}
          />
        </div>
      </div>
      <div className="asn-items-list" style={{ marginTop: 12 }}>
        <label className="asn-items-section-title">Items</label>
        {!editableItems ? (
          <p className="muted" style={{ marginTop: 6 }}>
            Item hanya bisa diubah saat status DRAFT, RELEASED, atau ALLOCATED.
          </p>
        ) : null}
        {items.map((item, idx) => (
          <div key={`so-item-${idx}`} className="asn-item-row">
            <div className="asn-item-field asn-item-field--product">
              <label>Product #{idx + 1}</label>
              <select
                value={item.productId}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it)),
                  )
                }
                disabled={busy || !editableItems}
              >
                <option value="">Pilih product</option>
                {productsForCustomer.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku ?? p.code ?? '-'} - {p.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div className="asn-item-field asn-item-field--qty">
              <label>Qty ordered</label>
              <input
                type="number"
                min={0.0001}
                step="any"
                value={item.qtyOrdered}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) => (i === idx ? { ...it, qtyOrdered: e.target.value } : it)),
                  )
                }
                readOnly={!editableItems}
              />
            </div>
            {editableItems ? (
              <div className="asn-item-field asn-item-field--action">
                <span className="asn-item-label-spacer" aria-hidden="true">
                  &nbsp;
                </span>
                <button
                  type="button"
                  className="btn-secondary asn-item-delete-btn"
                  disabled={busy || items.length <= 1}
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                >
                  Hapus
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {editableItems ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setItems((prev) => [...prev, { productId: '', qtyOrdered: '1' }])}
            disabled={busy}
          >
            + Tambah item
          </button>
        ) : null}
      </div>
      {localError ? <p className="error">{localError}</p> : null}
      {!readOnly ? (
        <div className="row product-edit-actions">
          <button
            type="button"
            onClick={() => void save()}
            disabled={
              busy ||
              !id ||
              items.length === 0 ||
              items.some((it) => !it.productId || Number(it.qtyOrdered) <= 0)
            }
          >
            Save changes
          </button>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
