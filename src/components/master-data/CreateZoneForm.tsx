'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OptionItem, WarehouseAreaItem } from '@/src/lib/useWmsData';

type Props = {
  busy: boolean;
  readOnly?: boolean;
  warehouses: OptionItem[];
  areas: WarehouseAreaItem[];
  title?: string;
  submitLabel?: string;
  initialData?: { warehouseId?: string; areaId?: string; code?: string; name?: string };
  onCancel?: () => void;
  onSubmit: (payload: { warehouseId: string; areaId?: string; code: string; name: string }) => Promise<void>;
};

export default function CreateZoneForm({
  busy,
  readOnly = false,
  warehouses,
  areas,
  title = 'Warehouse zone',
  submitLabel = 'Create Zone',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [warehouseId, setWarehouseId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [code, setCode] = useState('ZONE-A1');
  const [name, setName] = useState('Zone A1');

  const areasForWh = useMemo(
    () => areas.filter((a) => a.warehouseId === warehouseId),
    [areas, warehouseId],
  );

  useEffect(() => {
    if (areaId && !areasForWh.some((a) => a.id === areaId)) setAreaId('');
  }, [areaId, areasForWh]);

  useEffect(() => {
    if (!initialData) return;
    setWarehouseId(initialData.warehouseId ?? '');
    setAreaId(initialData.areaId ?? '');
    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');
  }, [initialData]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <p className="muted" style={{ marginBottom: 8 }}>
        Zone bisa dihubungkan ke area, atau langsung ke warehouse tanpa area.
      </p>
      <div className="form-grid">
        <div>
          <label htmlFor="md-zone-wh">Warehouse</label>
          <select id="md-zone-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={readOnly}>
            <option value="">Pilih warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="md-zone-area">Area</label>
          <select
            id="md-zone-area"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            disabled={!warehouseId || readOnly}
          >
            <option value="">{warehouseId ? 'Tanpa area / pilih area' : 'Pilih warehouse dulu'}</option>
            {areasForWh.map((a) => (
              <option key={a.id} value={a.id}>
                {a.code ?? a.id} — {a.name ?? ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="md-zone-code">Code</label>
          <input
            id="md-zone-code"
            readOnly={readOnly}
            value={code}
            onChange={(e) => !readOnly && setCode(e.target.value)}
            placeholder="ZONE-A1"
          />
        </div>
        <div>
          <label htmlFor="md-zone-name">Name</label>
          <input
            id="md-zone-name"
            readOnly={readOnly}
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Nama zone"
          />
        </div>
      </div>
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() =>
              onSubmit({
                warehouseId,
                ...(areaId ? { areaId } : {}),
                code: code.trim(),
                name: name.trim(),
              })
            }
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
