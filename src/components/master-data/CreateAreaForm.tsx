'use client';

import { useEffect, useState } from 'react';
import type { OptionItem } from '@/src/lib/useWmsData';

type Props = {
  busy: boolean;
  readOnly?: boolean;
  warehouses: OptionItem[];
  title?: string;
  submitLabel?: string;
  initialData?: { warehouseId?: string; code?: string; name?: string };
  onCancel?: () => void;
  onSubmit: (payload: { warehouseId: string; code: string; name: string }) => Promise<void>;
};

export default function CreateAreaForm({
  busy,
  readOnly = false,
  warehouses,
  title = 'Warehouse area',
  submitLabel = 'Create Area',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [warehouseId, setWarehouseId] = useState('');
  const [code, setCode] = useState('AREA-A');
  const [name, setName] = useState('Area A');

  useEffect(() => {
    if (!initialData) return;
    setWarehouseId(initialData.warehouseId ?? '');
    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');
  }, [initialData]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="md-area-wh">Warehouse</label>
          <select id="md-area-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={readOnly}>
            <option value="">Pilih warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="md-area-code">Code</label>
          <input
            id="md-area-code"
            readOnly={readOnly}
            value={code}
            onChange={(e) => !readOnly && setCode(e.target.value)}
            placeholder="AREA-A"
          />
        </div>
        <div>
          <label htmlFor="md-area-name">Name</label>
          <input
            id="md-area-name"
            readOnly={readOnly}
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Nama area"
          />
        </div>
      </div>
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() => onSubmit({ warehouseId, code: code.trim(), name: name.trim() })}
            disabled={busy || !warehouseId || !code.trim() || !name.trim()}
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
