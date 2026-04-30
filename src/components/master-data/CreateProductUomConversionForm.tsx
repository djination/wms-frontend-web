'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductBrowseField from '@/src/components/ui/ProductBrowseField';
import type { OptionItem } from '@/src/lib/useWmsData';

type FormPayload = {
  productId: string;
  fromUomId: string;
  toUomId: string;
  factor: number;
  note?: string;
  isActive?: boolean;
};

type Props = {
  busy: boolean;
  readOnly?: boolean;
  products: OptionItem[];
  uoms: OptionItem[];
  title?: string;
  submitLabel?: string;
  initialData?: {
    productId?: string;
    fromUomId?: string;
    toUomId?: string;
    factor?: string;
    note?: string;
    isActive?: boolean;
  };
  onCancel?: () => void;
  onSubmit: (payload: FormPayload) => Promise<void>;
};

export default function CreateProductUomConversionForm({
  busy,
  readOnly = false,
  products,
  uoms,
  title = 'Product UOM Conversion',
  submitLabel = 'Create Conversion',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [productId, setProductId] = useState('');
  const [fromUomId, setFromUomId] = useState('');
  const [toUomId, setToUomId] = useState('');
  const [factor, setFactor] = useState('1');
  const [note, setNote] = useState('');
  const [isActive, setIsActive] = useState(true);

  const activeUoms = useMemo(() => uoms.filter((u) => u.isActive !== false), [uoms]);

  useEffect(() => {
    if (!initialData) return;
    setProductId(initialData.productId ?? '');
    setFromUomId(initialData.fromUomId ?? '');
    setToUomId(initialData.toUomId ?? '');
    setFactor(initialData.factor ?? '1');
    setNote(initialData.note ?? '');
    setIsActive(initialData.isActive ?? true);
  }, [initialData?.productId, initialData?.fromUomId, initialData?.toUomId, initialData?.factor, initialData?.note, initialData?.isActive]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <div className="form-grid">
        <div className="full-row">
          <ProductBrowseField
            label="Product"
            products={products}
            selectedProductId={productId}
            onSelectProduct={setProductId}
            disabled={busy || readOnly}
            emptyMessage="Tidak ada product tersedia."
          />
        </div>
        <div>
          <label htmlFor="md-puc-from-uom">From UOM</label>
          <select
            id="md-puc-from-uom"
            value={fromUomId}
            onChange={(e) => setFromUomId(e.target.value)}
            disabled={readOnly}
          >
            <option value="">Pilih from UOM</option>
            {activeUoms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code ?? u.id} - {u.name ?? '-'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="md-puc-to-uom">To UOM</label>
          <select
            id="md-puc-to-uom"
            value={toUomId}
            onChange={(e) => setToUomId(e.target.value)}
            disabled={readOnly}
          >
            <option value="">Pilih to UOM</option>
            {activeUoms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code ?? u.id} - {u.name ?? '-'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="md-puc-factor">Factor</label>
          <input
            id="md-puc-factor"
            type="number"
            min={0.000001}
            step="any"
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <div className="full-row">
          <label htmlFor="md-puc-note">Note</label>
          <input id="md-puc-note" value={note} onChange={(e) => setNote(e.target.value)} readOnly={readOnly} placeholder="Opsional" />
        </div>
        <label className="checkbox-row full-row">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={readOnly}
          />
          Active
        </label>
      </div>
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() =>
              onSubmit({
                productId,
                fromUomId,
                toUomId,
                factor: Number(factor),
                note: note.trim() || undefined,
                isActive,
              })
            }
            disabled={busy || !productId || !fromUomId || !toUomId || Number(factor) <= 0}
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
