'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { filterWarehousesForCustomer } from '@/src/lib/warehouse-customer-filter';
import { OptionItem, WarehouseZoneItem } from '@/src/lib/useWmsData';

type Payload = {
  inboundAsnId: string;
  productId: string;
  supplierId: string;
  binId: string;
  qtyReceived: number;
  uomId?: string;
  lotNo?: string;
  batchNo?: string;
  expiryDate?: string;
  serialNos?: string[];
  note?: string;
};

type Props = {
  busy: boolean;
  asns: OptionItem[];
  products: OptionItem[];
  warehouses: OptionItem[];
  zones: WarehouseZoneItem[];
  bins: OptionItem[];
  onSubmit: (payload: Payload) => Promise<void>;
};

export default function ReceiveItemForm({
  busy,
  asns,
  products,
  warehouses,
  zones,
  bins,
  onSubmit,
}: Props) {
  const [inboundAsnId, setInboundAsnId] = useState('');
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [binId, setBinId] = useState('');
  const [qtyReceived, setQtyReceived] = useState('');
  const [qtyReceivedUomId, setQtyReceivedUomId] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [serialNosText, setSerialNosText] = useState('');
  const [note, setNote] = useState('');
  const [asnModalOpen, setAsnModalOpen] = useState(false);
  const [asnQuery, setAsnQuery] = useState('');
  /** Only reset warehouse/zone/bin when ASN selection changes (not when `asns` refetches). */
  const receiveLocationInitForAsnId = useRef<string | null>(null);

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
        const itemUom = (item.uom ?? null) as Record<string, unknown> | null;
        const uomId = item.uomId != null ? String(item.uomId) : '';
        const uomCode = itemUom?.code != null ? String(itemUom.code) : uomId;
        const uomName = itemUom?.name != null ? String(itemUom.name) : '';
        return { id, supplierId: sid, code, name, supplierCode, supplierName, qtyExpected, uomId, uomCode, uomName };
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
          uomId: string;
          uomCode: string;
          uomName: string;
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
  const selectedUomLabel = selectedAsnItem
    ? `${selectedAsnItem.uomCode}${selectedAsnItem.uomName ? ` - ${selectedAsnItem.uomName}` : ''}`
    : '-';
  const qtyReceivedUomOptions = useMemo(() => {
    if (!selectedAsnItem) return [] as Array<{ id: string; label: string }>;
    const options: Array<{ id: string; label: string }> = [];
    if (selectedAsnItem.uomId) {
      options.push({ id: selectedAsnItem.uomId, label: selectedUomLabel });
    }
    const selectedProduct = itemsForSelectedAsn.find((it) => it.id === selectedAsnItem.id && it.supplierId === selectedAsnItem.supplierId);
    const product = products.find((p) => p.id === selectedProduct?.id) as (OptionItem & { uomConversions?: unknown[]; baseUom?: unknown }) | undefined;
    const convs = Array.isArray(product?.uomConversions) ? (product.uomConversions as Array<Record<string, unknown>>) : [];
    for (const conv of convs) {
      if (conv.isActive === false) continue;
      const fromUom = (conv.fromUom ?? null) as Record<string, unknown> | null;
      const fromUomId = conv.fromUomId != null ? String(conv.fromUomId) : '';
      if (!fromUomId || options.some((opt) => opt.id === fromUomId)) continue;
      const fromCode = fromUom?.code != null ? String(fromUom.code) : fromUomId;
      const fromName = fromUom?.name != null ? String(fromUom.name) : '';
      options.push({ id: fromUomId, label: `${fromCode}${fromName ? ` - ${fromName}` : ''}` });
    }
    return options;
  }, [selectedAsnItem, selectedUomLabel, itemsForSelectedAsn, products]);
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

  const asnCustomerId = useMemo(() => {
    if (!selectedAsn) return undefined;
    const row = selectedAsn as Record<string, unknown>;
    const cid = row.customerId != null ? String(row.customerId) : '';
    return cid || undefined;
  }, [selectedAsn]);

  /** Same rule as create ASN: warehouses scoped to the ASN's customer */
  const warehousesForReceiving = useMemo(() => {
    if (!inboundAsnId) return [];
    return filterWarehousesForCustomer(warehouses, asnCustomerId);
  }, [inboundAsnId, warehouses, asnCustomerId]);

  useEffect(() => {
    if (!inboundAsnId) {
      receiveLocationInitForAsnId.current = null;
      setWarehouseId('');
      setZoneId('');
      setBinId('');
      return;
    }
    if (receiveLocationInitForAsnId.current === inboundAsnId) {
      return;
    }
    const asn = asns.find((x) => x.id === inboundAsnId);
    if (!asn) return;
    receiveLocationInitForAsnId.current = inboundAsnId;
    const row = asn as Record<string, unknown>;
    const cid = row.customerId != null ? String(row.customerId) : '';
    const filtered = filterWarehousesForCustomer(warehouses, cid || undefined);
    const asnW = row.warehouseId != null ? String(row.warehouseId) : '';
    const nextWh =
      asnW && filtered.some((w) => w.id === asnW)
        ? asnW
        : filtered.length === 1
          ? filtered[0].id
          : '';
    setWarehouseId(nextWh);
    setZoneId('');
    setBinId('');
  }, [inboundAsnId, asns, warehouses]);

  useEffect(() => {
    if (!warehouseId || !inboundAsnId) return;
    if (!warehousesForReceiving.some((w) => w.id === warehouseId)) {
      setWarehouseId('');
      setZoneId('');
      setBinId('');
    }
  }, [warehouseId, warehousesForReceiving, inboundAsnId]);

  const zonesForWarehouse = useMemo(() => {
    if (!warehouseId) return [];
    return zones
      .filter((z) => z.warehouseId === warehouseId && z.isActive !== false)
      .slice()
      .sort((a, b) => `${a.code ?? ''} ${a.name ?? ''}`.localeCompare(`${b.code ?? ''} ${b.name ?? ''}`));
  }, [zones, warehouseId]);

  const binsForZone = useMemo(() => {
    if (!zoneId) return [];
    return bins.filter((b) => {
      const bid = b.zoneId != null ? String(b.zoneId) : '';
      if (bid !== zoneId) return false;
      const wid = b.warehouseId != null ? String(b.warehouseId) : '';
      if (warehouseId && wid && wid !== warehouseId) return false;
      const inactive = (b as OptionItem & { isActive?: boolean }).isActive === false;
      return !inactive;
    });
  }, [bins, zoneId, warehouseId]);

  useEffect(() => {
    if (!binId) return;
    const stillValid = binsForZone.some((b) => b.id === binId);
    if (!stillValid) setBinId('');
  }, [binsForZone, binId]);

  useEffect(() => {
    if (selectedAsnItem == null || !Number.isFinite(selectedAsnItem.qtyExpected)) {
      setQtyReceived('');
      setQtyReceivedUomId('');
      return;
    }
    setQtyReceived(String(selectedAsnItem.qtyExpected));
    setQtyReceivedUomId(selectedAsnItem.uomId || '');
  }, [selectedAsnItem]);
  useEffect(() => {
    if (!selectedAsnItem) return;
    if (qtyReceivedUomId && qtyReceivedUomOptions.some((opt) => opt.id === qtyReceivedUomId)) return;
    setQtyReceivedUomId(qtyReceivedUomOptions[0]?.id ?? '');
  }, [selectedAsnItem, qtyReceivedUomId, qtyReceivedUomOptions]);

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
          <div className="qty-with-uom">
            <input id="in-rcv-qty-expected" value={selectedQtyExpectedLabel} readOnly />
            <select id="in-rcv-qty-expected-uom" value={selectedAsnItem?.uomId || ''} disabled>
              {selectedAsnItem?.uomId ? <option value={selectedAsnItem.uomId}>{selectedUomLabel}</option> : <option value="">-</option>}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="in-rcv-warehouse">Warehouse</label>
          <select
            id="in-rcv-warehouse"
            value={warehouseId}
            onChange={(e) => {
              const next = e.target.value;
              setWarehouseId(next);
              setZoneId('');
              setBinId('');
            }}
            disabled={busy || !inboundAsnId}
          >
            <option value="">{inboundAsnId ? 'Pilih warehouse' : 'Pilih ASN dulu'}</option>
            {warehousesForReceiving.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code ?? w.id} — {w.name ?? '-'}
              </option>
            ))}
          </select>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
            Daftar warehouse mengikuti customer ASN (sama seperti saat buat ASN).
          </p>
        </div>
        <div>
          <label htmlFor="in-rcv-zone">Zone</label>
          <select
            id="in-rcv-zone"
            value={zoneId}
            onChange={(e) => {
              setZoneId(e.target.value);
              setBinId('');
            }}
            disabled={busy || !warehouseId}
          >
            <option value="">{warehouseId ? 'Pilih zone' : 'Pilih warehouse dulu'}</option>
            {zonesForWarehouse.map((z) => (
              <option key={z.id} value={z.id}>
                {z.code ?? z.id} — {z.name ?? '-'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="in-rcv-bin">Bin</label>
          <select
            id="in-rcv-bin"
            value={binId}
            onChange={(e) => setBinId(e.target.value)}
            disabled={busy || !zoneId}
          >
            <option value="">{zoneId ? 'Pilih bin' : 'Pilih zone dulu'}</option>
            {binsForZone.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="in-rcv-qty">Qty received</label>
          <div className="qty-with-uom">
            <input id="in-rcv-qty" value={qtyReceived} onChange={(e) => setQtyReceived(e.target.value)} type="number" min={0} step="any" />
            <select id="in-rcv-qty-uom" value={qtyReceivedUomId} onChange={(e) => setQtyReceivedUomId(e.target.value)}>
              {qtyReceivedUomOptions.length > 0 ? (
                qtyReceivedUomOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))
              ) : (
                <option value="">-</option>
              )}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="in-rcv-lot">Lot No</label>
          <input id="in-rcv-lot" value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="Opsional" />
        </div>
        <div>
          <label htmlFor="in-rcv-batch">Batch No</label>
          <input id="in-rcv-batch" value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="Opsional" />
        </div>
        <div>
          <label htmlFor="in-rcv-exp">Expiry Date</label>
          <input id="in-rcv-exp" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="in-rcv-serials">Serial Nos</label>
          <input
            id="in-rcv-serials"
            value={serialNosText}
            onChange={(e) => setSerialNosText(e.target.value)}
            placeholder="Pisahkan koma, contoh: SN-001,SN-002"
          />
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
            uomId: qtyReceivedUomId || undefined,
            lotNo: lotNo.trim() || undefined,
            batchNo: batchNo.trim() || undefined,
            expiryDate: expiryDate ? new Date(`${expiryDate}T00:00:00.000Z`).toISOString() : undefined,
            serialNos: serialNosText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            note: note || undefined,
          })
        }
        disabled={
          busy ||
          !inboundAsnId ||
          !productId ||
          !supplierId ||
          !warehouseId ||
          !zoneId ||
          !binId ||
          !qtyReceivedUomId ||
          !!receiveBlockedReason
        }
      >
        Receive Item
      </button>
      {receiveBlockedReason ? <p className="muted" style={{ marginTop: 8 }}>{receiveBlockedReason}</p> : null}
    </>
  );
}

