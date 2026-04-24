'use client';

import { useState } from 'react';
import type { SimpleTableRow } from '@/src/components/ui/SimpleTable';

type Props = {
  row: SimpleTableRow;
  onClose: () => void;
  busy: boolean;
  readOnly?: boolean;
  onUpdate: (id: string, body: { assignedTo?: string; status?: string }) => Promise<void>;
};

export default function TaskEditDetail({ row, onClose, busy, readOnly = false, onUpdate }: Props) {
  const id = String(row.id ?? '');
  const [assignedTo, setAssignedTo] = useState(String(row.assignedTo ?? ''));
  const [status, setStatus] = useState(String(row.status ?? 'OPEN'));
  const [localError, setLocalError] = useState<string | null>(null);

  const save = async () => {
    if (!id) return;
    try {
      await onUpdate(id, {
        assignedTo: assignedTo.trim() || undefined,
        status,
      });
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
      setLocalError('Failed to save task');
      throw error;
    }
  };

  return (
    <div className="product-edit-detail">
      <div className="form-grid product-edit-form">
        <div>
          <label htmlFor="task-edit-id">Task ID</label>
          <input id="task-edit-id" value={id} readOnly disabled />
        </div>
        <div>
          <label htmlFor="task-edit-assigned">Assigned To</label>
          <input
            id="task-edit-assigned"
            readOnly={readOnly}
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            disabled={!readOnly && busy}
          />
        </div>
        <div>
          <label htmlFor="task-edit-status">Status</label>
          <select
            id="task-edit-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={busy || readOnly}
          >
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>
      {localError ? <p className="error">{localError}</p> : null}
      {!readOnly ? (
        <div className="row product-edit-actions">
          <button type="button" onClick={() => void save()} disabled={busy || !id}>
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
