'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { filterWarehousesForCustomer } from '@/src/lib/warehouse-customer-filter';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import CustomerBrowseField from '@/src/components/ui/CustomerBrowseField';

const FINDING_CATEGORIES = ['QTY', 'WEIGHT', 'DESCRIPTION', 'PARTY', 'DOC_MISSING', 'OTHER'] as const;

const MANIFEST_DOC_TYPES = [
  'AWB',
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'BL',
  'OTHER',
] as const;

const MANIFEST_DOC_LABEL: Record<string, string> = {
  AWB: 'AWB',
  COMMERCIAL_INVOICE: 'Commercial Invoice (CI)',
  PACKING_LIST: 'Packing List (PL)',
  BL: 'Bill of Lading (BL)',
  OTHER: 'Lainnya',
};

type TabKey = 'summary' | 'awb' | 'documents' | 'compare' | 'findings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Ringkasan kiriman' },
  { key: 'awb', label: 'Detail AWB' },
  { key: 'documents', label: 'Dokumen' },
  { key: 'compare', label: 'Perbandingan baris' },
  { key: 'findings', label: 'Temuan & status' },
];

function str(v: unknown): string {
  return v != null ? String(v) : '';
}

function consignmentPrimaryRef(row: Record<string, unknown>): string {
  const master = str(row.masterRef).trim();
  if (master) return master;
  const mawb = str(row.awbMawb).trim();
  if (mawb) return mawb;
  return str(row.consignmentNo);
}

export default function ManifestReviewPanel() {
  const { apiBase, token, customers, warehouses, asns, busy: dataBusy, refreshReferenceData } = useWmsData();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [list, setList] = useState<Record<string, unknown>[]>([]);
  const [listBusy, setListBusy] = useState(false);

  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterWarehouseId, setFilterWarehouseId] = useState('');
  const [searchRef, setSearchRef] = useState('');

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [tab, setTab] = useState<TabKey>('summary');

  const [showNewModal, setShowNewModal] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newWarehouseId, setNewWarehouseId] = useState('');
  const [newMasterRef, setNewMasterRef] = useState('');
  const [newAsnIds, setNewAsnIds] = useState<Set<string>>(() => new Set());

  const [masterRefForm, setMasterRefForm] = useState('');
  const [awbForm, setAwbForm] = useState({
    mawb: '',
    hawb: '',
    carrier: '',
    flight: '',
    origin: '',
    destination: '',
    shipper: '',
    consignee: '',
    pieces: '',
    grossWeightKg: '',
    chargeableWeightKg: '',
    natureOfGoods: '',
  });

  const [manifestStatus, setManifestStatus] = useState('DRAFT');
  const [manifestNotes, setManifestNotes] = useState('');
  const [waivedReason, setWaivedReason] = useState('');
  const [findingRows, setFindingRows] = useState<Array<{ category: string; message: string }>>([]);

  const [docUploadType, setDocUploadType] = useState<string>('AWB');
  const [docUploadBusy, setDocUploadBusy] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  const warehousesForFilter = useMemo(
    () => filterWarehousesForCustomer(warehouses, filterCustomerId || undefined),
    [warehouses, filterCustomerId],
  );

  const warehousesForNew = useMemo(
    () => filterWarehousesForCustomer(warehouses, newCustomerId || undefined),
    [warehouses, newCustomerId],
  );

  const asnsForNew = useMemo(() => {
    if (!newCustomerId || !newWarehouseId) return [];
    return asns.filter((a) => {
      const row = a as Record<string, unknown>;
      return str(row.customerId) === newCustomerId && str(row.warehouseId) === newWarehouseId;
    });
  }, [asns, newCustomerId, newWarehouseId]);

  const loadList = useCallback(async () => {
    if (!token) return;
    setListBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filterCustomerId) qs.set('customerId', filterCustomerId);
      if (filterWarehouseId) qs.set('warehouseId', filterWarehouseId);
      const q = qs.toString();
      const data = await callApi(apiBase, token, 'GET', `/import-consignments${q ? `?${q}` : ''}`);
      setList(Array.isArray(data) ? (data as Record<string, unknown>[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat daftar');
      setList([]);
    } finally {
      setListBusy(false);
    }
  }, [apiBase, token, filterCustomerId, filterWarehouseId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filteredList = useMemo(() => {
    const q = searchRef.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const blob = [
        consignmentPrimaryRef(row),
        str(row.consignmentNo),
        str((row as { awbMawb?: string }).awbMawb),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [list, searchRef]);

  const loadDetail = async (id: string) => {
    if (!token) return;
    setDetailBusy(true);
    setError(null);
    try {
      const data = (await callApi(apiBase, token, 'GET', `/import-consignments/${id}`)) as Record<
        string,
        unknown
      >;
      setDetail(data);
      setMasterRefForm(str(data.masterRef));
      setAwbForm({
        mawb: str(data.awbMawb),
        hawb: str(data.awbHawb),
        carrier: str(data.awbCarrier),
        flight: str(data.awbFlight),
        origin: str(data.awbOrigin),
        destination: str(data.awbDestination),
        shipper: str(data.awbShipper),
        consignee: str(data.awbConsignee),
        pieces: data.awbPieces != null ? String(data.awbPieces) : '',
        grossWeightKg: data.awbGrossWeightKg != null ? String(data.awbGrossWeightKg) : '',
        chargeableWeightKg: data.awbChargeableWeightKg != null ? String(data.awbChargeableWeightKg) : '',
        natureOfGoods: str(data.awbNatureOfGoods),
      });
      const mr = data.manifestReview as Record<string, unknown> | null | undefined;
      if (mr) {
        setManifestStatus(str(mr.status) || 'DRAFT');
        setManifestNotes(str(mr.notes ?? ''));
        setWaivedReason(str(mr.waivedReason ?? ''));
        const findings = Array.isArray(mr.findings) ? (mr.findings as Record<string, unknown>[]) : [];
        setFindingRows(
          findings.map((f) => ({
            category: str(f.category) || 'OTHER',
            message: str(f.message),
          })),
        );
      } else {
        setManifestStatus('DRAFT');
        setManifestNotes('');
        setWaivedReason('');
        setFindingRows([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat detail');
      setDetail(null);
    } finally {
      setDetailBusy(false);
    }
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView('detail');
    setTab('summary');
    void loadDetail(id);
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setActionBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      setSuccess('Berhasil disimpan');
      await loadList();
      if (selectedId) await loadDetail(selectedId);
      await refreshReferenceData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request gagal');
    } finally {
      setActionBusy(false);
    }
  };

  const saveAwb = () => {
    if (!selectedId || !token) return;
    const pieces = awbForm.pieces.trim() ? parseInt(awbForm.pieces, 10) : undefined;
    const gross = awbForm.grossWeightKg.trim() ? Number(awbForm.grossWeightKg) : undefined;
    const chg = awbForm.chargeableWeightKg.trim() ? Number(awbForm.chargeableWeightKg) : undefined;
    void run('save-awb', async () => {
      await callApi(apiBase, token, 'PATCH', `/import-consignments/${selectedId}`, {
        masterRef: masterRefForm.trim() || null,
        awbMawb: awbForm.mawb.trim() || null,
        awbHawb: awbForm.hawb.trim() || null,
        awbCarrier: awbForm.carrier.trim() || null,
        awbFlight: awbForm.flight.trim() || null,
        awbOrigin: awbForm.origin.trim() || null,
        awbDestination: awbForm.destination.trim() || null,
        awbShipper: awbForm.shipper.trim() || null,
        awbConsignee: awbForm.consignee.trim() || null,
        awbPieces: Number.isFinite(pieces) ? pieces : null,
        awbGrossWeightKg: Number.isFinite(gross!) ? gross : null,
        awbChargeableWeightKg: Number.isFinite(chg!) ? chg : null,
        awbNatureOfGoods: awbForm.natureOfGoods.trim() || null,
      });
    });
  };

  const uploadManifestDocument = async () => {
    const input = docFileRef.current;
    if (!selectedId || !token || !input?.files?.length) {
      setError('Pilih file terlebih dahulu');
      return;
    }
    const file = input.files[0];
    setDocUploadBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${apiBase}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        const body = data as { message?: string | string[] };
        const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
        throw new Error(msg || `${res.status} ${res.statusText}`);
      }
      const key = (data as { key?: string })?.key;
      if (!key) throw new Error('Respons upload tidak berisi key');
      await callApi(apiBase, token, 'POST', `/import-consignments/${selectedId}/documents`, {
        docType: docUploadType,
        storageKey: key,
        originalFileName: file.name,
        contentType: file.type || undefined,
      });
      setSuccess('Dokumen tersimpan');
      input.value = '';
      await loadDetail(selectedId);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unggah gagal');
    } finally {
      setDocUploadBusy(false);
    }
  };

  const deleteManifestDocument = async (docId: string) => {
    if (!selectedId || !token) return;
    setDocUploadBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'DELETE', `/import-consignments/${selectedId}/documents/${docId}`);
      setSuccess('Dokumen dihapus dari daftar');
      await loadDetail(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hapus gagal');
    } finally {
      setDocUploadBusy(false);
    }
  };

  const saveManifest = () => {
    if (!selectedId || !token) return;
    void run('save-manifest', async () => {
      const findings = findingRows
        .filter((r) => r.message.trim())
        .map((r, idx) => ({
          category: r.category,
          message: r.message.trim(),
          sortOrder: idx,
        }));
      await callApi(apiBase, token, 'PATCH', `/import-consignments/${selectedId}/manifest-review`, {
        status: manifestStatus,
        notes: manifestNotes.trim() || undefined,
        waivedReason: manifestStatus === 'WAIVED' ? waivedReason.trim() : undefined,
        findings,
      });
    });
  };

  const submitNewConsignment = () => {
    if (!newCustomerId || !newWarehouseId) {
      setError('Pilih customer dan gudang');
      return;
    }
    void run('create-consignment', async () => {
      await callApi(apiBase, token, 'POST', '/import-consignments', {
        customerId: newCustomerId,
        warehouseId: newWarehouseId,
        masterRef: newMasterRef.trim() || undefined,
        inboundAsnIds: newAsnIds.size > 0 ? [...newAsnIds] : undefined,
      });
      setShowNewModal(false);
      setNewMasterRef('');
      setNewAsnIds(new Set());
      setView('list');
    });
  };

  const compareRows = useMemo(() => {
    if (!detail) return [];
    const links = Array.isArray(detail.asnLinks)
      ? (detail.asnLinks as Record<string, unknown>[])
      : [];
    const asnIds = links
      .map((l) => {
        const asn = l.inboundAsn as Record<string, unknown> | undefined;
        return asn ? str(asn.id) : '';
      })
      .filter(Boolean);
    const rows: Array<{ key: string; sku: string; desc: string; qtyExpected: string }> = [];
    for (const id of asnIds) {
      const asn = asns.find((a) => a.id === id) as Record<string, unknown> | undefined;
      if (!asn || !Array.isArray(asn.items)) continue;
      for (const it of asn.items as Record<string, unknown>[]) {
        const product = it.product as Record<string, unknown> | undefined;
        rows.push({
          key: `${id}-${str(it.id)}`,
          sku: product ? str(product.sku) : str(it.productId),
          desc: product ? str(product.name) : '',
          qtyExpected: str(it.qtyExpected),
        });
      }
    }
    return rows;
  }, [detail, asns]);

  const busy = dataBusy || listBusy || actionBusy;

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />

      <div className="table-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>Manifest review</h1>
          <p className="muted" style={{ margin: 0, fontSize: '13px', maxWidth: '760px' }}>
            Penyamaan dokumen impor (AWB, CI, PL, ASN). Jika gudang mengaktifkan gate manifest, customs release
            pada receipt HELD memerlukan status <code>MATCHED</code> atau <code>WAIVED</code> — ditegakkan di
            backend.
          </p>
        </div>
      </div>

      {view === 'list' ? (
        <div className="card">
          <div className="master-data-toolbar">
            <div className="master-data-toolbar-filters">
              <div>
                <label>Customer</label>
                <select
                  value={filterCustomerId}
                  onChange={(e) => {
                    setFilterCustomerId(e.target.value);
                    setFilterWarehouseId('');
                  }}
                >
                  <option value="">Semua</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Gudang</label>
                <select
                  value={filterWarehouseId}
                  onChange={(e) => setFilterWarehouseId(e.target.value)}
                  disabled={Boolean(filterCustomerId) && warehousesForFilter.length === 0}
                >
                  <option value="">Semua</option>
                  {(filterCustomerId ? warehousesForFilter : warehouses).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                      {w.isTransitImportHub ? ' (transit)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Cari MAWB / referensi / no. konsignment</label>
                <input
                  value={searchRef}
                  onChange={(e) => setSearchRef(e.target.value)}
                  placeholder="157-xxxxx / IC-…"
                />
              </div>
            </div>
            <div className="master-data-toolbar-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || !token}
                onClick={() => {
                  setShowNewModal(true);
                  setNewCustomerId(filterCustomerId || '');
                  setNewWarehouseId(filterWarehouseId || '');
                  setNewAsnIds(new Set());
                }}
              >
                + Kiriman baru
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>No. konsignment</th>
                  <th>Referensi utama</th>
                  <th>ASN terkait</th>
                  <th>Status review</th>
                  <th className="table-actions-col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      {listBusy ? 'Memuat…' : 'Belum ada data'}
                    </td>
                  </tr>
                ) : (
                  filteredList.map((row) => {
                    const id = str(row.id);
                    const links = Array.isArray(row.asnLinks)
                      ? (row.asnLinks as Record<string, unknown>[])
                      : [];
                    const asnLabels = links
                      .map((l) => {
                        const asn = l.inboundAsn as Record<string, unknown> | undefined;
                        return asn ? str(asn.asnNo) : '';
                      })
                      .filter(Boolean)
                      .join(', ');
                    const mr = row.manifestReview as Record<string, unknown> | undefined;
                    const st = mr ? str(mr.status) : '—';
                    return (
                      <tr key={id}>
                        <td>{str(row.consignmentNo)}</td>
                        <td>{consignmentPrimaryRef(row)}</td>
                        <td>{asnLabels || '—'}</td>
                        <td>
                          <span className="badge">{st}</span>
                        </td>
                        <td className="table-actions-cell">
                          <button
                            type="button"
                            className="btn-table-action"
                            disabled={!id}
                            onClick={() => openDetail(id)}
                          >
                            Buka
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <button
                type="button"
                className="btn-secondary btn-table-action"
                onClick={() => {
                  setView('list');
                  setSelectedId(null);
                  setDetail(null);
                }}
              >
                Daftar kiriman
              </button>
              <span style={{ marginLeft: '12px', fontWeight: 600 }}>
                {detail ? consignmentPrimaryRef(detail) : '…'}
              </span>
              {detail ? (
                <span className="muted" style={{ marginLeft: '8px', fontSize: '13px' }}>
                  {str((detail.customer as Record<string, unknown>)?.code)} ·{' '}
                  {str((detail.warehouse as Record<string, unknown>)?.code)}
                </span>
              ) : null}
            </div>
            {detail?.manifestReview ? (
              <span className="badge">{str((detail.manifestReview as Record<string, unknown>).status)}</span>
            ) : null}
          </div>

          {detailBusy ? (
            <p className="muted" style={{ marginTop: '16px' }}>
              Memuat detail…
            </p>
          ) : detail ? (
            <>
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  flexWrap: 'wrap',
                  marginTop: '16px',
                  borderBottom: '1px solid #243041',
                  paddingBottom: '8px',
                }}
              >
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={tab === t.key ? undefined : 'btn-secondary'}
                    style={{
                      marginBottom: 0,
                      marginRight: '4px',
                      fontSize: '13px',
                      padding: '6px 12px',
                      opacity: tab === t.key ? 1 : 0.85,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'summary' && (
                <div style={{ marginTop: '16px' }}>
                  <p className="muted" style={{ fontSize: '13px' }}>
                    Nomor konsignment: <strong style={{ color: '#e7e9ea' }}>{str(detail.consignmentNo)}</strong>
                  </p>
                  <p className="muted" style={{ fontSize: '13px' }}>
                    Master ref / MAWB tersimpan: {str(detail.masterRef) || str(detail.awbMawb) || '—'}
                  </p>
                  <p className="muted" style={{ fontSize: '13px' }}>
                    ASN terikat:{' '}
                    {Array.isArray(detail.asnLinks)
                      ? (detail.asnLinks as Record<string, unknown>[])
                          .map((l) => str((l.inboundAsn as Record<string, unknown>)?.asnNo))
                          .filter(Boolean)
                          .join(', ') || '—'
                      : '—'}
                  </p>
                </div>
              )}

              {tab === 'awb' && (
                <div style={{ marginTop: '16px' }}>
                  <p className="muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
                    Simpan ke server — dipakai untuk jejak manifest dan penyamaan dengan dokumen lain.
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '0 16px',
                    }}
                  >
                    <label style={{ gridColumn: '1 / -1' }}>
                      Master ref (NOA / referensi administrasi)
                      <input
                        value={masterRefForm}
                        onChange={(e) => setMasterRefForm(e.target.value)}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      MAWB
                      <input
                        value={awbForm.mawb}
                        onChange={(e) => setAwbForm((s) => ({ ...s, mawb: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      HAWB
                      <input
                        value={awbForm.hawb}
                        onChange={(e) => setAwbForm((s) => ({ ...s, hawb: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Maskapai
                      <input
                        value={awbForm.carrier}
                        onChange={(e) => setAwbForm((s) => ({ ...s, carrier: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Penerbangan
                      <input
                        value={awbForm.flight}
                        onChange={(e) => setAwbForm((s) => ({ ...s, flight: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Origin
                      <input
                        value={awbForm.origin}
                        onChange={(e) => setAwbForm((s) => ({ ...s, origin: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Destination
                      <input
                        value={awbForm.destination}
                        onChange={(e) => setAwbForm((s) => ({ ...s, destination: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Shipper
                      <input
                        value={awbForm.shipper}
                        onChange={(e) => setAwbForm((s) => ({ ...s, shipper: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Consignee
                      <input
                        value={awbForm.consignee}
                        onChange={(e) => setAwbForm((s) => ({ ...s, consignee: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Koli
                      <input
                        value={awbForm.pieces}
                        onChange={(e) => setAwbForm((s) => ({ ...s, pieces: e.target.value }))}
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Berat kotor (kg)
                      <input
                        value={awbForm.grossWeightKg}
                        onChange={(e) => setAwbForm((s) => ({ ...s, grossWeightKg: e.target.value }))}
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      Berat chargeable (kg)
                      <input
                        value={awbForm.chargeableWeightKg}
                        onChange={(e) => setAwbForm((s) => ({ ...s, chargeableWeightKg: e.target.value }))}
                        inputMode="decimal"
                        autoComplete="off"
                      />
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      Nature of goods
                      <input
                        value={awbForm.natureOfGoods}
                        onChange={(e) => setAwbForm((s) => ({ ...s, natureOfGoods: e.target.value }))}
                        autoComplete="off"
                      />
                    </label>
                  </div>
                  <div className="modal-form-actions" style={{ border: 'none', paddingTop: '12px' }}>
                    <button type="button" disabled={busy || !selectedId} onClick={() => void saveAwb()}>
                      Simpan AWB
                    </button>
                  </div>
                </div>
              )}

              {tab === 'documents' && (
                <div style={{ marginTop: '16px' }}>
                  <p className="muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
                    Unggah file ke storage lalu tautkan ke kiriman ini. Langkah: pilih jenis dokumen → pilih file →
                    Unggah. Link unduh bersifat sementara (signed URL).
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 220px) minmax(200px, 1fr) auto',
                      gap: '12px',
                      alignItems: 'end',
                    }}
                  >
                    <label style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#9fb0c5' }}>Jenis dokumen</span>
                      <select
                        value={docUploadType}
                        onChange={(e) => setDocUploadType(e.target.value)}
                        style={{ marginBottom: 0 }}
                      >
                        {MANIFEST_DOC_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {MANIFEST_DOC_LABEL[t] ?? t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#9fb0c5' }}>File</span>
                      <input
                        ref={docFileRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx"
                        style={{ marginBottom: 0 }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={docUploadBusy || !selectedId || !token}
                      onClick={() => void uploadManifestDocument()}
                      style={{ marginBottom: 0, marginRight: 0, alignSelf: 'end' }}
                    >
                      Unggah
                    </button>
                  </div>
                  <div className="table-wrap" style={{ marginTop: '16px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Jenis</th>
                          <th>Nama file</th>
                          <th>Diunggah</th>
                          <th className="table-actions-col">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const docs = Array.isArray(detail.documents)
                            ? (detail.documents as Record<string, unknown>[])
                            : [];
                          if (docs.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="muted">
                                  Belum ada lampiran
                                </td>
                              </tr>
                            );
                          }
                          return docs.map((d) => {
                            const id = str(d.id);
                            const dt = str(d.docType);
                            const url = str(d.downloadUrl);
                            const created = str(d.createdAt);
                            return (
                              <tr key={id || dt}>
                                <td>{MANIFEST_DOC_LABEL[dt] ?? dt}</td>
                                <td>{str(d.originalFileName)}</td>
                                <td>{created ? new Date(created).toLocaleString() : '—'}</td>
                                <td className="table-actions-cell">
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn-table-action"
                                      style={{ display: 'inline-block', textDecoration: 'none' }}
                                    >
                                      Buka / unduh
                                    </a>
                                  ) : null}{' '}
                                  <button
                                    type="button"
                                    className="btn-secondary btn-table-action"
                                    disabled={docUploadBusy || !id}
                                    onClick={() => void deleteManifestDocument(id)}
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'compare' && (
                <div style={{ marginTop: '16px' }}>
                  <p className="muted" style={{ fontSize: '13px' }}>
                    Baris dari ASN yang terikat (qty expected). Penyamaan CI/PL terpisah akan menyusul.
                  </p>
                  <div className="table-wrap" style={{ marginTop: '12px' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Deskripsi</th>
                          <th>Qty expected (ASN)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compareRows.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="muted">
                              Tidak ada baris ASN atau belum ada item
                            </td>
                          </tr>
                        ) : (
                          compareRows.map((r) => (
                            <tr key={r.key}>
                              <td>{r.sku}</td>
                              <td>{r.desc}</td>
                              <td>{r.qtyExpected}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'findings' && (
                <div style={{ marginTop: '16px' }}>
                  <p className="muted" style={{ fontSize: '13px' }}>
                    Set status ke <code>MATCHED</code> atau <code>WAIVED</code> agar customs release dapat
                    dilakukan (bila gate gudang aktif).
                  </p>
                  <label>
                    Status
                    <select value={manifestStatus} onChange={(e) => setManifestStatus(e.target.value)}>
                      <option value="DRAFT">DRAFT</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="DISCREPANCY">DISCREPANCY</option>
                      <option value="MATCHED">MATCHED</option>
                      <option value="WAIVED">WAIVED</option>
                    </select>
                  </label>
                  <label>
                    Catatan
                    <textarea
                      value={manifestNotes}
                      onChange={(e) => setManifestNotes(e.target.value)}
                      rows={3}
                    />
                  </label>
                  {manifestStatus === 'WAIVED' ? (
                    <label>
                      Alasan waiver
                      <textarea
                        value={waivedReason}
                        onChange={(e) => setWaivedReason(e.target.value)}
                        rows={2}
                        placeholder="Wajib untuk WAIVED"
                      />
                    </label>
                  ) : null}
                  <div style={{ marginTop: '12px' }}>
                    <strong style={{ fontSize: '13px' }}>Temuan</strong>
                    {findingRows.map((row, idx) => (
                      <div key={idx} className="row" style={{ alignItems: 'flex-end', marginTop: '8px' }}>
                        <label style={{ flex: '0 0 140px' }}>
                          Kategori
                          <select
                            value={row.category}
                            onChange={(e) => {
                              const next = [...findingRows];
                              next[idx] = { ...next[idx], category: e.target.value };
                              setFindingRows(next);
                            }}
                          >
                            {FINDING_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ flex: '1 1 200px' }}>
                          Pesan
                          <input
                            value={row.message}
                            onChange={(e) => {
                              const next = [...findingRows];
                              next[idx] = { ...next[idx], message: e.target.value };
                              setFindingRows(next);
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setFindingRows((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ marginTop: '8px' }}
                      onClick={() =>
                        setFindingRows((prev) => [...prev, { category: 'OTHER', message: '' }])
                      }
                    >
                      + Temuan
                    </button>
                  </div>
                  <div className="modal-form-actions" style={{ border: 'none', paddingTop: '12px' }}>
                    <button type="button" disabled={busy} onClick={() => void saveManifest()}>
                      Simpan manifest
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="error" style={{ marginTop: '16px' }}>
              Detail tidak tersedia
            </p>
          )}
        </div>
      )}

      {showNewModal ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Kiriman baru"
          onClick={() => setShowNewModal(false)}
        >
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Import consignment baru</h3>
            <CustomerBrowseField
              label="Customer"
              customers={customers}
              selectedCustomerId={newCustomerId}
              onSelectCustomer={(id) => {
                setNewCustomerId(id);
                setNewWarehouseId('');
                setNewAsnIds(new Set());
              }}
              disabled={busy}
            />
            <label>
              Gudang
              <select
                value={newWarehouseId}
                onChange={(e) => {
                  setNewWarehouseId(e.target.value);
                  setNewAsnIds(new Set());
                }}
                disabled={!newCustomerId || warehousesForNew.length === 0}
              >
                <option value="">Pilih gudang</option>
                {warehousesForNew.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                    {w.isTransitImportHub ? ' (transit)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Master ref / MAWB (opsional)
              <input value={newMasterRef} onChange={(e) => setNewMasterRef(e.target.value)} />
            </label>
            {newCustomerId && newWarehouseId ? (
              <div style={{ marginTop: '12px' }}>
                <label style={{ marginBottom: '8px' }}>ASN terkait (opsional)</label>
                <div
                  style={{
                    maxHeight: '200px',
                    overflow: 'auto',
                    border: '1px solid #314055',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                >
                  {asnsForNew.length === 0 ? (
                    <span className="muted" style={{ fontSize: '13px' }}>
                      Tidak ada ASN untuk kombinasi ini
                    </span>
                  ) : (
                    asnsForNew.map((a) => (
                      <label
                        key={a.id}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}
                      >
                        <input
                          type="checkbox"
                          checked={newAsnIds.has(a.id)}
                          onChange={(e) => {
                            setNewAsnIds((prev) => {
                              const n = new Set(prev);
                              if (e.target.checked) n.add(a.id);
                              else n.delete(a.id);
                              return n;
                            });
                          }}
                        />
                        <span style={{ fontSize: '13px' }}>{a.asnNo ?? a.id}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}
            <div className="modal-form-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowNewModal(false)}>
                Batal
              </button>
              <button type="button" disabled={busy || !newCustomerId || !newWarehouseId} onClick={submitNewConsignment}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
