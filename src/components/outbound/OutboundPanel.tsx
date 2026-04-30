'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import SimpleTable from '@/src/components/ui/SimpleTable';
import type { SimpleTableRow } from '@/src/components/ui/SimpleTable';
import CreateSalesOrderForm from './CreateSalesOrderForm';
import CreateWaveForm from './CreateWaveForm';
import CreateOutboundTaskForm from './CreateOutboundTaskForm';
import CompleteOutboundTaskForm from './CompleteOutboundTaskForm';
import SalesOrderEditDetail from './SalesOrderEditDetail';
import TaskEditDetail from './TaskEditDetail';

export type OutboundSection = 'sales-orders' | 'waves' | 'tasks';

type OutboundPanelProps = {
  section: OutboundSection;
};

type TaskApiRow = {
  id: string;
  taskType: string;
  status: string;
  qtyTask?: string;
  qtyTaskInput?: string;
  qtyDone?: string;
  conversionFactor?: string;
  uomId?: string;
  uom?: { id?: string; code?: string; name?: string };
  assignedTo?: string;
  serialNos?: string[];
  salesOrder?: { orderNo?: string };
  salesOrderItem?: {
    product?: {
      baseUomId?: string;
      baseUom?: { id?: string; code?: string; name?: string };
      uomConversions?: Array<{
        fromUomId?: string;
        fromUom?: { code?: string; name?: string };
        isActive?: boolean;
      }>;
    };
  };
};

type OutboundEventApiRow = {
  id: string;
  eventCode: string;
  note?: string | null;
  createdAt: string;
  salesOrder?: { id?: string; orderNo?: string; status?: string };
  outboundTask?: { id?: string; taskType?: string; status?: string } | null;
};

export default function OutboundPanel({ section }: OutboundPanelProps) {
  const {
    apiBase,
    token,
    customers,
    warehouses,
    products,
    bins,
    salesOrders,
    waves,
    busy,
    refreshReferenceData,
  } = useWmsData();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskApiRow[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [events, setEvents] = useState<OutboundEventApiRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!token) return;
    setTasksLoading(true);
    try {
      const data = await callApi(apiBase, token, 'GET', '/outbound/tasks');
      setTasks(Array.isArray(data) ? (data as TaskApiRow[]) : []);
    } catch {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [apiBase, token]);

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setEventsLoading(true);
    try {
      const data = await callApi(apiBase, token, 'GET', '/outbound/events');
      setEvents(Array.isArray(data) ? (data as OutboundEventApiRow[]) : []);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (section === 'tasks') void loadTasks();
    if (section === 'sales-orders' || section === 'tasks') void loadEvents();
  }, [section, loadTasks, loadEvents]);

  const run = async (action: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, payload?: unknown) => {
    setError(null);
    setSuccess(null);
    setActionBusy(action);
    try {
      await callApi(apiBase, token, method, path, payload);
      if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
        setSuccess('Outbound berhasil');
        await refreshReferenceData();
        if (section === 'tasks' || action.startsWith('task-')) void loadTasks();
        if (section === 'sales-orders' || section === 'tasks') void loadEvents();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request gagal');
    } finally {
      setActionBusy(null);
    }
  };

  const taskOptions = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
        .map((t) => ({
          id: t.id,
          label: `${t.salesOrder?.orderNo ?? '?'} | ${t.taskType} | ${t.status} | serial ${
            Array.isArray(t.serialNos) ? t.serialNos.length : 0
          } | ${t.id.slice(0, 8)}…`,
          defaultUomId: t.uomId,
          uomOptions: (() => {
            const product = t.salesOrderItem?.product;
            if (!product) return [] as Array<{ id: string; label: string }>;
            const out: Array<{ id: string; label: string }> = [];
            if (product.baseUomId) {
              const code = product.baseUom?.code ?? product.baseUomId;
              const name = product.baseUom?.name ?? '';
              out.push({ id: product.baseUomId, label: `${code}${name ? ` - ${name}` : ''}` });
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
          })(),
        })),
    [tasks],
  );

  const title =
    section === 'sales-orders'
      ? 'Outbound — Sales orders'
      : section === 'waves'
        ? 'Outbound — Waves'
        : 'Outbound — Tasks';

  const salesOrderById = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of salesOrders) {
      map.set(String(row.id), row as unknown as Record<string, unknown>);
    }
    return map;
  }, [salesOrders]);

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />

      <section className="card">
        <h2>{title}</h2>
        {section === 'tasks' ? (
          <div className="row">
            <button type="button" className="btn-secondary" onClick={() => void loadTasks()} disabled={tasksLoading}>
              {tasksLoading ? 'Memuat task…' : 'Refresh tasks'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void loadEvents()}
              disabled={eventsLoading}
              style={{ marginLeft: 8 }}
            >
              {eventsLoading ? 'Memuat events…' : 'Refresh events'}
            </button>
          </div>
        ) : null}

        {section === 'sales-orders' ? (
          <div className="row">
            <button type="button" className="btn-secondary" onClick={() => void loadEvents()} disabled={eventsLoading}>
              {eventsLoading ? 'Memuat events…' : 'Refresh events'}
            </button>
          </div>
        ) : null}

        {section === 'sales-orders' ? (
          <CreateSalesOrderForm
            busy={busy || actionBusy === 'create-so'}
            customers={customers}
            warehouses={warehouses}
            products={products}
            salesOrders={salesOrders}
            onSubmit={(payload) => run('create-so', 'POST', '/outbound/sales-orders', payload)}
          />
        ) : null}

        {section === 'waves' ? (
          <CreateWaveForm
            busy={busy || actionBusy === 'create-wave'}
            salesOrders={salesOrders}
            waves={waves}
            onSubmit={(payload) => run('create-wave', 'POST', '/outbound/waves', payload)}
          />
        ) : null}

        {section === 'tasks' ? (
          <>
            <CreateOutboundTaskForm
              busy={busy || actionBusy === 'create-task'}
              salesOrders={salesOrders}
              bins={bins}
              onSubmit={(payload) => run('create-task', 'POST', '/outbound/tasks', payload)}
            />
            <hr style={{ borderColor: '#243041', margin: '20px 0' }} />
            <CompleteOutboundTaskForm
              busy={busy || actionBusy === 'complete-task'}
              taskOptions={taskOptions}
              onSubmit={(taskId, payload) => run('complete-task', 'PATCH', `/outbound/tasks/${taskId}/complete`, payload)}
            />
          </>
        ) : null}
      </section>

      <SimpleTable
        title="Sales orders"
        columns={[
          { key: 'orderNo', label: 'Order', sortType: 'text' },
          { key: 'referenceNo', label: 'Reference', sortType: 'text' },
          { key: 'itemSummary', label: 'Items', sortType: 'text' },
          { key: 'consigneeName', label: 'Consignee', sortType: 'text' },
          { key: 'status', label: 'Status', sortType: 'text' },
          { key: 'updatedAt', label: 'Updated', sortType: 'date' },
        ]}
        rows={salesOrders.map(
          (so): SimpleTableRow => {
            const raw = so as unknown as Record<string, unknown>;
            const items = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]) : [];
            const itemNames = items
              .map((it) => {
                const p = (it.product ?? null) as Record<string, unknown> | null;
                if (!p) return '';
                return p.sku != null
                  ? String(p.sku)
                  : p.code != null
                    ? String(p.code)
                    : p.name != null
                      ? String(p.name)
                      : '';
              })
              .filter(Boolean);
            const itemSummary =
              itemNames.length === 0
                ? '-'
                : itemNames.length <= 2
                  ? `${itemNames.join(', ')} (${itemNames.length} item)`
                  : `${itemNames.slice(0, 2).join(', ')} (+${itemNames.length - 2})`;
            return {
              id: so.id,
              orderNo: so.orderNo,
              referenceNo: raw.referenceNo != null ? String(raw.referenceNo) : '',
              itemSummary,
              consigneeName: raw.consigneeName != null ? String(raw.consigneeName) : '',
              requestedAt: raw.requestedAt != null ? String(raw.requestedAt) : '',
              status: so.status,
              updatedAt: so.updatedAt ?? '',
            };
          },
        )}
        loading={busy}
        renderEditModal={(row, onClose, ctx) => (
          <SalesOrderEditDetail
            row={row}
            salesOrder={salesOrderById.get(String(row.id ?? ''))}
            products={products}
            onClose={onClose}
            busy={busy || !!actionBusy}
            readOnly={ctx?.variant === 'view'}
            onUpdate={async (id, body) => {
              await run(`so-edit-${id}`, 'PATCH', `/outbound/sales-orders/${id}`, body);
            }}
            onUpdateItems={async (id, body) => {
              await run(`so-edit-items-${id}`, 'PATCH', `/outbound/sales-orders/${id}/items`, body);
            }}
          />
        )}
        onDeleteRow={(row) => run(`so-cancel-${String(row.id ?? '')}`, 'DELETE', `/outbound/sales-orders/${String(row.id ?? '')}`)}
        deleteDialogTitle="Batalkan sales order?"
        deleteDialogDescription="Sales order akan dibatalkan (soft delete) di server."
        deleteConfirmText="Batalkan"
      />

      {section === 'tasks' && tasks.length > 0 ? (
        <SimpleTable
          title="Outbound tasks (API)"
          columns={[
            { key: 'orderNo', label: 'Order', sortType: 'text' },
            { key: 'taskType', label: 'Type', sortType: 'text' },
            { key: 'qtyTaskDisplay', label: 'Qty Task (Input)', sortType: 'text' },
            { key: 'qtyBaseDisplay', label: 'Qty Base (Task/Done)', sortType: 'text' },
            { key: 'status', label: 'Status', sortType: 'text' },
            { key: 'serialSummary', label: 'Serial Reserved', sortType: 'text' },
            { key: 'id', label: 'Task ID', sortType: 'text' },
          ]}
          rows={tasks.map((t) => ({
            id: t.id,
            taskType: t.taskType,
            status: t.status,
            assignedTo: t.assignedTo ?? '',
            orderNo: t.salesOrder?.orderNo ?? '',
            qtyTaskDisplay: (() => {
              const uomLabel = t.uom?.code ?? t.uom?.name ?? t.uomId ?? '-';
              const qtyInput = t.qtyTaskInput ?? t.qtyTask ?? '0';
              return `${qtyInput} ${uomLabel}`;
            })(),
            qtyBaseDisplay: `${t.qtyTask ?? '0'} / ${t.qtyDone ?? '0'}`,
            qtyTask: t.qtyTask ?? '0',
            qtyDone: t.qtyDone ?? '0',
            qtyTaskInput: t.qtyTaskInput ?? t.qtyTask ?? '0',
            uomLabel: t.uom?.code ?? t.uom?.name ?? t.uomId ?? '-',
            conversionFactor: t.conversionFactor ?? '1',
            serialSummary: Array.isArray(t.serialNos) && t.serialNos.length > 0 ? t.serialNos.join(', ') : '-',
          }))}
          loading={tasksLoading}
          renderEditModal={(row, onClose, ctx) => (
            <TaskEditDetail
              row={row}
              onClose={onClose}
              busy={tasksLoading || !!actionBusy}
              readOnly={ctx?.variant === 'view'}
              onUpdate={(id, body) => run(`task-edit-${id}`, 'PATCH', `/outbound/tasks/${id}`, body)}
            />
          )}
          onDeleteRow={(row) => run(`task-cancel-${String(row.id ?? '')}`, 'DELETE', `/outbound/tasks/${String(row.id ?? '')}`)}
          deleteDialogTitle="Batalkan task?"
          deleteDialogDescription="Task outbound akan dibatalkan (soft delete) di server."
          deleteConfirmText="Batalkan"
        />
      ) : null}

      {(section === 'sales-orders' || section === 'tasks') && events.length > 0 ? (
        <SimpleTable
          title="Outbound event logs (API)"
          columns={[
            { key: 'createdAt', label: 'Time', sortType: 'date' },
            { key: 'eventCode', label: 'Event', sortType: 'text' },
            { key: 'orderNo', label: 'Order', sortType: 'text' },
            { key: 'taskType', label: 'Task', sortType: 'text' },
            { key: 'note', label: 'Note', sortType: 'text' },
          ]}
          rows={events.map((ev) => ({
            id: ev.id,
            createdAt: ev.createdAt,
            eventCode: ev.eventCode,
            orderNo: ev.salesOrder?.orderNo ?? '',
            taskType: ev.outboundTask?.taskType ?? '',
            note: ev.note ?? '',
          }))}
          loading={eventsLoading}
        />
      ) : null}
    </>
  );
}
