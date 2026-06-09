'use client';

import { useCallback, useEffect, useState } from 'react';
import ToastMessage from '@/src/components/ui/ToastMessage';
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';

type EventRow = {
  id: string;
  processType: string;
  eventCode: string;
  createdAt: string;
  note?: string | null;
  customer?: { code?: string; name?: string };
  warehouse?: { code?: string; name?: string };
  internalTransfer?: { transferNo?: string; status?: string } | null;
  materialTransformation?: { processNo?: string; status?: string } | null;
};

type BillingSummary = {
  totalTransactions: number;
  totalQty: string;
  totalAmount: string;
  byStatus: Record<string, number>;
  byActivity: Array<{
    component: string;
    activityCode: string;
    count: number;
    qty: string;
    amount: string;
  }>;
};

type GenealogyRow = {
  id: string;
  processNo: string;
  status: string;
  completedAt?: string | null;
  output: {
    qtyOutput: string;
    lotNo?: string | null;
    batchNo?: string | null;
    serialNos?: string[];
    product?: { sku?: string; code?: string; name?: string };
    bin?: { code?: string; name?: string };
  };
  matchedOutboundTasks?: Array<{
    id: string;
    taskType: string;
    status: string;
    qtyTask: string;
    qtyDone: string;
    completedAt?: string | null;
    serialNos?: string[];
    salesOrder?: { id: string; orderNo: string; status: string };
    wave?: { id: string; waveNo: string } | null;
  }>;
  inputs: Array<{
    id: string;
    qtyConsumed: string;
    lotNo?: string | null;
    batchNo?: string | null;
    serialNos?: string[];
    product?: { sku?: string; code?: string; name?: string };
    bin?: { code?: string; name?: string };
    matchedInboundReceipts?: Array<{
      id: string;
      inboundAsnNo?: string | null;
      qtyReceived: string;
      lotNo?: string | null;
      batchNo?: string | null;
      serialNos?: string[];
      expiryDate?: string | null;
      receivedAt: string;
    }>;
  }>;
};

export default function ProcessFlowActivityPanel() {
  const { apiBase, token, busy: refBusy } = useWmsData();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [processTypeFilter, setProcessTypeFilter] = useState('');
  const [genealogyLotNo, setGenealogyLotNo] = useState('');
  const [genealogyBatchNo, setGenealogyBatchNo] = useState('');
  const [genealogyRows, setGenealogyRows] = useState<GenealogyRow[]>([]);
  const [genealogyBusy, setGenealogyBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const path =
        processTypeFilter.trim() !== ''
          ? `/process-flow/events?processType=${encodeURIComponent(processTypeFilter.trim())}`
          : '/process-flow/events';
      const [ev, sum] = await Promise.all([
        callApi(apiBase, token, 'GET', path) as Promise<EventRow[]>,
        callApi(apiBase, token, 'GET', '/process-flow/billing-summary') as Promise<BillingSummary>,
      ]);
      setEvents(Array.isArray(ev) ? ev : []);
      setSummary(sum);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [apiBase, token, processTypeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const postDrafts = async () => {
    if (!token) return;
    setPosting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = (await callApi(apiBase, token, 'POST', '/process-flow/billing/post-drafts')) as {
        postedCount?: number;
      };
      setSuccess(`Dipost: ${res.postedCount ?? 0} baris billing.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal posting');
    } finally {
      setPosting(false);
    }
  };

  const searchGenealogy = async () => {
    if (!token) return;
    const lot = genealogyLotNo.trim();
    const batch = genealogyBatchNo.trim();
    if (!lot && !batch) {
      setError('Isi lot atau batch untuk mencari genealogy.');
      return;
    }
    setError(null);
    setGenealogyBusy(true);
    try {
      const params = new URLSearchParams();
      if (lot) params.set('outputLotNo', lot);
      if (batch) params.set('outputBatchNo', batch);
      const rows = (await callApi(apiBase, token, 'GET', `/process-flow/genealogy?${params.toString()}`)) as GenealogyRow[];
      setGenealogyRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setGenealogyRows([]);
      setError(e instanceof Error ? e.message : 'Gagal cari genealogy');
    } finally {
      setGenealogyBusy(false);
    }
  };

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />

      <section className="card">
        <h2>Process flow — Activity & billing</h2>
        <p className="muted">
          Event log proses (transfer / transformasi) dan ringkasan billing handling untuk aktivitas process flow. Draft
          billing bisa dipost ke status posted agar masuk agregat billing/KPI.
        </p>
        <div className="row" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading || refBusy}>
            {loading ? 'Memuat…' : 'Refresh'}
          </button>
          <button type="button" onClick={() => void postDrafts()} disabled={posting || refBusy}>
            {posting ? 'Posting…' : 'Post draft billing (process flow)'}
          </button>
        </div>
      </section>

      {summary ? (
        <section className="card">
          <h3>Ringkasan billing (process flow)</h3>
          <div className="kpi-grid">
            <div className="kpi">
              <div className="kpi-label">Baris transaksi</div>
              <div className="kpi-value">{summary.totalTransactions}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total qty (agregat)</div>
              <div className="kpi-value" style={{ fontSize: 16 }}>
                {summary.totalQty}
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total amount</div>
              <div className="kpi-value" style={{ fontSize: 16 }}>
                {summary.totalAmount}
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">By status</div>
              <div className="kpi-value" style={{ fontSize: 12 }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(summary.byStatus, null, 0)}</pre>
              </div>
            </div>
          </div>
          {summary.byActivity.length > 0 ? (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Activity</th>
                    <th>Count</th>
                    <th>Qty</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byActivity.map((r) => (
                    <tr key={`${r.component}-${r.activityCode}`}>
                      <td>{r.component}</td>
                      <td>{r.activityCode}</td>
                      <td>{r.count}</td>
                      <td>{r.qty}</td>
                      <td>{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 8 }}>
              Belum ada baris billing process flow.
            </p>
          )}
        </section>
      ) : null}

      <section className="card">
        <h3>Genealogy by lot/batch</h3>
        <p className="muted">
          Telusuri output lot/batch transformation ke input lot/batch dan receipt ASN asal (jika tercatat).
        </p>
        <div className="form-grid">
          <div>
            <label htmlFor="pf-gene-lot">Output Lot No</label>
            <input
              id="pf-gene-lot"
              value={genealogyLotNo}
              onChange={(e) => setGenealogyLotNo(e.target.value)}
              placeholder="Contoh: LOT-FLAV-001"
            />
          </div>
          <div>
            <label htmlFor="pf-gene-batch">Output Batch No</label>
            <input
              id="pf-gene-batch"
              value={genealogyBatchNo}
              onChange={(e) => setGenealogyBatchNo(e.target.value)}
              placeholder="Contoh: BATCH-FLAV-001"
            />
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button type="button" onClick={() => void searchGenealogy()} disabled={genealogyBusy || refBusy}>
            {genealogyBusy ? 'Mencari…' : 'Cari genealogy'}
          </button>
        </div>
        {genealogyRows.length > 0 ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Process</th>
                  <th>Output</th>
                  <th>Input (lot/batch)</th>
                  <th>Matched ASN receipts</th>
                  <th>Matched outbound tasks</th>
                </tr>
              </thead>
              <tbody>
                {genealogyRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div>{row.processNo}</div>
                      <div className="muted">{row.status}</div>
                    </td>
                    <td>
                      <div>{row.output.product?.sku ?? row.output.product?.code ?? '-'} — {row.output.product?.name ?? '-'}</div>
                      <div className="muted">
                        Qty: {row.output.qtyOutput} | Lot: {row.output.lotNo ?? '-'} | Batch: {row.output.batchNo ?? '-'}
                      </div>
                      <div className="muted">Serial: {row.output.serialNos?.join(', ') || '-'}</div>
                    </td>
                    <td>
                      {row.inputs.map((inp) => (
                        <div key={inp.id} style={{ marginBottom: 6 }}>
                          <div>{inp.product?.sku ?? inp.product?.code ?? '-'} — {inp.product?.name ?? '-'}</div>
                          <div className="muted">
                            Qty: {inp.qtyConsumed} | Lot: {inp.lotNo ?? '-'} | Batch: {inp.batchNo ?? '-'}
                          </div>
                          <div className="muted">Serial: {inp.serialNos?.join(', ') || '-'}</div>
                        </div>
                      ))}
                    </td>
                    <td>
                      {row.inputs.flatMap((inp) => inp.matchedInboundReceipts ?? []).length === 0 ? (
                        <span className="muted">Tidak ada match receipt</span>
                      ) : (
                        row.inputs.flatMap((inp) => inp.matchedInboundReceipts ?? []).map((rec) => (
                          <div key={rec.id} style={{ marginBottom: 6 }}>
                            <div>ASN: {rec.inboundAsnNo ?? '-'}</div>
                            <div className="muted">
                              Qty (base): {rec.qtyReceived} | Lot: {rec.lotNo ?? '-'} | Batch: {rec.batchNo ?? '-'}
                            </div>
                            <div className="muted">Serial: {rec.serialNos?.join(', ') || '-'}</div>
                          </div>
                        ))
                      )}
                    </td>
                    <td>
                      {!row.matchedOutboundTasks || row.matchedOutboundTasks.length === 0 ? (
                        <span className="muted">Belum terpakai outbound</span>
                      ) : (
                        row.matchedOutboundTasks.map((ot) => (
                          <div key={ot.id} style={{ marginBottom: 6 }}>
                            <div>
                              SO: {ot.salesOrder?.orderNo ?? '-'} | {ot.taskType}
                            </div>
                            <div className="muted">
                              Qty: {ot.qtyDone}/{ot.qtyTask} | Serial: {ot.serialNos?.join(', ') || '-'}
                            </div>
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 8 }}>
            {genealogyBusy ? 'Mencari data…' : 'Belum ada hasil genealogy.'}
          </p>
        )}
      </section>

      <section className="card">
        <h3>Event log</h3>
        <div className="form-grid" style={{ maxWidth: 400 }}>
          <div>
            <label htmlFor="pf-act-filter">Filter processType</label>
            <select
              id="pf-act-filter"
              value={processTypeFilter}
              onChange={(e) => setProcessTypeFilter(e.target.value)}
            >
              <option value="">Semua</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="TRANSFORMATION">TRANSFORMATION</option>
            </select>
          </div>
        </div>
        {loading && events.length === 0 ? <p className="muted">Memuat event…</p> : null}
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Type</th>
                <th>Code</th>
                <th>Customer</th>
                <th>Warehouse</th>
                <th>Referensi</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const cust = ev.customer ? `${ev.customer.code ?? ''} ${ev.customer.name ?? ''}`.trim() : '—';
                const wh = ev.warehouse ? `${ev.warehouse.code ?? ''} ${ev.warehouse.name ?? ''}`.trim() : '—';
                const ref =
                  ev.internalTransfer?.transferNo != null
                    ? `TRF ${ev.internalTransfer.transferNo}`
                    : ev.materialTransformation?.processNo != null
                      ? `PRC ${ev.materialTransformation.processNo}`
                      : '—';
                return (
                  <tr key={ev.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(ev.createdAt).toLocaleString()}</td>
                    <td>{ev.processType}</td>
                    <td>{ev.eventCode}</td>
                    <td>{cust || '—'}</td>
                    <td>{wh || '—'}</td>
                    <td>{ref}</td>
                    <td>{ev.note ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {events.length === 0 && !loading ? (
          <p className="muted" style={{ marginTop: 8 }}>
            Tidak ada event.
          </p>
        ) : null}
      </section>
    </>
  );
}
