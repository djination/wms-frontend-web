'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeNextAsnNo, dateInputToYyyymmdd, getSalesOrderNoPrefix } from '@/src/lib/asn-no';
import type { OptionItem, SalesOrderRow } from '@/src/lib/useWmsData';

type Payload = {
  orderNo: string;
  customerId: string;
  warehouseId: string;
  consigneeName?: string;
  referenceNo?: string;
  requestedAt?: string;
  items: Array<{ productId: string; qtyOrdered: number }>;
};

type Props = {
  busy: boolean;
  customers: OptionItem[];
  warehouses: OptionItem[];
  products: OptionItem[];
  salesOrders: SalesOrderRow[];
  onSubmit: (payload: Payload) => Promise<void>;
};

export default function CreateSalesOrderForm({ busy, customers, warehouses, products, salesOrders, onSubmit }: Props) {
  const prefix = useMemo(() => getSalesOrderNoPrefix(), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [orderDate, setOrderDate] = useState(today);
  const [orderNo, setOrderNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [consigneeName, setConsigneeName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState('10');

  const existingOrderNos = useMemo(
    () => salesOrders.map((so) => so.orderNo).filter((n): n is string => typeof n === 'string' && n.length > 0),
    [salesOrders],
  );

  const yyyymmddForNumber = useMemo(() => {
    const src = orderDate.trim() || today;
    return dateInputToYyyymmdd(src) || dateInputToYyyymmdd(today);
  }, [orderDate, today]);

  useEffect(() => {
    setOrderNo(computeNextAsnNo(prefix, yyyymmddForNumber, existingOrderNos));
  }, [prefix, yyyymmddForNumber, existingOrderNos]);

  const productsForCustomer = useMemo(
    () => products.filter((p) => p.customerId === customerId),
    [products, customerId],
  );

  const requestedAtIso = orderDate.trim()
    ? new Date(`${orderDate.trim()}T00:00:00`).toISOString()
    : undefined;

  return (
    <>
      <h3 className="form-section-title">Sales order baru</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="ob-so-orderno">Order no</label>
          <input
            id="ob-so-orderno"
            readOnly
            value={orderNo}
            title="Diisi otomatis dari prefix .env, tanggal order, dan urutan (sama konsep dengan ASN no)"
          />
        </div>
        <div>
          <label htmlFor="ob-so-orderdate">Tanggal order</label>
          <input id="ob-so-orderdate" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ob-so-ref">Reference</label>
          <input
            id="ob-so-ref"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="Opsional"
          />
        </div>
        <div>
          <label htmlFor="ob-so-consignee">Consignee</label>
          <input
            id="ob-so-consignee"
            value={consigneeName}
            onChange={(e) => setConsigneeName(e.target.value)}
            placeholder="Opsional"
          />
        </div>
        <div>
          <label htmlFor="ob-so-customer">Customer</label>
          <select
            id="ob-so-customer"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setProductId('');
            }}
          >
            <option value="">Pilih customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-so-wh">Warehouse</label>
          <select id="ob-so-wh" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">Pilih warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-so-product">SKU / product</label>
          <select id="ob-so-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Pilih SKU (customer)</option>
            {productsForCustomer.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.sku ?? p.code) ?? p.id} — {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ob-so-qty">Qty ordered</label>
          <input
            id="ob-so-qty"
            value={qtyOrdered}
            onChange={(e) => setQtyOrdered(e.target.value)}
            type="number"
            min={0.0001}
            step="any"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            orderNo,
            customerId,
            warehouseId,
            consigneeName: consigneeName.trim() || undefined,
            referenceNo: referenceNo.trim() || undefined,
            requestedAt: requestedAtIso,
            items: [{ productId, qtyOrdered: Number(qtyOrdered) }],
          })
        }
        disabled={busy || !customerId || !warehouseId || !productId || Number(qtyOrdered) <= 0}
      >
        Buat sales order
      </button>
    </>
  );
}
