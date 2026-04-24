'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchKpiSummary } from '@/src/lib/kpi-api';
import type { KpiSummary } from '@/src/lib/kpi-types';
import { useWmsData } from '@/src/lib/useWmsData';

function formatPct(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: to.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const { apiBase, token, customers, operators, warehouses, asns, busy: refBusy, refreshReferenceData } =
    useWmsData();

  const [{ dateFrom, dateTo }, setRange] = useState(defaultDateRange);
  const [warehouseId, setWarehouseId] = useState('');
  const [customerId, setCustomerId] = useState('');

  const [kpi, setKpi] = useState<KpiSummary | null>(null);
  const [kpiBusy, setKpiBusy] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const loadKpi = useCallback(async () => {
    if (!token) return;
    setKpiBusy(true);
    setKpiError(null);
    try {
      const data = await fetchKpiSummary(apiBase, token, {
        dateFrom,
        dateTo,
        warehouseId: warehouseId || undefined,
        customerId: customerId || undefined,
      });
      setKpi(data);
    } catch (e) {
      setKpi(null);
      setKpiError(e instanceof Error ? e.message : 'Gagal memuat KPI');
    } finally {
      setKpiBusy(false);
    }
  }, [apiBase, token, dateFrom, dateTo, warehouseId, customerId]);

  useEffect(() => {
    void loadKpi();
  }, [loadKpi]);

  return (
    <>
      <section className="card">
        <h2>Dashboard</h2>
        <p className="muted">Ringkasan master data dan KPI operasional (API `/kpi/summary`).</p>

        <div className="row" style={{ alignItems: 'flex-end' }}>
          <button type="button" className="btn-secondary" onClick={() => void refreshReferenceData()} disabled={refBusy}>
            Refresh master data
          </button>
          <button type="button" onClick={() => void loadKpi()} disabled={kpiBusy}>
            {kpiBusy ? 'Memuat KPI…' : 'Refresh KPI'}
          </button>
        </div>

        <div className="kpi-grid">
          <div className="kpi">
            <div className="kpi-label">Customers</div>
            <div className="kpi-value">{customers.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Operators</div>
            <div className="kpi-value">{operators.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Warehouses</div>
            <div className="kpi-value">{warehouses.length}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">ASN</div>
            <div className="kpi-value">{asns.length}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Filter KPI</h3>
        <p className="muted">Default 30 hari terakhir. Kosongkan gudang / customer untuk agregat global.</p>
        <div className="form-grid">
          <div>
            <label htmlFor="dash-kpi-from">Dari tanggal</label>
            <input
              id="dash-kpi-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setRange((r) => ({ ...r, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="dash-kpi-to">Sampai tanggal</label>
            <input
              id="dash-kpi-to"
              type="date"
              value={dateTo}
              onChange={(e) => setRange((r) => ({ ...r, dateTo: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="dash-kpi-wh">Warehouse</label>
            <select id="dash-kpi-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Semua</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code ? `${w.code} — ${w.name}` : w.name ?? w.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dash-kpi-cust">Customer</label>
            <select id="dash-kpi-cust" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Semua</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ${c.name}` : c.name ?? c.id}
                </option>
              ))}
            </select>
          </div>
        </div>
        {kpiError ? <div className="toast toast-error">{kpiError}</div> : null}
        {kpi ? (
          <p className="muted" style={{ marginTop: 8 }}>
            Periode: {new Date(kpi.period.from).toLocaleString()} — {new Date(kpi.period.to).toLocaleString()}
          </p>
        ) : null}
      </section>

      {kpi ? (
        <>
          <section className="card">
            <h3>Inbound</h3>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Receiving fill (ASN selesai di periode)</div>
                <div className="kpi-value">{formatPct(kpi.inbound.receivingFillRate)}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">ASN selesai (closed in period)</div>
                <div className="kpi-value">{kpi.inbound.completedAsnCountClosedInPeriod}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Baris diskrepansi (qty terima di bawah expected)</div>
                <div className="kpi-value">{kpi.inbound.lineDiscrepancyCountBelowExpected}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Qty expected / received (completed)</div>
                <div className="kpi-value" style={{ fontSize: 14 }}>
                  {kpi.inbound.qtyReceivedInCompletedAsns} / {kpi.inbound.qtyExpectedInCompletedAsns}
                </div>
              </div>
            </div>
            <pre style={{ marginTop: 12 }}>{JSON.stringify(kpi.inbound.asnCountByStatusCreatedInPeriod, null, 2)}</pre>
            <p className="muted" style={{ marginTop: 8 }}>
              ASN per status = dibuat di periode (created).
            </p>
          </section>

          <section className="card">
            <h3>Outbound</h3>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Order fulfillment (qty)</div>
                <div className="kpi-value">{formatPct(kpi.outbound.orderFulfillmentRateByQty)}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Order shipped (periode)</div>
                <div className="kpi-value">{kpi.outbound.shippedOrdersInPeriod}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Task completion</div>
                <div className="kpi-value">{formatPct(kpi.outbound.taskCompletionRate)}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Qty shipped / ordered (periode)</div>
                <div className="kpi-value" style={{ fontSize: 14 }}>
                  {kpi.outbound.shippedQtyInPeriod} / {kpi.outbound.orderedQtyInPeriod}
                </div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span className="muted">Order dibuat (status)</span>
                <pre>{JSON.stringify(kpi.outbound.ordersCreatedInPeriodByStatus, null, 2)}</pre>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <span className="muted">Tasks (status)</span>
                <pre>{JSON.stringify(kpi.outbound.outboundTasksCreatedInPeriodByStatus, null, 2)}</pre>
              </div>
            </div>
          </section>

          <section className="card">
            <h3>Inventory</h3>
            <p className="muted">Snapshot: {new Date(kpi.inventory.snapshotAsOf).toLocaleString()}</p>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Total on hand</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>
                  {kpi.inventory.totalQtyOnHand}
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Baris saldo</div>
                <div className="kpi-value">{kpi.inventory.balanceLineCount}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Space util. (bin terpakai / aktif)</div>
                <div className="kpi-value">{formatPct(kpi.inventory.spaceUtilizationRate)}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Bin terpakai / total</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>
                  {kpi.inventory.binsWithStock} / {kpi.inventory.binsTotalActive}
                </div>
              </div>
            </div>
          </section>

          <section className="card">
            <h3>Billing (occurred in period)</h3>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Posted</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>
                  {kpi.billing.amountPosted}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {kpi.billing.linesPosted} baris
                </div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Draft</div>
                <div className="kpi-value" style={{ fontSize: 16 }}>
                  {kpi.billing.amountDraft}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {kpi.billing.linesDraft} baris
                </div>
              </div>
            </div>
            {kpi.billing.byComponentAndStatus.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th>Status</th>
                      <th>Lines</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpi.billing.byComponentAndStatus.map((row, i) => (
                      <tr key={`${row.component}-${row.status}-${i}`}>
                        <td>{row.component}</td>
                        <td>{row.status}</td>
                        <td>{row.lines}</td>
                        <td>{row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>
                Belum ada transaksi billing di periode ini.
              </p>
            )}
          </section>
        </>
      ) : !kpiError && kpiBusy ? (
        <section className="card">
          <p className="muted">Memuat KPI…</p>
        </section>
      ) : null}
    </>
  );
}
