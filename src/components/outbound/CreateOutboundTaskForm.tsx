'use client';

import { useEffect, useMemo, useState } from 'react';
import type { OptionItem, SalesOrderRow } from '@/src/lib/useWmsData';

const TASK_TYPES = ['PICKING', 'PACKING', 'LOADING'] as const;

type Payload = {
  salesOrderId: string;
  salesOrderItemId: string;
  waveId?: string;
  sourceBinId?: string;
  taskType: string;
  qtyTask: number;
  uomId?: string;
  assignedTo?: string;
  serialNos?: string[];
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
  const [qtyTaskUomId, setQtyTaskUomId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [serialNosText, setSerialNosText] = useState('');

  const order = useMemo(
    () => salesOrders.find((s) => s.id === salesOrderId),
    [salesOrders, salesOrderId],
  );

  const items = order?.items ?? [];
  const selectedItem = useMemo(
    () => items.find((it) => it.id === salesOrderItemId),
    [items, salesOrderItemId],
  );
  const qtyUomOptions = useMemo(() => {
    const product = (selectedItem?.product ?? null) as
      | {
          baseUomId?: string;
          baseUom?: { id?: string; code?: string; name?: string } | null;
          uomConversions?: Array<{ fromUomId?: string; fromUom?: { code?: string; name?: string } | null; isActive?: boolean }> | null;
        }
      | null;
    if (!product) return [] as Array<{ id: string; label: string }>;
    const out: Array<{ id: string; label: string }> = [];
    if (product.baseUomId) {
      const baseCode = product.baseUom?.code ?? product.baseUomId;
      const baseName = product.baseUom?.name ?? '';
      out.push({ id: product.baseUomId, label: `${baseCode}${baseName ? ` - ${baseName}` : ''}` });
    }
    const convs = Array.isArray(product.uomConversions) ? product.uomConversions : [];
    for (const conv of convs) {
      if (conv?.isActive === false) continue;
      const fromUomId = conv?.fromUomId ?? '';
      if (!fromUomId || out.some((x) => x.id === fromUomId)) continue;
      const fromCode = conv.fromUom?.code ?? fromUomId;
      const fromName = conv.fromUom?.name ?? '';
      out.push({ id: fromUomId, label: `${fromCode}${fromName ? ` - ${fromName}` : ''}` });
    }
    return out;
  }, [selectedItem]);
  useEffect(() => {
    if (qtyTaskUomId && qtyUomOptions.some((opt) => opt.id === qtyTaskUomId)) return;
    const next = qtyUomOptions[0]?.id ?? '';
    setQtyTaskUomId(next);
  }, [qtyTaskUomId, qtyUomOptions]);

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
          <div className="qty-with-uom">
            <input id="ob-task-qty" value={qtyTask} onChange={(e) => setQtyTask(e.target.value)} type="number" min={0.0001} step="any" />
            <select id="ob-task-qty-uom" value={qtyTaskUomId} onChange={(e) => setQtyTaskUomId(e.target.value)} disabled={!selectedItem}>
              {qtyUomOptions.length > 0 ? (
                qtyUomOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value="">{selectedItem ? 'Pilih UOM' : 'Pilih baris dulu'}</option>
              )}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="ob-task-assign">Assigned to</label>
          <input id="ob-task-assign" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Opsional" />
        </div>
        <div className="full-row">
          <label htmlFor="ob-task-serials">Serial Nos (reserve)</label>
          <input
            id="ob-task-serials"
            value={serialNosText}
            onChange={(e) => setSerialNosText(e.target.value)}
            placeholder="Pisahkan koma, contoh: SN-001,SN-002"
          />
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
            uomId: qtyTaskUomId || undefined,
            assignedTo: assignedTo.trim() || undefined,
            serialNos: serialNosText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          })
        }
        disabled={busy || !salesOrderId || !salesOrderItemId || !qtyTaskUomId || Number(qtyTask) <= 0}
      >
        Buat task
      </button>
    </>
  );
}
