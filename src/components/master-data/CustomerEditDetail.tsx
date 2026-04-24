'use client';

import { useState } from 'react';
import type { SimpleTableRow } from '@/src/components/ui/SimpleTable';

type Props = {
  row: SimpleTableRow;
  onClose: () => void;
  busy: boolean;
  onUpdate: (id: string, body: { code: string; name: string; type: string; isActive: boolean }) => Promise<void>;
};

export default function CustomerEditDetail({ row, onClose, busy, onUpdate }: Props) {
  const id = String(row.id ?? '');
  const [code, setCode] = useState(String(row.code ?? ''));
  const [name, setName] = useState(String(row.name ?? ''));
  const [type, setType] = useState(String(row.type ?? 'SHARED'));
  const [isActive, setIsActive] = useState(Boolean(row.isActive));
  const [localError, setLocalError] = useState<string | null>(null);

  const save = async () => {
    if (!id || !code.trim() || !name.trim()) return;
    try {
      await onUpdate(id, { code: code.trim(), name: name.trim(), type, isActive });
      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
      setLocalError('Failed to save customer');
      throw error;
    }
  };

  return (
    <div className="product-edit-detail">
      <div className="form-grid product-edit-form">
        <div>
          <label htmlFor="cust-edit-code">Code</label>
          <input id="cust-edit-code" value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label htmlFor="cust-edit-name">Name</label>
          <input id="cust-edit-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </div>
        <div>
          <label htmlFor="cust-edit-type">Type</label>
          <select id="cust-edit-type" value={type} onChange={(e) => setType(e.target.value)} disabled={busy}>
            <option value="SHARED">SHARED</option>
            <option value="DEDICATED">DEDICATED</option>
          </select>
        </div>
        <label className="full-row checkbox-row">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={busy} />
          Active
        </label>
      </div>
      {localError ? <p className="error">{localError}</p> : null}
      <div className="row product-edit-actions">
        <button type="button" onClick={() => void save()} disabled={busy || !id || !code.trim() || !name.trim()}>
          Save changes
        </button>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
