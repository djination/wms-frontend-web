'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OptionItem, WarehouseZoneItem } from '@/src/lib/useWmsData';

type Props = {
  busy: boolean;
  readOnly?: boolean;
  warehouses: OptionItem[];
  zones: WarehouseZoneItem[];
  title?: string;
  submitLabel?: string;
  initialData?: { warehouseId?: string; zoneId?: string; code?: string; name?: string };
  onCancel?: () => void;
  onSubmit: (payload: { warehouseId: string; zoneId: string; code: string; name: string }) => Promise<void>;
};

export default function CreateBinForm({
  busy,
  readOnly = false,
  warehouses,
  zones,
  title = 'Warehouse bin',
  submitLabel = 'Create Bin',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [warehouseId, setWarehouseId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [code, setCode] = useState('BIN-A1-001');
  const [name, setName] = useState('Bin A1-001');

  const zonesForWh = useMemo(
    () => zones.filter((z) => z.warehouseId === warehouseId),
    [zones, warehouseId],
  );

  useEffect(() => {
    if (zoneId && !zonesForWh.some((z) => z.id === zoneId)) setZoneId('');
  }, [zoneId, zonesForWh]);

  useEffect(() => {
    if (!initialData) return;
    setWarehouseId(initialData.warehouseId ?? '');
    setZoneId(initialData.zoneId ?? '');
    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');
  }, [initialData]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <p className="muted" style={{ marginBottom: 8 }}>
        Bin harus berada di dalam zone milik warehouse yang sama (master zone dari API).
      </p>
      <div className="form-grid">
        <div>
          <label htmlFor="md-bin-wh">Warehouse</label>
          <select id="md-bin-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={readOnly}>
            <option value="">Pilih warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="md-bin-zone">Zone</label>
          <select
            id="md-bin-zone"
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            disabled={!warehouseId || readOnly}
          >
            <option value="">{warehouseId ? 'Pilih zone' : 'Pilih warehouse dulu'}</option>
            {zonesForWh.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code ?? z.id} — {z.name ?? ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="md-bin-code">Code</label>
          <input
            id="md-bin-code"
            readOnly={readOnly}
            value={code}
            onChange={(e) => !readOnly && setCode(e.target.value)}
            placeholder="BIN-A1-001"
          />
        </div>
        <div>
          <label htmlFor="md-bin-name">Name</label>
          <input
            id="md-bin-name"
            readOnly={readOnly}
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Nama bin"
          />
        </div>
      </div>
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() => onSubmit({ warehouseId, zoneId, code: code.trim(), name: name.trim() })}
            disabled={busy || !warehouseId || !zoneId || !code.trim() || !name.trim()}
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
