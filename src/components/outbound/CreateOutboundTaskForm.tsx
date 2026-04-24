'use client';

import { useMemo, useState } from 'react';
import type { OptionItem, SalesOrderRow } from '@/src/lib/useWmsData';

const TASK_TYPES = ['PICKING', 'PACKING', 'LOADING'] as const;

type Payload = {
  salesOrderId: string;
  salesOrderItemId: string;
  waveId?: string;
  sourceBinId?: string;
  taskType: string;
  qtyTask: number;
  assignedTo?: string;
};

type Props = {
  busy: boolean;
  salesOrders: SalesOrderRow[];
  bins: OptionItem[];
  onSubmit: (payload: Payload) => Promise<void>;
};

export default function CreateOutboundTaskForm({ busy, salesOrders, bins, onSubmit }: Props) {
  const [salesOrderId, setSalesOrderId] = useState('');
  const [salesOrderItemId, setSalesOrderItemId] = useState('');
  const [waveId, setWaveId] = useState('');
  const [sourceBinId, setSourceBinId] = useState('');
  const [taskType, setTaskType] = useState<string>('PICKING');
  const [qtyTask, setQtyTask] = useState('5');
  const [assignedTo, setAssignedTo] = useState('');

  const order = useMemo(
    () => salesOrders.find((s) => s.id === salesOrderId),
    [salesOrders, salesOrderId],
  );

  const items = order?.items ?? [];

  const binsForWarehouse = useMemo(() => {
    const wid = order?.warehouseId;
    if (!wid) return bins;
    return bins.filter((b) => b.warehouseId === wid);
  }, [bins, order?.warehouseId]);

  return (
    <>
      <h3 className="form-section-title">Outbound task (pick / pack / load)</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="ob-task-so">Sales order</label>
          <select
            id="ob-task-so"
            value={salesOrderId}
            onChange={(e) => {
              setSalesOrderId(e.target.value);
              setSalesOrderItemId('');
            }}
          >
            <option value="">Pilih sales order</option>
            {salesOrders.map((so) => (
              <option key={so.id} value={so.id}>
                {so.orderNo} — {so.status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-task-line">Baris order (SKU)</label>
          <select id="ob-task-line" value={salesOrderItemId} onChange={(e) => setSalesOrderItemId(e.target.value)}>
            <option value="">Pilih baris</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>
                {it.product?.sku ?? it.productId} — qty {String(it.qtyOrdered)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-task-wave">Wave ID</label>
          <input id="ob-task-wave" value={waveId} onChange={(e) => setWaveId(e.target.value)} placeholder="Opsional" />
        </div>
        <div>
          <label htmlFor="ob-task-bin">Source bin</label>
          <select id="ob-task-bin" value={sourceBinId} onChange={(e) => setSourceBinId(e.target.value)}>
            <option value="">Opsional (warehouse SO)</option>
            {binsForWarehouse.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code ?? b.id} — {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-task-type">Task type</label>
          <select id="ob-task-type" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-task-qty">Qty task</label>
          <input id="ob-task-qty" value={qtyTask} onChange={(e) => setQtyTask(e.target.value)} type="number" min={0.0001} step="any" />
        </div>
        <div>
          <label htmlFor="ob-task-assign">Assigned to</label>
          <input id="ob-task-assign" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Opsional" />
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            salesOrderId,
            salesOrderItemId,
            waveId: waveId.trim() || undefined,
            sourceBinId: sourceBinId || undefined,
            taskType,
            qtyTask: Number(qtyTask),
            assignedTo: assignedTo.trim() || undefined,
          })
        }
        disabled={busy || !salesOrderId || !salesOrderItemId || Number(qtyTask) <= 0}
      >
        Buat task
      </button>
    </>
  );
}
