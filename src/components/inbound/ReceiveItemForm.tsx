'use client';

import { useEffect, useMemo, useState } from 'react';
import { OptionItem } from '@/src/lib/useWmsData';

type Payload = {
  inboundAsnId: string;
  productId: string;
  supplierId: string;
  binId: string;
  qtyReceived: number;
  note?: string;
};

type Props = {
  busy: boolean;
  asns: OptionItem[];
  products: OptionItem[];
  bins: OptionItem[];
  onSubmit: (payload: Payload) => Promise<void>;
};

export default function ReceiveItemForm({ busy, asns, products, bins, onSubmit }: Props) {
  const [inboundAsnId, setInboundAsnId] = useState('');
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [binId, setBinId] = useState('');
  const [qtyReceived, setQtyReceived] = useState('40');
  const [note, setNote] = useState('');

  const selectedAsn = useMemo(
    () => asns.find((a) => a.id === inboundAsnId) as (OptionItem & { status?: string; items?: unknown[] }) | undefined,
    [asns, inboundAsnId],
  );

  const itemsForSelectedAsn = useMemo(() => {
    if (!selectedAsn || !Array.isArray(selectedAsn.items)) return [];
    const mapped = selectedAsn.items
      .map((raw) => {
        const item = raw as Record<string, unknown>;
        const id = item.productId != null ? String(item.productId) : '';
        const sid = item.supplierId != null ? String(item.supplierId) : '';
        if (!id || !sid) return null;
        const itemProduct = (item.product ?? null) as Record<string, unknown> | null;
        const itemSupplier = (item.supplier ?? null) as Record<string, unknown> | null;
        const fallback = products.find((p) => p.id === id);
        const code =
          itemProduct?.sku != null
            ? String(itemProduct.sku)
            : itemProduct?.code != null
              ? String(itemProduct.code)
              : fallback?.sku ?? fallback?.code ?? id;
        const name =
          itemProduct?.name != null
            ? String(itemProduct.name)
            : fallback?.name != null
              ? String(fallback.name)
              : '-';
        const supplierCode =
          itemSupplier?.code != null ? String(itemSupplier.code) : sid;
        const supplierName =
          itemSupplier?.name != null ? String(itemSupplier.name) : '-';
        return { id, supplierId: sid, code, name, supplierCode, supplierName };
      })
      .filter((v): v is { id: string; supplierId: string; code: string; name: string; supplierCode: string; supplierName: string } => Boolean(v));
    return mapped;
  }, [selectedAsn, products]);

  const selectedAsnStatus = useMemo(() => {
    const selected = asns.find((a) => a.id === inboundAsnId) as (OptionItem & { status?: string }) | undefined;
    return selected?.status ?? '';
  }, [asns, inboundAsnId]);

  const receiveBlockedReason = useMemo(() => {
    if (selectedAsnStatus === 'COMPLETED') return 'ASN ini status sudah selesai, tidak bisa di-receive lagi.';
    if (selectedAsnStatus === 'CANCELLED') return 'ASN ini status dibatalkan (cancelled), tidak bisa di-receive.';
    return null;
  }, [selectedAsnStatus]);

  useEffect(() => {
    if (!productId) return;
    if (!itemsForSelectedAsn.some((p) => p.id === productId)) {
      setProductId('');
      setSupplierId('');
    }
  }, [productId, itemsForSelectedAsn]);

  useEffect(() => {
    if (!productId) return;
    if (!itemsForSelectedAsn.some((p) => p.id === productId && p.supplierId === supplierId)) {
      setSupplierId('');
    }
  }, [supplierId, productId, itemsForSelectedAsn]);

  return (
    <>
      <h3 className="form-section-title">Receive item</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="in-rcv-asn">ASN</label>
          <select id="in-rcv-asn" value={inboundAsnId} onChange={(e) => setInboundAsnId(e.target.value)}>
            <option value="">Pilih ASN</option>
            {asns.map((a) => (
              <option key={a.id} value={a.id}>
                {a.asnNo ?? a.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="in-rcv-product">Product</label>
          <select
            id="in-rcv-product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={!inboundAsnId}
          >
            <option value="">{inboundAsnId ? 'Pilih product ASN' : 'Pilih ASN dulu'}</option>
            {itemsForSelectedAsn
              .filter((p) => !supplierId || p.supplierId === supplierId)
              .map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="in-rcv-supplier">Supplier</label>
          <select
            id="in-rcv-supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={!inboundAsnId}
          >
            <option value="">{inboundAsnId ? 'Pilih supplier ASN' : 'Pilih ASN dulu'}</option>
            {itemsForSelectedAsn
              .filter((p, idx, arr) => arr.findIndex((x) => x.supplierId === p.supplierId) === idx)
              .filter((p) => !productId || p.id === productId)
              .map((p) => (
                <option key={p.supplierId} value={p.supplierId}>
                  {p.supplierCode} - {p.supplierName}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="in-rcv-bin">Bin</label>
          <select id="in-rcv-bin" value={binId} onChange={(e) => setBinId(e.target.value)}>
            <option value="">Pilih bin</option>
            {bins.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} - {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="in-rcv-qty">Qty received</label>
          <input id="in-rcv-qty" value={qtyReceived} onChange={(e) => setQtyReceived(e.target.value)} type="number" min={0} step="any" />
        </div>
        <div>
          <label htmlFor="in-rcv-note">Note</label>
          <input id="in-rcv-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional" />
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            inboundAsnId,
            productId,
            supplierId,
            binId,
            qtyReceived: Number(qtyReceived),
            note: note || undefined,
          })
        }
        disabled={busy || !inboundAsnId || !productId || !supplierId || !binId || !!receiveBlockedReason}
      >
        Receive Item
      </button>
      {receiveBlockedReason ? <p className="muted" style={{ marginTop: 8 }}>{receiveBlockedReason}</p> : null}
    </>
  );
}
