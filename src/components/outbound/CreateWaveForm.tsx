'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeNextAsnNo, dateInputToYyyymmdd, getWaveNoPrefix } from '@/src/lib/asn-no';
import type { OutboundWaveRow, SalesOrderRow } from '@/src/lib/useWmsData';

function defaultPlannedAtLocalEightAm(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T08:00`;
}

type Payload = {
  salesOrderId: string;
  waveNo: string;
  plannedAt?: string;
};

type Props = {
  busy: boolean;
  salesOrders: SalesOrderRow[];
  waves: OutboundWaveRow[];
  onSubmit: (payload: Payload) => Promise<void>;
};

export default function CreateWaveForm({ busy, salesOrders, waves, onSubmit }: Props) {
  const prefix = useMemo(() => getWaveNoPrefix(), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [salesOrderId, setSalesOrderId] = useState('');
  const [waveDate, setWaveDate] = useState(today);
  const [waveNo, setWaveNo] = useState('');
  const [plannedAtLocal, setPlannedAtLocal] = useState(() => defaultPlannedAtLocalEightAm());

  const existingWaveNos = useMemo(
    () => waves.map((w) => w.waveNo).filter((n): n is string => typeof n === 'string' && n.length > 0),
    [waves],
  );

  const yyyymmddForNumber = useMemo(() => {
    const src = waveDate.trim() || today;
    return dateInputToYyyymmdd(src) || dateInputToYyyymmdd(today);
  }, [waveDate, today]);

  useEffect(() => {
    setWaveNo(computeNextAsnNo(prefix, yyyymmddForNumber, existingWaveNos));
  }, [prefix, yyyymmddForNumber, existingWaveNos]);

  return (
    <>
      <h3 className="form-section-title">Wave planning</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="ob-wave-so">Sales order</label>
          <select id="ob-wave-so" value={salesOrderId} onChange={(e) => setSalesOrderId(e.target.value)}>
            <option value="">Pilih sales order</option>
            {salesOrders.map((so) => (
              <option key={so.id} value={so.id}>
                {so.orderNo} — {so.status}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-wave-no">Wave no</label>
          <input
            id="ob-wave-no"
            readOnly
            value={waveNo}
            title="Diisi otomatis dari prefix .env, tanggal wave, dan urutan (sama konsep dengan ASN / sales order)"
          />
        </div>
        <div>
          <label htmlFor="ob-wave-date">Tanggal wave</label>
          <input id="ob-wave-date" type="date" value={waveDate} onChange={(e) => setWaveDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ob-wave-planned">Planned at</label>
          <input
            id="ob-wave-planned"
            type="datetime-local"
            value={plannedAtLocal}
            onChange={(e) => setPlannedAtLocal(e.target.value)}
          />
          <span className="muted">Default: hari ini jam 08:00 (lokal). Dikirim ke API sebagai ISO UTC.</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          let plannedAt: string | undefined;
          if (plannedAtLocal.trim()) {
            const d = new Date(plannedAtLocal.trim());
            plannedAt = Number.isNaN(d.getTime()) ? undefined : d.toISOString();
          }
          void onSubmit({ salesOrderId, waveNo, plannedAt });
        }}
        disabled={busy || !salesOrderId || !waveNo.trim()}
      >
        Buat wave
      </button>
    </>
  );
}
