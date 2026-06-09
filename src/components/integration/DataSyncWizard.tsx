'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { middlewareJson } from '@/src/lib/middlewareApi';
import ToastMessage from '@/src/components/ui/ToastMessage';

type DbKind = 'postgresql' | 'mysql' | 'oracle';

type ConnForm = {
  kind: DbKind;
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  serviceName: string;
  sslmode: string;
  introspectionSchema: string;
};

type TargetDestination = 'database' | 'http';

type ColumnOut = { name: string; type: string; nullable: boolean };
type TargetTableOut = { name: string; schema_name?: string | null; columns: ColumnOut[] };

type PairRow = {
  id: string;
  sourceTable: string;
  targetTable: string;
  sourceSchema: string;
  targetSchema: string;
  mapping: Record<string, string>;
  constants: Record<string, string>;
  sourceCols: ColumnOut[];
  targetCols: ColumnOut[];
};

type SourceConfigRes = {
  ok: boolean;
  connection_ref?: string | null;
  tables?: string[];
  detail?: string | null;
};
type TargetConfigRes = {
  ok: boolean;
  connection_ref?: string | null;
  tables?: TargetTableOut[];
  detail?: string | null;
};
type SchemaCompRes = {
  ok: boolean;
  source_columns?: ColumnOut[];
  target_columns?: ColumnOut[];
  detail?: string | null;
};
type SourceColsRes = { ok: boolean; columns?: ColumnOut[]; detail?: string | null };
type StartSyncRes = { status: string; task_id: string };
type SyncStatusRes = {
  task_id: string;
  status: string;
  rows_read?: number | null;
  batches_written?: number | null;
  error?: string | null;
};

const STEPS = [
  { id: 1, title: 'Sumber', hint: 'Hubungkan database asal.' },
  { id: 2, title: 'Tujuan', hint: 'Pilih database lain atau API HTTP.' },
  {
    id: 3,
    title: 'Pasangan tabel',
    hint: 'Satu atau beberapa pasangan tabel sumber → tujuan (atau ke batch API).',
  },
  { id: 4, title: 'Mapping', hint: 'Samakan kolom per pasangan.' },
  { id: 5, title: 'Jalankan', hint: 'Mulai sinkronisasi dan pantau status.' },
] as const;

function defaultConn(): ConnForm {
  return {
    kind: 'postgresql',
    host: '127.0.0.1',
    port: '5432',
    user: '',
    password: '',
    database: '',
    serviceName: '',
    sslmode: '',
    introspectionSchema: '',
  };
}

function newPair(): PairRow {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    sourceTable: '',
    targetTable: '',
    sourceSchema: '',
    targetSchema: '',
    mapping: {},
    constants: {},
    sourceCols: [],
    targetCols: [],
  };
}

function buildConfigPayload(form: ConnForm): Record<string, unknown> {
  const port = Number.parseInt(form.port, 10);
  const body: Record<string, unknown> = {
    kind: form.kind,
    host: form.host.trim(),
    port: Number.isFinite(port) ? port : 5432,
    user: form.user.trim(),
    password: form.password,
    database: form.database.trim() || null,
    service_name: form.serviceName.trim() || null,
    sslmode: form.sslmode.trim() || null,
    introspection_schema: form.introspectionSchema.trim() || null,
  };
  if (form.kind === 'oracle') {
    body.database = form.database.trim() || null;
    body.service_name = form.serviceName.trim() || null;
  }
  return body;
}

function pickMapping(m: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    if (v.trim()) out[k] = v.trim();
  }
  return out;
}

export default function DataSyncWizard() {
  const [mwBase, setMwBase] = useState(
    () => process.env.NEXT_PUBLIC_MIDDLEWARE_URL ?? 'http://127.0.0.1:8000',
  );
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; variant: 'success' | 'error' } | null>(null);

  const [sourceForm, setSourceForm] = useState<ConnForm>(() => defaultConn());
  const [targetForm, setTargetForm] = useState<ConnForm>(() => defaultConn());

  const [targetDestination, setTargetDestination] = useState<TargetDestination>('database');
  const [httpUrl, setHttpUrl] = useState('');
  const [httpBearer, setHttpBearer] = useState('');
  const [httpPayloadKey, setHttpPayloadKey] = useState('rows');

  const [sourceRef, setSourceRef] = useState<string | null>(null);
  const [sourceTables, setSourceTables] = useState<string[]>([]);
  const [targetRef, setTargetRef] = useState<string | null>(null);
  const [targetTables, setTargetTables] = useState<TargetTableOut[]>([]);

  const [pairs, setPairs] = useState<PairRow[]>(() => [newPair()]);

  const [batchSize, setBatchSize] = useState('1000');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusRes | null>(null);

  const showToast = useCallback((msg: string, variant: 'success' | 'error') => {
    setToast({ msg, variant });
  }, []);

  const defaultSourceSchema = useMemo(() => sourceForm.introspectionSchema.trim(), [sourceForm]);
  const defaultTargetSchema = useMemo(() => targetForm.introspectionSchema.trim(), [targetForm]);

  const pingMiddleware = async () => {
    setBusy(true);
    try {
      const h = await middlewareJson<{ status?: string }>(mwBase, '/api/v1/health');
      showToast(`Terhubung ke middleware: ${JSON.stringify(h)}`, 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menghubungi middleware', 'error');
    } finally {
      setBusy(false);
    }
  };

  const connectSource = async () => {
    setBusy(true);
    try {
      const res = await middlewareJson<SourceConfigRes>(mwBase, '/api/v1/integration/source-config', {
        method: 'POST',
        body: JSON.stringify({ source: buildConfigPayload(sourceForm) }),
      });
      if (!res.ok) {
        showToast(res.detail || 'Gagal menghubungkan sumber', 'error');
        return;
      }
      if (!res.connection_ref) {
        showToast('Respons tidak berisi connection_ref', 'error');
        return;
      }
      setSourceRef(res.connection_ref);
      setSourceTables(res.tables ?? []);
      setPairs((prev) =>
        prev.map((p, i) =>
          i === 0 ? { ...p, sourceSchema: sourceForm.introspectionSchema.trim() } : p,
        ),
      );
      showToast(`Sumber OK — ${(res.tables ?? []).length} tabel ditemukan.`, 'success');
      setStep(2);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const connectTargetDb = async () => {
    setBusy(true);
    try {
      const res = await middlewareJson<TargetConfigRes>(mwBase, '/api/v1/integration/target-config', {
        method: 'POST',
        body: JSON.stringify({ target: buildConfigPayload(targetForm) }),
      });
      if (!res.ok) {
        showToast(res.detail || 'Gagal menghubungkan tujuan', 'error');
        return;
      }
      if (!res.connection_ref) {
        showToast('Respons tidak berisi connection_ref', 'error');
        return;
      }
      setTargetRef(res.connection_ref);
      setTargetTables(res.tables ?? []);
      setPairs((prev) =>
        prev.map((p, i) =>
          i === 0 ? { ...p, targetSchema: targetForm.introspectionSchema.trim() } : p,
        ),
      );
      showToast(`Tujuan OK — ${(res.tables ?? []).length} tabel ditemukan.`, 'success');
      setStep(3);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const advanceFromTargetStep = () => {
    if (targetDestination === 'http') {
      if (!httpUrl.trim()) {
        showToast('Isi URL endpoint API.', 'error');
        return;
      }
      setTargetRef(null);
      setTargetTables([]);
      setStep(3);
      return;
    }
    void connectTargetDb();
  };

  const updatePair = (id: string, patch: Partial<PairRow>) => {
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const addPair = () => {
    setPairs((prev) => [
      ...prev,
      {
        ...newPair(),
        sourceSchema: defaultSourceSchema,
        targetSchema: defaultTargetSchema,
      },
    ]);
  };

  const removePair = (id: string) => {
    setPairs((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)));
  };

  const loadColumnsForPair = async (pair: PairRow) => {
    if (!sourceRef || !pair.sourceTable.trim()) {
      showToast('Pilih tabel sumber untuk pasangan ini.', 'error');
      return;
    }
    setBusy(true);
    try {
      if (targetDestination === 'database') {
        if (!targetRef || !pair.targetTable.trim()) {
          showToast('Hubungkan database tujuan dan pilih tabel tujuan.', 'error');
          return;
        }
        const q = new URLSearchParams({
          source_ref: sourceRef,
          target_ref: targetRef,
          source_table: pair.sourceTable.trim(),
          target_table: pair.targetTable.trim(),
        });
        if (pair.sourceSchema.trim()) q.set('source_schema', pair.sourceSchema.trim());
        if (pair.targetSchema.trim()) q.set('target_schema', pair.targetSchema.trim());

        const res = await middlewareJson<SchemaCompRes>(
          mwBase,
          `/api/v1/integration/schema-comparison?${q.toString()}`,
          { method: 'GET' },
        );
        if (!res.ok) {
          showToast(res.detail || 'Gagal memuat kolom', 'error');
          return;
        }
        const sc = res.source_columns ?? [];
        const tc = res.target_columns ?? [];
        const nextMap: Record<string, string> = {};
        const targetNames = new Set(tc.map((c) => c.name));
        for (const c of sc) {
          if (targetNames.has(c.name)) nextMap[c.name] = c.name;
          else {
            const loose = tc.find((t) => t.name.toLowerCase() === c.name.toLowerCase());
            nextMap[c.name] = loose ? loose.name : '';
          }
        }
        const nextConstants: Record<string, string> = {};
        for (const t of tc) {
          const mapped = Object.values(nextMap).some(
            (dest) => dest.trim().toLowerCase() === t.name.toLowerCase(),
          );
          if (!mapped && t.nullable === false) {
            nextConstants[t.name] = pair.constants[t.name] ?? '';
          }
        }
        updatePair(pair.id, { sourceCols: sc, targetCols: tc, mapping: nextMap, constants: nextConstants });
        showToast(`${pair.sourceTable}: ${sc.length} kolom sumber · ${tc.length} kolom tujuan`, 'success');
      } else {
        const q = new URLSearchParams({
          source_ref: sourceRef,
          source_table: pair.sourceTable.trim(),
        });
        if (pair.sourceSchema.trim()) q.set('source_schema', pair.sourceSchema.trim());
        const res = await middlewareJson<SourceColsRes>(
          mwBase,
          `/api/v1/integration/source-columns?${q.toString()}`,
          { method: 'GET' },
        );
        if (!res.ok) {
          showToast(res.detail || 'Gagal memuat kolom sumber', 'error');
          return;
        }
        const sc = res.columns ?? [];
        const nextMap: Record<string, string> = {};
        for (const c of sc) {
          nextMap[c.name] = c.name;
        }
        updatePair(pair.id, {
          sourceCols: sc,
          targetCols: [],
          mapping: nextMap,
          constants: {},
        });
        showToast(`${pair.sourceTable}: ${sc.length} kolom (isi nama field JSON API di mapping).`, 'success');
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  const loadAllPairs = async () => {
    let n = 0;
    for (const p of pairs) {
      if (!p.sourceTable.trim()) continue;
      if (targetDestination === 'database' && !p.targetTable.trim()) continue;
      await loadColumnsForPair(p);
      n += 1;
    }
    if (n === 0) {
      showToast('Isi minimal satu pasangan dengan tabel sumber (dan tujuan jika ke DB).', 'error');
      return;
    }
    showToast(`${n} permintaan muat kolom selesai — periksa tiap pasangan, lalu lanjut ke Mapping.`, 'success');
  };

  const fieldReadyPairs = useMemo(() => pairs.filter((p) => p.sourceCols.length > 0), [pairs]);

  const startSync = async () => {
    if (!sourceRef) {
      showToast('Hubungkan sumber terlebih dahulu.', 'error');
      return;
    }
    if (targetDestination === 'database' && !targetRef) {
      showToast('Hubungkan database tujuan.', 'error');
      return;
    }
    if (targetDestination === 'http' && !httpUrl.trim()) {
      showToast('URL API wajib diisi.', 'error');
      return;
    }
    const mappingsPayload = fieldReadyPairs
      .map((p) => {
        const fm = pickMapping(p.mapping);
        if (Object.keys(fm).length === 0) return null;
        return {
          source_table: p.sourceTable.trim(),
          target_table:
            targetDestination === 'database'
              ? p.targetTable.trim()
              : (p.targetTable.trim() || p.sourceTable.trim()),
          field_mapping: fm,
          constants:
            targetDestination === 'database'
              ? Object.fromEntries(
                  Object.entries(p.constants).filter(([, v]) => String(v ?? '').trim() !== ''),
                )
              : null,
          source_schema: p.sourceSchema.trim() || null,
          target_schema: targetDestination === 'database' ? p.targetSchema.trim() || null : null,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];

    if (mappingsPayload.length === 0) {
      showToast('Lengkapi mapping kolom untuk minimal satu pasangan.', 'error');
      return;
    }

    const bs = Number.parseInt(batchSize, 10);
    const body: Record<string, unknown> = {
      source_connection_id: sourceRef,
      target_mode: targetDestination === 'http' ? 'http' : 'database',
      mappings: mappingsPayload,
      batch_size: Number.isFinite(bs) && bs > 0 ? bs : 1000,
    };
    if (targetDestination === 'database') {
      body.target_connection_id = targetRef;
    } else {
      body.http_target = {
        url: httpUrl.trim(),
        method: 'POST',
        bearer_token: httpBearer.trim() || null,
        payload_key: httpPayloadKey.trim() || 'rows',
      };
    }

    setBusy(true);
    try {
      const res = await middlewareJson<StartSyncRes>(mwBase, '/api/v1/sync', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setTaskId(res.task_id);
      setSyncStatus({
        task_id: res.task_id,
        status: 'processing',
        rows_read: null,
        batches_written: null,
        error: null,
      });
      showToast('Sinkronisasi dimulai di latar belakang.', 'success');
      setStep(5);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!taskId || !mwBase) return;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const st = await middlewareJson<SyncStatusRes>(
          mwBase,
          `/api/v1/sync-status/${encodeURIComponent(taskId)}`,
          { method: 'GET' },
        );
        if (!active) return;
        setSyncStatus(st);
        if (st.status === 'processing') {
          window.setTimeout(poll, 1400);
        }
      } catch (e) {
        if (!active) return;
        showToast(e instanceof Error ? e.message : 'Gagal membaca status', 'error');
      }
    };

    void poll();
    return () => {
      active = false;
    };
  }, [taskId, mwBase, showToast]);

  return (
    <div className="data-sync-wizard">
      <header className="data-sync-hero">
        <h1>Sinkronisasi data antar database atau ke API</h1>
        <p className="data-sync-lead">
          Anda bisa menyalin <strong>beberapa tabel</strong> sekaligus dari satu database sumber ke banyak
          tabel di database lain, atau mengirim batch baris ke <strong>endpoint HTTP</strong> (JSON).
        </p>
      </header>

      {toast ? <ToastMessage message={toast.msg} variant={toast.variant} /> : null}

      <section className="data-sync-service">
        <label>
          Alamat middleware (URL)
          <input
            value={mwBase}
            onChange={(e) => setMwBase(e.target.value)}
            placeholder="http://127.0.0.1:8000"
            autoComplete="url"
          />
        </label>
        <p className="muted data-sync-hint">
          Contoh: mesin tempat Anda menjalankan <code>uvicorn app.main:app</code>.
        </p>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void pingMiddleware()}>
          Tes koneksi middleware
        </button>
      </section>

      <nav className="data-sync-steps" aria-label="Langkah">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`data-sync-step-pill ${step === s.id ? 'active' : ''} ${step > s.id ? 'done' : ''}`}
            onClick={() => setStep(s.id)}
          >
            <span className="data-sync-step-num">{s.id}</span>
            <span className="data-sync-step-label">{s.title}</span>
          </button>
        ))}
      </nav>
      <p className="muted data-sync-step-hint">{STEPS.find((s) => s.id === step)?.hint}</p>

      {step === 1 && (
        <section className="data-sync-card">
          <h2 className="form-section-title">Database sumber</h2>
          <p className="muted">
            Semua tabel yang Anda pilih nanti akan dibaca dari koneksi ini (satu sumber per job).
          </p>
          <ConnFormFields form={sourceForm} setForm={setSourceForm} idPrefix="src" />
          <div className="data-sync-actions">
            <button type="button" disabled={busy} onClick={() => void connectSource()}>
              Hubungkan &amp; muat daftar tabel
            </button>
          </div>
          {sourceTables.length > 0 && (
            <p className="muted">{sourceTables.length} tabel terdeteksi di sumber.</p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="data-sync-card">
          <h2 className="form-section-title">Tujuan sinkronisasi</h2>
          <p className="muted">
            <strong>Database:</strong> INSERT batch ke tabel lain. <strong>API HTTP:</strong> kirim JSON{' '}
            <code>{'{'} &quot;rows&quot;: [ ... ] {'}'}</code> per batch ke layanan Anda.
          </p>
          <div className="data-sync-target-choice">
            <label className="data-sync-radio">
              <input
                type="radio"
                name="tgt"
                checked={targetDestination === 'database'}
                onChange={() => setTargetDestination('database')}
              />
              Database lain (PostgreSQL / MySQL / Oracle)
            </label>
            <label className="data-sync-radio">
              <input
                type="radio"
                name="tgt"
                checked={targetDestination === 'http'}
                onChange={() => setTargetDestination('http')}
              />
              API HTTP (REST)
            </label>
          </div>

          {targetDestination === 'database' ? (
            <>
              <ConnFormFields form={targetForm} setForm={setTargetForm} idPrefix="tgt" />
              <div className="data-sync-actions">
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => setStep(1)}>
                  Kembali
                </button>
                <button type="button" disabled={busy} onClick={() => void advanceFromTargetStep()}>
                  Hubungkan tujuan
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="form-grid">
                <label className="full-row">
                  URL endpoint (HTTPS disarankan)
                  <input
                    value={httpUrl}
                    onChange={(e) => setHttpUrl(e.target.value)}
                    placeholder="https://api.internal/v1/ingest/batch"
                  />
                </label>
                <label className="full-row">
                  Bearer token (opsional)
                  <input
                    type="password"
                    value={httpBearer}
                    onChange={(e) => setHttpBearer(e.target.value)}
                    autoComplete="off"
                  />
                </label>
                <label className="full-row">
                  Nama field JSON untuk array baris
                  <input
                    value={httpPayloadKey}
                    onChange={(e) => setHttpPayloadKey(e.target.value)}
                    placeholder="rows"
                  />
                </label>
              </div>
              <p className="muted">
                Body tiap batch: <code>{`{ "${httpPayloadKey.trim() || 'rows'}": [ { ...kolom... }, ... ] }`}</code>
              </p>
              <div className="data-sync-actions">
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => setStep(1)}>
                  Kembali
                </button>
                <button type="button" disabled={busy} onClick={() => advanceFromTargetStep()}>
                  Lanjut ke pasangan tabel
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="data-sync-card">
          <h2 className="form-section-title">Pasangan tabel</h2>
          <p className="muted">
            Tambahkan beberapa baris untuk menyalin banyak tabel dalam satu job. Tiap pasangan punya mapping
            kolom sendiri di langkah berikutnya.
          </p>
          {!sourceRef ? (
            <p className="error">Hubungkan database sumber di langkah 1.</p>
          ) : (
            <>
              {pairs.map((pair, idx) => (
                <div key={pair.id} className="data-sync-pair-card">
                  <div className="data-sync-pair-head">
                    <span className="form-subsection-title">Pasangan {idx + 1}</span>
                    {pairs.length > 1 && (
                      <button type="button" className="btn-secondary btn-small" onClick={() => removePair(pair.id)}>
                        Hapus
                      </button>
                    )}
                  </div>
                  <div className="form-grid">
                    <label>
                      Tabel sumber
                      <select
                        value={pair.sourceTable}
                        onChange={(e) => updatePair(pair.id, { sourceTable: e.target.value })}
                      >
                        <option value="">— pilih —</option>
                        {sourceTables.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    {targetDestination === 'database' && (
                      <label>
                        Tabel tujuan
                        <select
                          value={pair.targetTable}
                          onChange={(e) => updatePair(pair.id, { targetTable: e.target.value })}
                        >
                          <option value="">— pilih —</option>
                          {targetTables.map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {targetDestination === 'http' && (
                      <label>
                        Label / nama logis (opsional)
                        <input
                          value={pair.targetTable}
                          onChange={(e) => updatePair(pair.id, { targetTable: e.target.value })}
                          placeholder="sama dengan sumber jika kosong"
                        />
                      </label>
                    )}
                    <label>
                      Schema sumber (opsional)
                      <input
                        value={pair.sourceSchema}
                        onChange={(e) => updatePair(pair.id, { sourceSchema: e.target.value })}
                        placeholder={defaultSourceSchema || '—'}
                      />
                    </label>
                    {targetDestination === 'database' && (
                      <label>
                        Schema tujuan (opsional)
                        <input
                          value={pair.targetSchema}
                          onChange={(e) => updatePair(pair.id, { targetSchema: e.target.value })}
                          placeholder={defaultTargetSchema || '—'}
                        />
                      </label>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => void loadColumnsForPair(pair)}
                  >
                    Muat kolom untuk pasangan ini
                  </button>
                  {pair.sourceCols.length > 0 && (
                    <p className="muted">
                      {pair.sourceCols.length} kolom siap dimapping
                      {targetDestination === 'database' ? ` · ${pair.targetCols.length} kolom tujuan` : ''}.
                    </p>
                  )}
                </div>
              ))}
              <div className="data-sync-actions">
                <button type="button" className="btn-secondary" onClick={addPair}>
                  + Tambah pasangan tabel
                </button>
              </div>
              <div className="data-sync-actions">
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => setStep(2)}>
                  Kembali
                </button>
                <button type="button" disabled={busy} onClick={() => void loadAllPairs()}>
                  Muat kolom semua &amp; lanjut mapping
                </button>
                <button
                  type="button"
                  disabled={busy || fieldReadyPairs.length === 0}
                  onClick={() => setStep(4)}
                >
                  Lanjut mapping
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="data-sync-card">
          <h2 className="form-section-title">Mapping kolom per pasangan</h2>
          {fieldReadyPairs.map((pair, idx) => (
            <div key={pair.id} className="data-sync-pair-card">
              <h3 className="form-subsection-title">
                Pasangan {idx + 1}: <code>{pair.sourceTable}</code>
                {targetDestination === 'database' ? (
                  <>
                    {' '}
                    → <code>{pair.targetTable}</code>
                  </>
                ) : (
                  <> → API</>
                )}
              </h3>
              <div className="data-sync-mapping-table-wrap">
                <table className="data-sync-mapping-table">
                  <thead>
                    <tr>
                      <th>Kolom sumber</th>
                      <th>Tipe</th>
                      <th>
                        {targetDestination === 'database'
                          ? '→ Kolom tujuan (DB)'
                          : '→ Nama field JSON di API'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pair.sourceCols.map((c) => (
                      <tr key={c.name}>
                        <td>
                          <code>{c.name}</code>
                        </td>
                        <td className="muted">{c.type}</td>
                        <td>
                          {targetDestination === 'database' ? (
                            <select
                              value={pair.mapping[c.name] ?? ''}
                              onChange={(e) =>
                                updatePair(pair.id, {
                                  mapping: { ...pair.mapping, [c.name]: e.target.value },
                                })
                              }
                            >
                              <option value="">— lewati —</option>
                              {(pair.targetCols ?? []).map((t) => (
                                <option key={t.name} value={t.name}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={pair.mapping[c.name] ?? ''}
                              onChange={(e) =>
                                updatePair(pair.id, {
                                  mapping: { ...pair.mapping, [c.name]: e.target.value },
                                })
                              }
                              placeholder="field_json"
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {targetDestination === 'database' && Object.keys(pair.constants).length > 0 && (
                <div className="data-sync-constants">
                  <p className="muted" style={{ marginTop: 0 }}>
                    Kolom wajib yang belum terisi mapping. Isi nilai tetap:
                  </p>
                  <div className="form-grid">
                    {Object.keys(pair.constants).map((col) => (
                      <label key={col}>
                        {col}
                        <input
                          value={pair.constants[col] ?? ''}
                          onChange={(e) =>
                            updatePair(pair.id, {
                              constants: {
                                ...pair.constants,
                                [col]: e.target.value,
                              },
                            })
                          }
                          placeholder="nilai default"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <p className="muted">
            Total kolom tersinkron (non-kosong):{' '}
            <strong>
              {fieldReadyPairs.reduce((n, p) => n + Object.keys(pickMapping(p.mapping)).length, 0)}
            </strong>
          </p>
          <div className="data-sync-actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setStep(3)}>
              Kembali
            </button>
            <button type="button" disabled={busy || fieldReadyPairs.length === 0} onClick={() => setStep(5)}>
              Lanjut ke eksekusi
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="data-sync-card">
          <h2 className="form-section-title">Jalankan sinkronisasi</h2>
          <p className="muted">
            Semua pasangan akan diproses berurutan dalam satu job latar belakang.
          </p>
          <div className="form-grid">
            <label>
              Ukuran batch (baris per sekali kirim / per request API)
              <input value={batchSize} onChange={(e) => setBatchSize(e.target.value)} inputMode="numeric" />
            </label>
          </div>
          <div className="data-sync-actions">
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setStep(4)}>
              Kembali
            </button>
            <button type="button" disabled={busy || !sourceRef} onClick={() => void startSync()}>
              Mulai sinkronisasi
            </button>
          </div>

          {taskId ? (
            <div className="data-sync-status-panel">
              <h3 className="form-subsection-title">Status tugas</h3>
              <p>
                <span className="muted">task_id:</span> <code>{taskId}</code>
              </p>
              {syncStatus ? (
                <>
                  <p>
                    Status:{' '}
                    <strong className={`data-sync-status data-sync-status--${syncStatus.status}`}>
                      {syncStatus.status === 'processing' && 'Sedang memproses…'}
                      {syncStatus.status === 'completed' && 'Selesai'}
                      {syncStatus.status === 'failed' && 'Gagal'}
                    </strong>
                  </p>
                  {syncStatus.status === 'completed' && (
                    <p className="muted">
                      {syncStatus.rows_read ?? 0} baris dibaca · {syncStatus.batches_written ?? 0} batch.
                    </p>
                  )}
                  {syncStatus.status === 'failed' && syncStatus.error && (
                    <p className="error">{syncStatus.error}</p>
                  )}
                </>
              ) : (
                <p className="muted">Menunggu pembaruan status…</p>
              )}
            </div>
          ) : (
            <p className="muted">Tekan Mulai sinkronisasi untuk mendapat task_id.</p>
          )}
        </section>
      )}
    </div>
  );
}

function ConnFormFields({
  form,
  setForm,
  idPrefix,
}: {
  form: ConnForm;
  setForm: (f: ConnForm | ((prev: ConnForm) => ConnForm)) => void;
  idPrefix: string;
}) {
  return (
    <div className="form-grid">
      <label className="full-row">
        Tipe database
        <select
          value={form.kind}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              kind: e.target.value as DbKind,
            }))
          }
        >
          <option value="postgresql">PostgreSQL</option>
          <option value="mysql">MySQL</option>
          <option value="oracle">Oracle</option>
        </select>
      </label>
      {form.kind === 'oracle' && (
        <div className="data-sync-oracle-callout full-row" role="note">
          <strong>Oracle / EBS</strong>
          <p>
            Banyak database seperti EBS memakai password verifier yang <em>tidak didukung mode Thin</em>{' '}
            (error DPY-3015). Di mesin yang menjalankan middleware Python, pasang{' '}
            <strong>Oracle Instant Client</strong>, lalu isi <code>ORACLE_CLIENT_LIB_DIR</code> di{' '}
            <code>middleware/.env</code> (folder berisi <code>oci.dll</code>) atau{' '}
            <code>ORACLE_THICK_MODE=true</code> jika library sudah di PATH. Restart <code>uvicorn</code>.
          </p>
          <p className="muted data-sync-oracle-callout-foot">
            Variabel <code>ORACLE_DATABASE_*</code> di project lain tidak otomatis dipakai middleware —
            yang dibaca hanya <code>middleware/.env</code>.
          </p>
        </div>
      )}
      <label>
        Host
        <input
          id={`${idPrefix}-host`}
          value={form.host}
          onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
        />
      </label>
      <label>
        Port
        <input
          id={`${idPrefix}-port`}
          value={form.port}
          onChange={(e) => setForm((f) => ({ ...f, port: e.target.value }))}
        />
      </label>
      <label>
        User
        <input
          id={`${idPrefix}-user`}
          value={form.user}
          onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
          autoComplete="off"
        />
      </label>
      <label className="full-row">
        Password
        <input
          id={`${idPrefix}-pass`}
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          autoComplete="off"
        />
      </label>
      {(form.kind === 'postgresql' || form.kind === 'mysql') && (
        <label className="full-row">
          Nama database
          <input
            value={form.database}
            onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))}
            placeholder={form.kind === 'postgresql' ? 'mydb' : 'mydb'}
          />
        </label>
      )}
      {form.kind === 'oracle' && (
        <>
          <label className="full-row">
            Service name
            <input
              value={form.serviceName}
              onChange={(e) => setForm((f) => ({ ...f, serviceName: e.target.value }))}
              placeholder="ORCLPDB1"
            />
          </label>
          <label className="full-row">
            Database / SID (opsional)
            <input
              value={form.database}
              onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))}
            />
          </label>
        </>
      )}
      {form.kind === 'postgresql' && (
        <label className="full-row">
          sslmode (opsional)
          <input
            value={form.sslmode}
            onChange={(e) => setForm((f) => ({ ...f, sslmode: e.target.value }))}
            placeholder="prefer"
          />
        </label>
      )}
      <label className="full-row">
        Schema untuk introspeksi (opsional)
        <input
          value={form.introspectionSchema}
          onChange={(e) => setForm((f) => ({ ...f, introspectionSchema: e.target.value }))}
          placeholder="public · APPUSER · dll."
        />
      </label>
    </div>
  );
}
