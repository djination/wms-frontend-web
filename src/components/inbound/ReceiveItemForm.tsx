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
  const [qtyReceived, setQtyReceived] = useState('');
  const [note, setNote] = useState('');
  const [asnModalOpen, setAsnModalOpen] = useState(false);
  const [asnQuery, setAsnQuery] = useState('');

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
        const qtyExpectedRaw = item.qtyExpected;
        const qtyExpected = typeof qtyExpectedRaw === 'number' ? qtyExpectedRaw : Number(qtyExpectedRaw ?? 0);
        return { id, supplierId: sid, code, name, supplierCode, supplierName, qtyExpected };
      })
      .filter(
        (
          v,
        ): v is {
          id: string;
          supplierId: string;
          code: string;
          name: string;
          supplierCode: string;
          supplierName: string;
          qtyExpected: number;
        } => Boolean(v),
      );
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
    if (!productId) {
      setSupplierId('');
      return;
    }
    const match = itemsForSelectedAsn.find((p) => p.id === productId);
    if (!match) {
      setSupplierId('');
      return;
    }
    if (supplierId !== match.supplierId) {
      setSupplierId(match.supplierId);
    }
  }, [supplierId, productId, itemsForSelectedAsn]);

  const selectedAsnItem = useMemo(
    () => itemsForSelectedAsn.find((p) => p.id === productId && p.supplierId === supplierId),
    [itemsForSelectedAsn, productId, supplierId],
  );
  const selectedSupplierLabel = selectedAsnItem
    ? `${selectedAsnItem.supplierCode} - ${selectedAsnItem.supplierName}`
    : inboundAsnId
      ? productId
        ? 'Supplier tidak ditemukan di ASN'
        : 'Pilih product ASN'
      : 'Pilih ASN dulu';
  const selectedQtyExpectedLabel =
    selectedAsnItem != null && Number.isFinite(selectedAsnItem.qtyExpected)
      ? String(selectedAsnItem.qtyExpected)
      : '-';
  const selectedAsnLabel = selectedAsn
    ? `${selectedAsn.asnNo ?? selectedAsn.id}${selectedAsn.status ? ` (${selectedAsn.status})` : ''}`
    : 'Pilih ASN...';
  const browsedAsns = useMemo(() => {
    const needle = asnQuery.trim().toLowerCase();
    if (!needle) return asns;
    return asns.filter((a) =>
      `${a.asnNo ?? ''} ${(a as Record<string, unknown>).referenceNo ?? ''} ${(a as Record<string, unknown>).status ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [asnQuery, asns]);

  useEffect(() => {
    if (selectedAsnItem == null || !Number.isFinite(selectedAsnItem.qtyExpected)) {
      setQtyReceived('');
      return;
    }
    setQtyReceived(String(selectedAsnItem.qtyExpected));
  }, [selectedAsnItem]);

  return (
    <>
      <h3 className="form-section-title">Receive item</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="in-rcv-asn-browse">ASN</label>
          <div className="browse-field">
            <input
              id="in-rcv-asn-browse"
              readOnly
              value={selectedAsnLabel}
              placeholder="Browse ASN"
              onClick={() => setAsnModalOpen(true)}
            />
            <button
              type="button"
              className="browse-trigger"
              disabled={busy}
              aria-label="Browse ASN"
              onClick={() => setAsnModalOpen(true)}
            >
              Browse
            </button>
          </div>
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
          <input id="in-rcv-supplier" readOnly value={selectedSupplierLabel} />
        </div>
        <div>
          <label htmlFor="in-rcv-qty-expected">Qty expected</label>
          <input id="in-rcv-qty-expected" value={selectedQtyExpectedLabel} readOnly />
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
      {asnModalOpen ? (
        <div className="modal-backdrop" onClick={() => setAsnModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Pilih ASN</strong>
              <button type="button" className="btn-secondary" onClick={() => setAsnModalOpen(false)}>
                Tutup
              </button>
            </div>
            <label htmlFor="in-rcv-modal-asn-search" className="modal-search-label">
              Cari ASN
            </label>
            <input
              id="in-rcv-modal-asn-search"
              className="modal-search"
              placeholder="No ASN / reference / status"
              value={asnQuery}
              onChange={(e) => setAsnQuery(e.target.value)}
            />
            <div className="modal-list">
              {browsedAsns.length === 0 ? (
                <div className="modal-item" style={{ cursor: 'default' }}>
                  ASN tidak ditemukan.
                </div>
              ) : (
                browsedAsns.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={inboundAsnId === a.id ? 'modal-item active' : 'modal-item'}
                    onClick={() => {
                      setInboundAsnId(a.id);
                      setProductId('');
                      setSupplierId('');
                      setAsnModalOpen(false);
                    }}
                  >
                    {a.asnNo ?? a.id}
                    {(a as Record<string, unknown>).status != null
                      ? ` (${String((a as Record<string, unknown>).status)})`
                      : ''}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
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
