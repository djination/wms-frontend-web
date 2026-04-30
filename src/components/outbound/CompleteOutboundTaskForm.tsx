'use client';

import { useEffect, useState } from 'react';

type Props = {
  busy: boolean;
  taskOptions: Array<{ id: string; label: string; defaultUomId?: string; uomOptions: Array<{ id: string; label: string }> }>;
  onSubmit: (taskId: string, payload: { qtyDone?: number; uomId?: string; note?: string; serialNos?: string[] }) => Promise<void>;
};

export default function CompleteOutboundTaskForm({ busy, taskOptions, onSubmit }: Props) {
  const [taskId, setTaskId] = useState('');
  const [qtyDone, setQtyDone] = useState('');
  const [qtyDoneUomId, setQtyDoneUomId] = useState('');
  const [note, setNote] = useState('');
  const [serialNosText, setSerialNosText] = useState('');
  const selectedTask = taskOptions.find((t) => t.id === taskId);
  useEffect(() => {
    const fallback = selectedTask?.defaultUomId ?? selectedTask?.uomOptions[0]?.id ?? '';
    setQtyDoneUomId(fallback);
  }, [selectedTask?.id, selectedTask?.defaultUomId, selectedTask?.uomOptions]);

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
          <div className="qty-with-uom">
            <input
              id="ob-cmp-qty"
              value={qtyDone}
              onChange={(e) => setQtyDone(e.target.value)}
              type="number"
              min={0.0001}
              step="any"
              placeholder="Kosong = sisa penuh"
            />
            <select
              id="ob-cmp-qty-uom"
              value={qtyDoneUomId}
              onChange={(e) => setQtyDoneUomId(e.target.value)}
              disabled={!selectedTask}
            >
              {selectedTask && selectedTask.uomOptions.length > 0 ? (
                selectedTask.uomOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value="">{selectedTask ? 'Pilih UOM' : 'Pilih task dulu'}</option>
              )}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ob-cmp-note">Catatan</label>
          <input id="ob-cmp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
        </div>
        <div className="full-row">
          <label htmlFor="ob-cmp-serials">Serial Nos</label>
          <input
            id="ob-cmp-serials"
            value={serialNosText}
            onChange={(e) => setSerialNosText(e.target.value)}
            placeholder="Pisahkan koma, contoh: SN-OUT-001,SN-OUT-002"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onSubmit(taskId, {
            qtyDone: qtyDone.trim() ? Number(qtyDone) : undefined,
            uomId: qtyDone.trim() ? qtyDoneUomId || undefined : undefined,
            note: note.trim() || undefined,
            serialNos: serialNosText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        disabled={busy || !taskId}
      >
        Complete task
      </button>
    </>
  );
}
