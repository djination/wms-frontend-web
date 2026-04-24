'use client';

import { useEffect, useMemo, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import SimpleTable, { type SimpleTableRow } from '@/src/components/ui/SimpleTable';

type BillingSection = 'contracts' | 'rates' | 'transactions' | 'summary';

type BillingPanelProps = {
  section: BillingSection;
};

const BILLING_COMPONENTS = ['STORAGE', 'HANDLING', 'VAS', 'DEDICATED_RESOURCE', 'FIXED_FEE'] as const;
const BILLING_STATUSES = ['DRAFT', 'POSTED'] as const;

function currentYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toIdr(value: unknown): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 'Rp0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
}

export default function BillingPanel({ section }: BillingPanelProps) {
  const { apiBase, token, customers, warehouses, operators } = useWmsData();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const [contracts, setContracts] = useState<SimpleTableRow[]>([]);
  const [rates, setRates] = useState<SimpleTableRow[]>([]);
  const [transactions, setTransactions] = useState<SimpleTableRow[]>([]);
  const [summary, setSummary] = useState<unknown>(null);

  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterContractId, setFilterContractId] = useState('');
  const [filterPeriodKey, setFilterPeriodKey] = useState(() => currentYearMonth());

  const [contractForm, setContractForm] = useState({
    customerId: '',
    contractNo: '',
    name: '',
    periodStart: today(),
    periodEnd: today(),
    currency: 'IDR',
    billingCycleDay: '1',
  });

  const [rateForm, setRateForm] = useState({
    contractId: '',
    component: 'HANDLING',
    activityCode: '',
    uom: '',
    rate: '',
    minCharge: '',
  });

  const [txForm, setTxForm] = useState(() => ({
    customerId: '',
    warehouseId: '',
    operatorCompanyId: '',
    component: 'HANDLING',
    activityCode: '',
    uom: '',
    qty: '',
    amount: '',
    periodKey: currentYearMonth(),
    status: 'DRAFT',
    occurredAt: today(),
    referenceType: '',
    referenceId: '',
    note: '',
  }));

  const run = async (action: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, payload?: unknown) => {
    setError(null);
    setSuccess(null);
    setActionBusy(action);
    try {
      const data = await callApi(apiBase, token, method, path, payload);
      if (method !== 'GET') setSuccess('Aksi billing berhasil');
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Request gagal';
      setError(msg);
      throw err;
    } finally {
      setActionBusy(null);
    }
  };

  const listContracts = async () => {
    const qs = filterCustomerId ? `?customerId=${encodeURIComponent(filterCustomerId)}` : '';
    const data = await run('list-contracts', 'GET', `/billing/contracts${qs}`);
    setContracts(
      Array.isArray(data)
        ? data.map((row) => {
            const r = row as Record<string, unknown>;
            const c = r.customer as Record<string, unknown> | undefined;
            return {
              id: String(r.id ?? ''),
              contractNo: String(r.contractNo ?? ''),
              name: String(r.name ?? ''),
              customerName: String(c?.name ?? '-'),
              periodStart: String(r.periodStart ?? ''),
              periodEnd: String(r.periodEnd ?? ''),
              currency: String(r.currency ?? ''),
              billingCycleDay: Number(r.billingCycleDay ?? 0),
              isActive: Boolean(r.isActive),
            };
          })
        : [],
    );
  };

  const listRates = async () => {
    const qs = filterContractId ? `?contractId=${encodeURIComponent(filterContractId)}` : '';
    const data = await run('list-rates', 'GET', `/billing/rates${qs}`);
    setRates(
      Array.isArray(data)
        ? data.map((row) => {
            const r = row as Record<string, unknown>;
            const contract = r.contract as Record<string, unknown> | undefined;
            return {
              id: String(r.id ?? ''),
              contractNo: String(contract?.contractNo ?? '-'),
              component: String(r.component ?? ''),
              activityCode: String(r.activityCode ?? ''),
              uom: String(r.uom ?? ''),
              rate: String(r.rate ?? '0'),
              minCharge: String(r.minCharge ?? ''),
              isActive: Boolean(r.isActive),
            };
          })
        : [],
    );
  };

  const listTransactions = async () => {
    const params = new URLSearchParams();
    if (filterCustomerId) params.set('customerId', filterCustomerId);
    if (filterPeriodKey) params.set('periodKey', filterPeriodKey);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await run('list-transactions', 'GET', `/billing/transactions${qs}`);
    setTransactions(
      Array.isArray(data)
        ? data.map((row) => {
            const r = row as Record<string, unknown>;
            const customer = r.customer as Record<string, unknown> | undefined;
            const warehouse = r.warehouse as Record<string, unknown> | undefined;
            return {
              id: String(r.id ?? ''),
              customerName: String(customer?.name ?? '-'),
              warehouseCode: String(warehouse?.code ?? '-'),
              component: String(r.component ?? ''),
              activityCode: String(r.activityCode ?? ''),
              qty: String(r.qty ?? '0'),
              amount: String(r.amount ?? '0'),
              periodKey: String(r.periodKey ?? ''),
              status: String(r.status ?? ''),
              occurredAt: String(r.occurredAt ?? ''),
            };
          })
        : [],
    );
  };

  const getSummary = async () => {
    if (!filterCustomerId || !filterPeriodKey) {
      setError('Summary butuh customer dan period key');
      return;
    }
    const qs = `?customerId=${encodeURIComponent(filterCustomerId)}&periodKey=${encodeURIComponent(filterPeriodKey)}`;
    const data = await run('get-summary', 'GET', `/billing/summary${qs}`);
    setSummary(data);
  };

  const submitContract = async () => {
    await run('create-contract', 'POST', '/billing/contracts', {
      customerId: contractForm.customerId,
      contractNo: contractForm.contractNo,
      name: contractForm.name,
      periodStart: contractForm.periodStart,
      periodEnd: contractForm.periodEnd || undefined,
      currency: contractForm.currency || undefined,
      billingCycleDay: Number(contractForm.billingCycleDay || '1'),
    });
    await listContracts();
  };

  const submitRate = async () => {
    await run('create-rate', 'POST', '/billing/rates', {
      contractId: rateForm.contractId,
      component: rateForm.component,
      activityCode: rateForm.activityCode,
      uom: rateForm.uom,
      rate: Number(rateForm.rate),
      minCharge: rateForm.minCharge ? Number(rateForm.minCharge) : undefined,
    });
    await listRates();
  };

  const submitTransaction = async () => {
    const occurredAtIso = txForm.occurredAt ? new Date(txForm.occurredAt).toISOString() : '';
    if (!occurredAtIso || Number.isNaN(new Date(occurredAtIso).getTime())) {
      setError('Tanggal/waktu transaksi tidak valid');
      return;
    }
    await run('create-transaction', 'POST', '/billing/transactions', {
      customerId: txForm.customerId,
      warehouseId: txForm.warehouseId || undefined,
      operatorCompanyId: txForm.operatorCompanyId || undefined,
      component: txForm.component,
      activityCode: txForm.activityCode,
      uom: txForm.uom,
      qty: Number(txForm.qty),
      amount: Number(txForm.amount),
      periodKey: txForm.periodKey,
      status: txForm.status,
      occurredAt: occurredAtIso,
      referenceType: txForm.referenceType || undefined,
      referenceId: txForm.referenceId || undefined,
      note: txForm.note || undefined,
    });
    setFilterCustomerId(txForm.customerId);
    setFilterPeriodKey(txForm.periodKey);
    await listTransactions();
  };

  const sectionTitle = useMemo(() => {
    if (section === 'contracts') return 'Billing - Contracts';
    if (section === 'rates') return 'Billing - Rates';
    if (section === 'transactions') return 'Billing - Transactions';
    return 'Billing - Summary';
  }, [section]);

  const summaryView = useMemo(() => {
    const raw = (summary ?? null) as Record<string, unknown> | null;
    if (!raw) return null;
    const customerId = String(raw.customerId ?? '');
    const customerName = customers.find((c) => c.id === customerId)?.name ?? '';
    const totals = (raw.totals ?? {}) as Record<string, unknown>;
    const breakdown = Array.isArray(raw.breakdown) ? raw.breakdown : [];
    return {
      customerId,
      customerName,
      periodKey: String(raw.periodKey ?? ''),
      totalQty: Number(totals.totalQty ?? 0),
      totalAmount: Number(totals.totalAmount ?? 0),
      breakdown: breakdown.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          component: String(row.component ?? '-'),
          activityCode: String(row.activityCode ?? '-'),
          qty: Number(row.totalQty ?? row.qty ?? 0),
          amount: Number(row.totalAmount ?? row.amount ?? 0),
        };
      }),
    };
  }, [summary, customers]);

  useEffect(() => {
    if (!token) return;
    if (section === 'contracts') {
      void listContracts();
      return;
    }
    if (section === 'rates') {
      void listContracts();
      void listRates();
      return;
    }
    if (section === 'transactions') {
      void listTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, token]);

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />

      <section className="card">
        <h2>{sectionTitle}</h2>
        <div className="form-grid billing-form-grid">
          <label>
            Filter customer
            <select value={filterCustomerId} onChange={(e) => setFilterCustomerId(e.target.value)}>
              <option value="">Semua customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Period key
            <input
              value={filterPeriodKey}
              onChange={(e) => setFilterPeriodKey(e.target.value)}
              placeholder="YYYY-MM"
            />
          </label>

          {section === 'rates' ? (
            <label>
              Filter contract
              <select value={filterContractId} onChange={(e) => setFilterContractId(e.target.value)}>
                <option value="">Semua contract</option>
                {contracts.map((c) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.contractNo)} - {String(c.name)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div />
          )}
        </div>

        <div className="row">
          {section === 'contracts' ? (
            <button type="button" onClick={() => void listContracts()} disabled={!!actionBusy}>
              List contracts
            </button>
          ) : null}
          {section === 'rates' ? (
            <button type="button" onClick={() => void listRates()} disabled={!!actionBusy}>
              List rates
            </button>
          ) : null}
          {section === 'transactions' ? (
            <button type="button" onClick={() => void listTransactions()} disabled={!!actionBusy}>
              List transactions
            </button>
          ) : null}
          {section === 'summary' ? (
            <button type="button" onClick={() => void getSummary()} disabled={!!actionBusy}>
              Get summary
            </button>
          ) : null}
        </div>
      </section>

      {section === 'contracts' ? (
        <>
          <section className="card">
            <h3>Create contract</h3>
            <div className="form-grid billing-form-grid">
              <label>
                Customer
                <select
                  value={contractForm.customerId}
                  onChange={(e) => setContractForm((p) => ({ ...p, customerId: e.target.value }))}
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Contract no
                <input value={contractForm.contractNo} onChange={(e) => setContractForm((p) => ({ ...p, contractNo: e.target.value }))} />
              </label>
              <label>
                Contract name
                <input value={contractForm.name} onChange={(e) => setContractForm((p) => ({ ...p, name: e.target.value }))} />
              </label>
              <label>
                Period start
                <input type="date" value={contractForm.periodStart} onChange={(e) => setContractForm((p) => ({ ...p, periodStart: e.target.value }))} />
              </label>
              <label>
                Period end
                <input type="date" value={contractForm.periodEnd} onChange={(e) => setContractForm((p) => ({ ...p, periodEnd: e.target.value }))} />
              </label>
              <label>
                Currency
                <input value={contractForm.currency} onChange={(e) => setContractForm((p) => ({ ...p, currency: e.target.value }))} />
              </label>
              <label>
                Billing cycle day
                <input type="number" min={1} value={contractForm.billingCycleDay} onChange={(e) => setContractForm((p) => ({ ...p, billingCycleDay: e.target.value }))} />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void submitContract()}
              disabled={!!actionBusy || !contractForm.customerId || !contractForm.contractNo || !contractForm.name || !contractForm.periodStart}
            >
              Create contract
            </button>
          </section>

          <SimpleTable
            title="Billing contracts"
            columns={[
              { key: 'contractNo', label: 'Contract No', sortType: 'text' },
              { key: 'name', label: 'Name', sortType: 'text' },
              { key: 'customerName', label: 'Customer', sortType: 'text' },
              { key: 'periodStart', label: 'Start', sortType: 'date' },
              { key: 'currency', label: 'Currency', sortType: 'text' },
              { key: 'isActive', label: 'Active', renderCell: (row) => (row.isActive ? 'Yes' : 'No') },
            ]}
            rows={contracts}
            loading={actionBusy === 'list-contracts'}
            onDeleteRow={async (row) => {
              await run('delete-contract', 'DELETE', `/billing/contracts/${String(row.id)}?mode=soft`);
              await listContracts();
            }}
          />
        </>
      ) : null}

      {section === 'rates' ? (
        <>
          <section className="card">
            <h3>Create rate</h3>
            <div className="form-grid billing-form-grid">
              <label>
                Contract
                <select value={rateForm.contractId} onChange={(e) => setRateForm((p) => ({ ...p, contractId: e.target.value }))}>
                  <option value="">Select contract</option>
                  {contracts.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.contractNo)} - {String(c.name)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Component
                <select value={rateForm.component} onChange={(e) => setRateForm((p) => ({ ...p, component: e.target.value }))}>
                  {BILLING_COMPONENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Activity code
                <input value={rateForm.activityCode} onChange={(e) => setRateForm((p) => ({ ...p, activityCode: e.target.value }))} />
              </label>
              <label>
                UOM
                <input value={rateForm.uom} onChange={(e) => setRateForm((p) => ({ ...p, uom: e.target.value }))} />
              </label>
              <label>
                Rate
                <input type="number" min={0} step="any" value={rateForm.rate} onChange={(e) => setRateForm((p) => ({ ...p, rate: e.target.value }))} />
              </label>
              <label>
                Min charge (optional)
                <input type="number" min={0} step="any" value={rateForm.minCharge} onChange={(e) => setRateForm((p) => ({ ...p, minCharge: e.target.value }))} />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void submitRate()}
              disabled={!!actionBusy || !rateForm.contractId || !rateForm.activityCode || !rateForm.uom || !rateForm.rate}
            >
              Create rate
            </button>
          </section>

          <SimpleTable
            title="Billing rates"
            columns={[
              { key: 'contractNo', label: 'Contract', sortType: 'text' },
              { key: 'component', label: 'Component', sortType: 'text' },
              { key: 'activityCode', label: 'Activity', sortType: 'text' },
              { key: 'uom', label: 'UOM', sortType: 'text' },
              { key: 'rate', label: 'Rate', sortType: 'number' },
              { key: 'isActive', label: 'Active', renderCell: (row) => (row.isActive ? 'Yes' : 'No') },
            ]}
            rows={rates}
            loading={actionBusy === 'list-rates'}
            onDeleteRow={async (row) => {
              await run('delete-rate', 'DELETE', `/billing/rates/${String(row.id)}?mode=soft`);
              await listRates();
            }}
          />
        </>
      ) : null}

      {section === 'transactions' ? (
        <>
          <section className="card">
            <h3>Create transaction</h3>
            <div className="form-grid billing-form-grid">
              <label>
                Customer
                <select value={txForm.customerId} onChange={(e) => setTxForm((p) => ({ ...p, customerId: e.target.value }))}>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Warehouse (optional)
                <select value={txForm.warehouseId} onChange={(e) => setTxForm((p) => ({ ...p, warehouseId: e.target.value }))}>
                  <option value="">Warehouse (optional)</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Operator (optional)
                <select value={txForm.operatorCompanyId} onChange={(e) => setTxForm((p) => ({ ...p, operatorCompanyId: e.target.value }))}>
                  <option value="">Operator (optional)</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.code} - {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Component
                <select value={txForm.component} onChange={(e) => setTxForm((p) => ({ ...p, component: e.target.value }))}>
                  {BILLING_COMPONENTS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Activity code
                <input value={txForm.activityCode} onChange={(e) => setTxForm((p) => ({ ...p, activityCode: e.target.value }))} />
              </label>
              <label>
                UOM
                <input value={txForm.uom} onChange={(e) => setTxForm((p) => ({ ...p, uom: e.target.value }))} />
              </label>
              <label>
                Qty
                <input type="number" step="any" min={0} value={txForm.qty} onChange={(e) => setTxForm((p) => ({ ...p, qty: e.target.value }))} />
              </label>
              <label>
                Amount
                <input type="number" step="any" min={0} value={txForm.amount} onChange={(e) => setTxForm((p) => ({ ...p, amount: e.target.value }))} />
              </label>
              <label>
                Period key
                <input value={txForm.periodKey} onChange={(e) => setTxForm((p) => ({ ...p, periodKey: e.target.value }))} placeholder="YYYY-MM" />
              </label>
              <label>
                Status
                <select value={txForm.status} onChange={(e) => setTxForm((p) => ({ ...p, status: e.target.value }))}>
                  {BILLING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Occurred at
                <input
                  type="date"
                  value={txForm.occurredAt}
                  onChange={(e) => setTxForm((p) => ({ ...p, occurredAt: e.target.value }))}
                />
                <span className="muted">Tanggal dan waktu transaksi terjadi.</span>
              </label>
              <label>
                Reference type (optional)
                <input value={txForm.referenceType} onChange={(e) => setTxForm((p) => ({ ...p, referenceType: e.target.value }))} />
              </label>
              <label>
                Reference id (optional)
                <input value={txForm.referenceId} onChange={(e) => setTxForm((p) => ({ ...p, referenceId: e.target.value }))} />
              </label>
              <label className="full-row">
                Note (optional)
                <input value={txForm.note} onChange={(e) => setTxForm((p) => ({ ...p, note: e.target.value }))} />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void submitTransaction()}
              disabled={
                !!actionBusy ||
                !txForm.customerId ||
                !txForm.activityCode ||
                !txForm.uom ||
                !txForm.qty ||
                !txForm.amount ||
                !txForm.periodKey ||
                !txForm.occurredAt
              }
            >
              {actionBusy === 'create-transaction' ? 'Creating...' : 'Create transaction'}
            </button>
          </section>

          <SimpleTable
            title="Billing transactions"
            columns={[
              { key: 'customerName', label: 'Customer', sortType: 'text' },
              { key: 'warehouseCode', label: 'Warehouse', sortType: 'text' },
              { key: 'component', label: 'Component', sortType: 'text' },
              { key: 'activityCode', label: 'Activity', sortType: 'text' },
              { key: 'qty', label: 'Qty', sortType: 'number' },
              { key: 'amount', label: 'Amount', sortType: 'number' },
              { key: 'periodKey', label: 'Period', sortType: 'text' },
              { key: 'status', label: 'Status', sortType: 'text' },
            ]}
            rows={transactions}
            loading={actionBusy === 'list-transactions'}
            onDeleteRow={async (row) => {
              await run('delete-transaction', 'DELETE', `/billing/transactions/${String(row.id)}`);
              await listTransactions();
            }}
          />
        </>
      ) : null}

      {section === 'summary' ? (
        <section className="card">
          <h3>Summary result</h3>
          <p className="muted">Pilih customer dan period key, lalu klik Get summary.</p>
          {summaryView ? (
            <>
              <div className="form-grid billing-form-grid" style={{ marginBottom: 12 }}>
                <label>
                  Customer Name
                  <input readOnly value={summaryView.customerName ?? '-'} />
                </label>
                <label>
                  Period
                  <input readOnly value={summaryView.periodKey || '-'} />
                </label>
                <label>
                  Total Qty
                  <input readOnly value={String(summaryView.totalQty)} />
                </label>
                <label>
                  Total Amount
                  <input readOnly value={toIdr(summaryView.totalAmount)} />
                </label>
              </div>
              <SimpleTable
                title="Breakdown per komponen"
                columns={[
                  { key: 'component', label: 'Component', sortType: 'text' },
                  { key: 'activityCode', label: 'Activity Code', sortType: 'text' },
                  { key: 'qty', label: 'Qty', sortType: 'number' },
                  { key: 'amountLabel', label: 'Amount', sortType: 'number' },
                ]}
                rows={summaryView.breakdown.map((row, idx) => ({
                  id: String(idx + 1),
                  component: row.component,
                  activityCode: row.activityCode,
                  qty: row.qty,
                  amount: row.amount,
                  amountLabel: toIdr(row.amount),
                }))}
                hideRowActions
                pageSize={6}
              />
            </>
          ) : (
            <p className="muted">Belum ada data summary.</p>
          )}
        </section>
      ) : null}
    </>
  );
}
