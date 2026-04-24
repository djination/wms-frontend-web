'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeNextAsnNo, dateInputToYyyymmdd, getAsnNoPrefix } from '@/src/lib/asn-no';
import { OptionItem } from '@/src/lib/useWmsData';

type Payload = {
  asnNo: string;
  customerId: string;
  warehouseId: string;
  referenceNo: string;
  expectedAt?: string;
  items: Array<{ productId: string; supplierId: string; uomId: string; qtyExpected: number }>;
};

type Props = {
  busy: boolean;
  customers: OptionItem[];
  suppliers: OptionItem[];
  uoms: OptionItem[];
  warehouses: OptionItem[];
  products: OptionItem[];
  asns: OptionItem[];
  onSubmit: (payload: Payload) => Promise<void>;
};

export default function CreateAsnForm({ busy, customers, suppliers, uoms, warehouses, products, asns, onSubmit }: Props) {
  const prefix = useMemo(() => getAsnNoPrefix(), []);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [planningDate, setPlanningDate] = useState(today);
  const [asnNo, setAsnNo] = useState('');
  const [referenceNo, setReferenceNo] = useState('PO-12345');
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; supplierId: string; uomId: string; qtyExpected: string }>>([
    { productId: '', supplierId: '', uomId: '', qtyExpected: '100' },
  ]);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [activeProductRowIndex, setActiveProductRowIndex] = useState<number | null>(null);

  const existingAsnNos = useMemo(
    () => asns.map((a) => a.asnNo).filter((n): n is string => typeof n === 'string' && n.length > 0),
    [asns],
  );

  const yyyymmddForNumber = useMemo(() => {
    const src = planningDate.trim() || today;
    return dateInputToYyyymmdd(src) || dateInputToYyyymmdd(today);
  }, [planningDate, today]);

  useEffect(() => {
    setAsnNo(computeNextAsnNo(prefix, yyyymmddForNumber, existingAsnNos));
  }, [prefix, yyyymmddForNumber, existingAsnNos]);

  const productsForCustomer = useMemo(
    () => products.filter((p) => !customerId || p.customerId === customerId),
    [products, customerId],
  );
  const suppliersForCustomer = useMemo(
    () => suppliers.filter((s) => !customerId || s.customerId === customerId),
    [suppliers, customerId],
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  const warehousesForSelectedCustomer = useMemo(() => {
    if (!customerId) return warehouses;
    return warehouses.filter((raw) => {
      const row = raw as unknown as Record<string, unknown>;
      const warehouseType = String(row.type ?? '');
      if (warehouseType === 'DEDICATED') {
        const dedicatedCustomerId = row.customerId != null ? String(row.customerId) : '';
        return !dedicatedCustomerId || dedicatedCustomerId === customerId;
      }
      const mappings = Array.isArray(row.customerMappings)
        ? (row.customerMappings as Record<string, unknown>[])
        : [];
      const mappedCustomerIds = mappings
        .map((m) => (m.customerId != null ? String(m.customerId) : ''))
        .filter(Boolean);
      if (mappedCustomerIds.length === 0) return true;
      return mappedCustomerIds.includes(customerId);
    });
  }, [warehouses, customerId]);

  const browsedCustomers = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      `${c.code ?? ''} ${c.name ?? ''}`.toLowerCase().includes(needle),
    );
  }, [customers, customerQuery]);

  const selectedProductsById = useMemo(() => {
    const map = new Map<string, OptionItem>();
    for (const p of productsForCustomer) map.set(p.id, p);
    return map;
  }, [productsForCustomer]);

  const browsedProducts = useMemo(() => {
    const needle = productQuery.trim().toLowerCase();
    if (!needle) return productsForCustomer;
    return productsForCustomer.filter((p) =>
      `${p.sku ?? ''} ${p.code ?? ''} ${p.name ?? ''}`.toLowerCase().includes(needle),
    );
  }, [productsForCustomer, productQuery]);

  useEffect(() => {
    setItems((prev) =>
      prev.map((it) =>
        it.productId && !productsForCustomer.some((p) => p.id === it.productId) ? { ...it, productId: '' } : it,
      ),
    );
  }, [productsForCustomer]);

  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        const product = productsForCustomer.find((p) => p.id === it.productId);
        const mappedSupplierIds = Array.isArray(product?.supplierIds) ? product.supplierIds : [];
        const supplierValid =
          it.supplierId &&
          suppliersForCustomer.some((s) => s.id === it.supplierId) &&
          mappedSupplierIds.includes(it.supplierId);
        return supplierValid ? it : { ...it, supplierId: '' };
      }),
    );
  }, [productsForCustomer, suppliersForCustomer]);

  useEffect(() => {
    if (!warehouseId) return;
    if (!warehousesForSelectedCustomer.some((w) => w.id === warehouseId)) {
      setWarehouseId('');
    }
  }, [warehouseId, warehousesForSelectedCustomer]);

  const expectedAtIso = planningDate.trim()
    ? new Date(`${planningDate.trim()}T00:00:00`).toISOString()
    : undefined;

  const canSubmit = useMemo(
    () =>
      Boolean(customerId) &&
      Boolean(warehouseId) &&
      Boolean(asnNo) &&
      items.length > 0 &&
      items.every((it) => Boolean(it.productId) && Boolean(it.supplierId) && Boolean(it.uomId) && Number(it.qtyExpected) > 0),
    [customerId, warehouseId, asnNo, items],
  );

  return (
    <>
      <h3 className="form-section-title">Create ASN</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="asn-no">ASN No</label>
          <input id="asn-no" readOnly value={asnNo} title="Diisi otomatis dari prefix .env, tanggal, dan urutan" />
        </div>
        <div>
          <label htmlFor="asn-ref">Referensi / PO</label>
          <input
            id="asn-ref"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="PO-12345"
          />
        </div>
        <div>
          <label htmlFor="asn-planning">Tanggal planning</label>
          <input id="asn-planning" type="date" value={planningDate} onChange={(e) => setPlanningDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="asn-customer-browse">Customer</label>
          <div className="browse-field">
            <input
              id="asn-customer-browse"
              readOnly
              value={
                selectedCustomer
                  ? `${selectedCustomer.code ?? '-'} — ${selectedCustomer.name ?? '-'}`
                  : 'Pilih customer…'
              }
              placeholder="Browse customer"
              onClick={() => setCustomerModalOpen(true)}
            />
            <button
              type="button"
              className="browse-trigger"
              disabled={busy}
              aria-label="Browse customer"
              onClick={() => setCustomerModalOpen(true)}
            >
              Browse
            </button>
          </div>
          <small className="field-hint">
            Pilih customer dulu. Warehouse akan terfilter sesuai mapping customer dan scope user login.
          </small>
        </div>
        <div>
          <label htmlFor="asn-wh">Warehouse</label>
          <select
            id="asn-wh"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            disabled={!customerId}
          >
            <option value="">Pilih warehouse</option>
            {warehousesForSelectedCustomer.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} - {w.name}
              </option>
            ))}
          </select>
        </div>
        <div className="full-row asn-items-section">
          <label className="asn-items-section-title">Items ASN (multi produk)</label>
          <div className="asn-items-list">
            {items.map((item, idx) => {
              const selected = selectedProductsById.get(item.productId);
              return (
                <div key={`asn-item-${idx}`} className="asn-item-row">
                  <div className="asn-item-field asn-item-field--product">
                    <label htmlFor={`asn-product-browse-${idx}`}>Produk #{idx + 1}</label>
                    <div className="browse-field">
                      <input
                        id={`asn-product-browse-${idx}`}
                        readOnly
                        value={
                          selected
                            ? `${selected.sku ?? selected.code ?? '-'} — ${selected.name ?? '-'}`
                            : customerId
                              ? 'Pilih produk…'
                              : 'Pilih customer terlebih dahulu'
                        }
                        placeholder="Browse produk"
                        onClick={() => {
                          if (!customerId) return;
                          setActiveProductRowIndex(idx);
                          setProductModalOpen(true);
                        }}
                      />
                      <button
                        type="button"
                        className="browse-trigger"
                        disabled={busy || !customerId}
                        aria-label={`Browse produk baris ${idx + 1}`}
                        onClick={() => {
                          setActiveProductRowIndex(idx);
                          setProductModalOpen(true);
                        }}
                      >
                        Browse
                      </button>
                    </div>
                  </div>
                  <div className="asn-item-field asn-item-field--supplier">
                    <label htmlFor={`asn-supplier-${idx}`}>Supplier</label>
                    <select
                      id={`asn-supplier-${idx}`}
                      value={item.supplierId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, supplierId: e.target.value } : it)),
                        )
                      }
                      disabled={!item.productId}
                    >
                      <option value="">{item.productId ? 'Pilih supplier' : 'Pilih produk dulu'}</option>
                      {(() => {
                        const product = productsForCustomer.find((p) => p.id === item.productId);
                        const mappedSupplierIds = new Set(Array.isArray(product?.supplierIds) ? product.supplierIds : []);
                        return suppliersForCustomer
                          .filter((s) => mappedSupplierIds.has(s.id))
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code ?? '-'} - {s.name ?? '-'}
                            </option>
                          ));
                      })()}
                    </select>
                  </div>
                  <div className="asn-item-field asn-item-field--qty">
                    <label htmlFor={`asn-qty-${idx}`}>Qty expected</label>
                    <input
                      id={`asn-qty-${idx}`}
                      value={item.qtyExpected}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, qtyExpected: e.target.value } : it)),
                        )
                      }
                      type="number"
                      min={1}
                    />
                  </div>
                  <div className="asn-item-field asn-item-field--supplier">
                    <label htmlFor={`asn-uom-${idx}`}>UOM</label>
                    <select
                      id={`asn-uom-${idx}`}
                      value={item.uomId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, uomId: e.target.value } : it)),
                        )
                      }
                    >
                      <option value="">Pilih UOM</option>
                      {uoms
                        .filter((u) => u.isActive !== false)
                        .map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.code ?? '-'} - {u.name ?? '-'}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="asn-item-field asn-item-field--action">
                    <span className="asn-item-label-spacer" aria-hidden="true">
                      &nbsp;
                    </span>
                    <button
                      type="button"
                      className="btn-secondary asn-item-delete-btn"
                      disabled={busy || items.length <= 1}
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
            <div>
              <button
                type="button"
                className="btn-secondary"
                disabled={busy || !customerId}
                onClick={() => setItems((prev) => [...prev, { productId: '', supplierId: '', uomId: '', qtyExpected: '1' }])}
              >
                + Tambah produk
              </button>
            </div>
          </div>
        </div>
      </div>

      {productModalOpen ? (
        <div className="modal-backdrop" onClick={() => setProductModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Pilih produk</strong>
              <button type="button" className="btn-secondary" onClick={() => setProductModalOpen(false)}>
                Tutup
              </button>
            </div>
            <label htmlFor="asn-modal-product-search" className="modal-search-label">
              Cari produk
            </label>
            <input
              id="asn-modal-product-search"
              className="modal-search"
              placeholder="SKU atau nama…"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
            />
            <div className="modal-list">
              {browsedProducts.length === 0 ? (
                <div className="modal-item" style={{ cursor: 'default' }}>
                  {customerId ? 'Tidak ada produk untuk customer ini.' : 'Pilih customer di form.'}
                </div>
              ) : (
                browsedProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      activeProductRowIndex != null && items[activeProductRowIndex]?.productId === p.id
                        ? 'modal-item active'
                        : 'modal-item'
                    }
                    onClick={() => {
                      if (activeProductRowIndex == null) return;
                      setItems((prev) =>
                        prev.map((it, i) =>
                          i === activeProductRowIndex ? { ...it, productId: p.id, supplierId: '' } : it,
                        ),
                      );
                      setProductModalOpen(false);
                      setActiveProductRowIndex(null);
                    }}
                  >
                    {p.sku ?? p.code ?? p.id} — {p.name ?? '-'}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}

      {customerModalOpen ? (
        <div className="modal-backdrop" onClick={() => setCustomerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Pilih customer</strong>
              <button type="button" className="btn-secondary" onClick={() => setCustomerModalOpen(false)}>
                Tutup
              </button>
            </div>
            <label htmlFor="asn-modal-customer-search" className="modal-search-label">
              Cari customer
            </label>
            <input
              id="asn-modal-customer-search"
              className="modal-search"
              placeholder="Code atau nama…"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
            />
            <div className="modal-list">
              {browsedCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={customerId === c.id ? 'modal-item active' : 'modal-item'}
                  onClick={() => {
                    setCustomerId(c.id);
                    setWarehouseId('');
                    setItems([{ productId: '', supplierId: '', uomId: '', qtyExpected: '100' }]);
                    setCustomerModalOpen(false);
                  }}
                >
                  {c.code ?? '-'} — {c.name ?? '-'}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() =>
          onSubmit({
            asnNo,
            customerId,
            warehouseId,
            referenceNo,
            ...(expectedAtIso ? { expectedAt: expectedAtIso } : {}),
            items: items.map((it) => ({
              productId: it.productId,
              supplierId: it.supplierId,
              uomId: it.uomId,
              qtyExpected: Number(it.qtyExpected),
            })),
          })
        }
        disabled={busy || !canSubmit}
      >
        Create ASN
      </button>
    </>
  );
}
