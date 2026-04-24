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
  qtyDone?: string;
  assignedTo?: string;
  salesOrder?: { orderNo?: string };
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

  useEffect(() => {
    if (section === 'tasks') void loadTasks();
  }, [section, loadTasks]);

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
          label: `${t.salesOrder?.orderNo ?? '?'} | ${t.taskType} | ${t.status} | ${t.id.slice(0, 8)}…`,
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
            { key: 'status', label: 'Status', sortType: 'text' },
            { key: 'id', label: 'Task ID', sortType: 'text' },
          ]}
          rows={tasks.map((t) => ({
            id: t.id,
            taskType: t.taskType,
            status: t.status,
            assignedTo: t.assignedTo ?? '',
            orderNo: t.salesOrder?.orderNo ?? '',
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
    </>
  );
}
