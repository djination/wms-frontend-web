'use client';

import { useEffect, useState } from 'react';
import type { SimpleTableRow } from '@/src/components/ui/SimpleTable';

type Props = {
  row: SimpleTableRow;
  onClose: () => void;
  busy: boolean;
  onUpdate: (id: string, body: { name: string; sku: string; isActive: boolean }) => Promise<void>;
};

export default function ProductEditDetail({ row, onClose, busy, onUpdate }: Props) {
  const id = String(row.id ?? '');
  const [sku, setSku] = useState(String(row.sku ?? ''));
  const [name, setName] = useState(String(row.name ?? ''));
  const [isActive, setIsActive] = useState(Boolean(row.isActive));
  const [localError, setLocalError] = useState<string | null>(null);

  const save = async () => {
    if (!id || !name.trim() || !sku.trim()) return;
    try {
      await onUpdate(id, { name: name.trim(), sku: sku.trim() as string, isActive });
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      setLocalError('Failed to save product');
      throw error;
    }
  };
  
  return (
    <div className="product-edit-detail">
      <div className="form-grid product-edit-form">
        <div className="full-row">
          <label htmlFor="prod-edit-sku">SKU</label>
          <input id="prod-edit-sku" value={sku} onChange={(e) => setSku(e.target.value)} disabled={busy} />
        </div>
        <div className="full-row">
          <label htmlFor="prod-edit-name">Name</label>
          <input id="prod-edit-name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        </div>
        <label className="full-row checkbox-row">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={busy}
          />
          Active
        </label>
      </div>
      <div className="row product-edit-actions">
        <button type="button" onClick={() => void save()} disabled={busy || !name.trim() || !id}>
          Save changes
        </button>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
