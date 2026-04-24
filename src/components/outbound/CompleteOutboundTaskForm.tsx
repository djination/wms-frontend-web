'use client';

import { useState } from 'react';

type Props = {
  busy: boolean;
  taskOptions: Array<{ id: string; label: string }>;
  onSubmit: (taskId: string, payload: { qtyDone?: number; note?: string }) => Promise<void>;
};

export default function CompleteOutboundTaskForm({ busy, taskOptions, onSubmit }: Props) {
  const [taskId, setTaskId] = useState('');
  const [qtyDone, setQtyDone] = useState('');
  const [note, setNote] = useState('');

  return (
    <>
      <h3 className="form-section-title">Selesaikan task</h3>
      <div className="form-grid">
        <div className="full-row">
          <label htmlFor="ob-cmp-task">Task</label>
          <select id="ob-cmp-task" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
            <option value="">Pilih task</option>
            {taskOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-cmp-qty">Qty selesai</label>
          <input
            id="ob-cmp-qty"
            value={qtyDone}
            onChange={(e) => setQtyDone(e.target.value)}
            type="number"
            min={0.0001}
            step="any"
            placeholder="Kosong = sisa penuh"
          />
        </div>
        <div>
          <label htmlFor="ob-cmp-note">Catatan</label>
          <input id="ob-cmp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onSubmit(taskId, {
            qtyDone: qtyDone.trim() ? Number(qtyDone) : undefined,
            note: note.trim() || undefined,
          })
        }
        disabled={busy || !taskId}
      >
        Complete task
      </button>
    </>
  );
}
