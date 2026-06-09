'use client';

import { useEffect, useMemo, useState } from 'react';
import CustomerBrowseField from '@/src/components/ui/CustomerBrowseField';
import { OptionItem } from '@/src/lib/useWmsData';

type Props = {
  busy: boolean;
  readOnly?: boolean;
  customers: OptionItem[];
  suppliers: OptionItem[];
  uoms: OptionItem[];
  title?: string;
  submitLabel?: string;
  initialData?: { customerId?: string; sku?: string; name?: string; supplierIds?: string[]; baseUomId?: string };
  onCancel?: () => void;
  onSubmit: (payload: { customerId: string; sku: string; name: string; supplierIds: string[]; baseUomId?: string }) => Promise<void>;
};

export default function CreateProductForm({
  busy,
  readOnly = false,
  customers,
  suppliers,
  uoms,
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
  const [baseUomId, setBaseUomId] = useState('');

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
    setBaseUomId(initialData.baseUomId ?? '');
  }, [initialData]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <div className="form-grid">
        <div className="full-row">
          <CustomerBrowseField
            label="Customer"
            customers={customers}
            selectedCustomerId={customerId}
            onSelectCustomer={setCustomerId}
            disabled={busy || readOnly}
          />
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
        <div>
          <label htmlFor="md-prod-base-uom">Base UOM</label>
          <select
            id="md-prod-base-uom"
            value={baseUomId}
            onChange={(e) => setBaseUomId(e.target.value)}
            disabled={readOnly}
          >
            <option value="">Pilih base UOM</option>
            {uoms.filter((u) => u.isActive !== false).map((u) => (
              <option key={u.id} value={u.id}>
                {u.code ?? u.id} - {u.name ?? '-'}
              </option>
            ))}
          </select>
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
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() => onSubmit({ customerId, sku, name, supplierIds, baseUomId: baseUomId || undefined })}
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
