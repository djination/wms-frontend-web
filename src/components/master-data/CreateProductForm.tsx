'use client';

import { useEffect, useMemo, useState } from 'react';
import { OptionItem } from '@/src/lib/useWmsData';

type Props = {
  busy: boolean;
  readOnly?: boolean;
  customers: OptionItem[];
  suppliers: OptionItem[];
  title?: string;
  submitLabel?: string;
  initialData?: { customerId?: string; sku?: string; name?: string; supplierIds?: string[] };
  onCancel?: () => void;
  onSubmit: (payload: { customerId: string; sku: string; name: string; supplierIds: string[] }) => Promise<void>;
};

export default function CreateProductForm({
  busy,
  readOnly = false,
  customers,
  suppliers,
  title = 'Product',
  submitLabel = 'Create Product',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [customerId, setCustomerId] = useState('');
  const [sku, setSku] = useState('SKU-001');
  const [name, setName] = useState('Produk A 500ml');
  const [supplierIds, setSupplierIds] = useState<string[]>([]);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );
  const browsedCustomers = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      `${c.code ?? ''} ${c.name ?? ''}`.toLowerCase().includes(needle),
    );
  }, [customers, customerQuery]);

  const suppliersForCustomer = useMemo(
    () => suppliers.filter((s) => !customerId || s.customerId === customerId),
    [suppliers, customerId],
  );

  useEffect(() => {
    if (!customerId) return;
    if (!customers.some((c) => c.id === customerId)) {
      setCustomerId('');
    }
  }, [customerId, customers]);

  useEffect(() => {
    const allowed = new Set(suppliersForCustomer.map((s) => s.id));
    setSupplierIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [suppliersForCustomer]);

  useEffect(() => {
    if (!initialData) return;
    setCustomerId(initialData.customerId ?? '');
    setSku(initialData.sku ?? '');
    setName(initialData.name ?? '');
    setSupplierIds(initialData.supplierIds ?? []);
  }, [initialData?.customerId, initialData?.sku, initialData?.name, initialData?.supplierIds]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <div className="form-grid">
        <div className="full-row">
          <label htmlFor="md-prod-customer-browse">Customer</label>
          <div className="browse-field">
            <input
              id="md-prod-customer-browse"
              readOnly
              value={
                selectedCustomer
                  ? `${selectedCustomer.code ?? '-'} - ${selectedCustomer.name ?? '-'}`
                  : 'Pilih customer…'
              }
              placeholder="Browse customer"
              onClick={() => !readOnly && setCustomerModalOpen(true)}
            />
            <button
              type="button"
              className="browse-trigger"
              onClick={() => setCustomerModalOpen(true)}
              disabled={busy || readOnly}
              aria-label="Browse customer"
            >
              Search
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="md-prod-sku">SKU</label>
          <input
            id="md-prod-sku"
            readOnly={readOnly}
            value={sku}
            onChange={(e) => !readOnly && setSku(e.target.value)}
            placeholder="SKU-001"
          />
        </div>
        <div>
          <label htmlFor="md-prod-name">Product name</label>
          <input
            id="md-prod-name"
            readOnly={readOnly}
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Nama produk"
          />
        </div>
        <div className="full-row">
          <label htmlFor="md-prod-suppliers">Suppliers (multi)</label>
          <select
            id="md-prod-suppliers"
            multiple
            value={supplierIds}
            onChange={(e) =>
              setSupplierIds(Array.from(e.target.selectedOptions).map((opt) => opt.value))
            }
            disabled={readOnly || !customerId}
            style={{ minHeight: 120 }}
          >
            {suppliersForCustomer.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code ?? '-'} - {s.name ?? '-'}
              </option>
            ))}
          </select>
        </div>
      </div>
      {customerModalOpen && !readOnly ? (
        <div className="modal-backdrop" onClick={() => setCustomerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Pilih customer</strong>
              <button type="button" className="btn-secondary" onClick={() => setCustomerModalOpen(false)}>
                Tutup
              </button>
            </div>
            <label htmlFor="md-prod-modal-search" className="modal-search-label">
              Cari customer
            </label>
            <input
              id="md-prod-modal-search"
              className="modal-search"
              placeholder="Cari code atau nama…"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
            />
            <div className="modal-list">
              <button
                type="button"
                className={!customerId ? 'modal-item active' : 'modal-item'}
                onClick={() => {
                  setCustomerId('');
                  setCustomerModalOpen(false);
                }}
              >
                — Belum pilih —
              </button>
              {browsedCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={customerId === c.id ? 'modal-item active' : 'modal-item'}
                  onClick={() => {
                    setCustomerId(c.id);
                    setCustomerModalOpen(false);
                  }}
                >
                  {c.code} - {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() => onSubmit({ customerId, sku, name, supplierIds })}
            disabled={busy || !customerId}
          >
            {submitLabel}
          </button>
          {onCancel ? (
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
