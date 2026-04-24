'use client';

import { useState } from 'react';
import type { SimpleTableRow } from '@/src/components/ui/SimpleTable';

export type EditField = {
  key: string;
  label: string;
  type?: 'text' | 'select' | 'boolean';
  options?: Array<{ value: string; label: string }>;
};

type Props = {
  row: SimpleTableRow;
  onClose: () => void;
  busy: boolean;
  fields: EditField[];
  onUpdate: (id: string, body: Record<string, unknown>) => Promise<void>;
};

export default function MasterEntityEditDetail({ row, onClose, busy, fields, onUpdate }: Props) {
  const id = String(row.id ?? '');
  const [form, setForm] = useState<Record<string, unknown>>(
    () => Object.fromEntries(fields.map((field) => [field.key, row[field.key]])),
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const save = async () => {
    if (!id) return;
    try {
      await onUpdate(id, form);
      onClose();
    } catch (error) {
      console.error('Error saving data:', error);
      setLocalError('Failed to save data');
      throw error;
    }
  };

  return (
    <div className="product-edit-detail">
      <div className="form-grid product-edit-form">
        {fields.map((field) => (
          <div key={field.key} className={field.type === 'boolean' ? 'full-row checkbox-row' : undefined}>
            <label htmlFor={`edit-${field.key}`}>{field.label}</label>
            {field.type === 'select' ? (
              <select
                id={`edit-${field.key}`}
                value={String(form[field.key] ?? '')}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                disabled={busy}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'boolean' ? (
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(form[field.key])}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                  disabled={busy}
                />
                {field.label}
              </label>
            ) : (
              <input
                id={`edit-${field.key}`}
                value={String(form[field.key] ?? '')}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                disabled={busy}
              />
            )}
          </div>
        ))}
      </div>
      {localError ? <p className="error">{localError}</p> : null}
      <div className="row product-edit-actions">
        <button type="button" onClick={() => void save()} disabled={busy || !id}>
          Save changes
        </button>
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
