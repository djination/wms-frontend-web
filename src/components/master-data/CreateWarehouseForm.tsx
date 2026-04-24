'use client';

import { useEffect, useMemo, useState } from 'react';
import { OptionItem } from '@/src/lib/useWmsData';
import IndonesiaAddressFields, { IndonesiaAddressValue } from './IndonesiaAddressFields';

type Payload = {
  code: string;
  name: string;
  type: string;
  ownerCompanyId: string;
  /** Pengelola (3PL). Saat edit, `null` menghapus operator = operasi self / sama konsep owner. */
  operatorCompanyId?: string | null;
  customerId?: string;
  customerIds?: string[];
  phone: string;
  address: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postalCode: string;
};

type Props = {
  busy: boolean;
  readOnly?: boolean;
  customers: OptionItem[];
  operators: OptionItem[];
  /** create: jangan kirim `operatorCompanyId` bila kosong. edit: kirim `null` bila dihapus. */
  variant?: 'create' | 'edit';
  title?: string;
  submitLabel?: string;
  initialData?: {
    code?: string;
    name?: string;
    type?: string;
    ownerCompanyId?: string;
    operatorCompanyId?: string | null;
    customerId?: string;
    customerIds?: string[];
    phone?: string | null;
    address?: string | null;
    province?: string | null;
    city?: string | null;
    district?: string | null;
    subdistrict?: string | null;
    postalCode?: string | null;
  };
  onCancel?: () => void;
  onSubmit: (payload: Payload) => Promise<void>;
};

export default function CreateWarehouseForm({
  busy,
  readOnly = false,
  customers,
  operators,
  variant = 'create',
  title = 'Warehouse',
  submitLabel = 'Create Warehouse',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [code, setCode] = useState('WH-JKT-01');
  const [name, setName] = useState('Warehouse Jakarta 01');
  const [type, setType] = useState('SHARED');
  const [ownerCompanyId, setOwnerCompanyId] = useState('');
  const [operatorCompanyId, setOperatorCompanyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [sharedCustomerIds, setSharedCustomerIds] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressHierarchy, setAddressHierarchy] = useState<IndonesiaAddressValue>({
    province: '',
    city: '',
    district: '',
    subdistrict: '',
    postalCode: '',
  });
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  /** Customer terpilih harus tetap tampil walau type-nya beda dari filter (mis. dedicated pakai customer bertipe SHARED). */
  const filteredCustomers = useMemo(() => {
    const byType = customers.filter((c) => c.type === type);
    const merged = [...byType];
    const pushIfMissing = (id: string) => {
      const c = customers.find((x) => x.id === id);
      if (c && !merged.some((x) => x.id === c.id)) merged.unshift(c);
    };
    if (type === 'DEDICATED' && customerId) pushIfMissing(customerId);
    if (type === 'SHARED') {
      for (const id of sharedCustomerIds) pushIfMissing(id);
    }
    return merged;
  }, [customers, type, customerId, sharedCustomerIds]);
  const selectedCustomer = useMemo(
    () => filteredCustomers.find((c) => c.id === customerId),
    [filteredCustomers, customerId],
  );
  const browsedCustomers = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase();
    if (!needle) return filteredCustomers;
    return filteredCustomers.filter((c) =>
      `${c.code ?? ''} ${c.name ?? ''}`.toLowerCase().includes(needle),
    );
  }, [filteredCustomers, customerQuery]);
  const selectedSharedCustomers = useMemo(
    () => filteredCustomers.filter((c) => sharedCustomerIds.includes(c.id)),
    [filteredCustomers, sharedCustomerIds],
  );
  const visibleSharedCustomerIds = useMemo(() => browsedCustomers.map((c) => c.id), [browsedCustomers]);
  const selectedVisibleSharedCount = useMemo(
    () => visibleSharedCustomerIds.filter((id) => sharedCustomerIds.includes(id)).length,
    [sharedCustomerIds, visibleSharedCustomerIds],
  );

  useEffect(() => {
    if (!customerId) return;
    if (!customers.some((c) => c.id === customerId)) {
      setCustomerId('');
    }
  }, [customerId, customers]);

  /** Buang ID yang sudah tidak ada di master customer (bukan dari `filteredCustomers` — referensi array itu berubah tiap render dan memicu loop). */
  useEffect(() => {
    setSharedCustomerIds((prev) => {
      const next = prev.filter((id) => customers.some((c) => c.id === id));
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
      return next;
    });
  }, [customers]);

  useEffect(() => {
    if (!initialData) return;
    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');
    setType(initialData.type ?? 'SHARED');
    setOwnerCompanyId(initialData.ownerCompanyId ?? '');
    setOperatorCompanyId(
      initialData.operatorCompanyId != null && String(initialData.operatorCompanyId) !== ''
        ? String(initialData.operatorCompanyId)
        : '',
    );
    setCustomerId(initialData.customerId ?? '');
    setSharedCustomerIds(initialData.customerIds ?? []);
    setPhone(initialData.phone != null ? String(initialData.phone) : '');
    setAddress(initialData.address != null ? String(initialData.address) : '');
    setAddressHierarchy({
      province: initialData.province != null ? String(initialData.province) : '',
      city: initialData.city != null ? String(initialData.city) : '',
      district: initialData.district != null ? String(initialData.district) : '',
      subdistrict: initialData.subdistrict != null ? String(initialData.subdistrict) : '',
      postalCode: initialData.postalCode != null ? String(initialData.postalCode) : '',
    });
  }, [
    initialData?.code,
    initialData?.name,
    initialData?.type,
    initialData?.ownerCompanyId,
    initialData?.operatorCompanyId,
    initialData?.customerId,
    initialData?.customerIds?.join(','),
    initialData?.phone,
    initialData?.address,
    initialData?.province,
    initialData?.city,
    initialData?.district,
    initialData?.subdistrict,
    initialData?.postalCode,
  ]);

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="md-wh-code">Code</label>
          <input
            id="md-wh-code"
            readOnly={readOnly}
            value={code}
            onChange={(e) => !readOnly && setCode(e.target.value)}
            placeholder="WH-JKT-01"
          />
        </div>
        <div>
          <label htmlFor="md-wh-name">Name</label>
          <input
            id="md-wh-name"
            readOnly={readOnly}
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Nama warehouse"
          />
        </div>
        <div>
          <label htmlFor="md-wh-type">Type</label>
          <select
            id="md-wh-type"
            value={type}
            onChange={(e) => {
              const v = e.target.value;
              setType(v);
              if (v !== 'SHARED') setSharedCustomerIds([]);
            }}
            disabled={readOnly}
          >
            <option value="SHARED">SHARED</option>
            <option value="DEDICATED">DEDICATED</option>
          </select>
        </div>
        <div className="full-row">
          <label htmlFor="md-wh-owner">Pemilik (owner)</label>
          <select
            id="md-wh-owner"
            value={ownerCompanyId}
            onChange={(e) => {
              setOwnerCompanyId(e.target.value);
            }}
            disabled={readOnly}
            aria-describedby="md-wh-owner-hint"
          >
            <option value="">Pilih pemilik</option>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} - {o.name}
              </option>
            ))}
          </select>
          <small id="md-wh-owner-hint" className="field-hint">
            Induk aset / legal owner (master operator company, bisa berbeda dari pihak yang mengelola gudang).
          </small>
        </div>
        <div className="full-row">
          <label htmlFor="md-wh-operator">Pengelola (operator / 3PL)</label>
          <select
            id="md-wh-operator"
            value={operatorCompanyId}
            onChange={(e) => setOperatorCompanyId(e.target.value)}
            disabled={readOnly}
            aria-describedby="md-wh-op-hint"
          >
            <option value="">
              {variant === 'edit' ? '— sama dengan owner / self-operated —' : '— sama dengan owner (opsional) —'}
            </option>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} - {o.name}
              </option>
            ))}
          </select>
          <small id="md-wh-op-hint" className="field-hint">
            Diisi bila pihak yang <em>mengelola</em> gudang (mis. 3PL) bukan pemilik. Kosong = operasi dianggap
            terpusat di pemilik.
          </small>
        </div>
        <div>
          <label htmlFor="md-wh-phone">Nomor telepon</label>
          <input
            id="md-wh-phone"
            readOnly={readOnly}
            value={phone}
            onChange={(e) => !readOnly && setPhone(e.target.value)}
            placeholder="Opsional"
          />
        </div>
        <div className="full-row">
          <label htmlFor="md-wh-address">Alamat</label>
          <textarea
            id="md-wh-address"
            rows={3}
            readOnly={readOnly}
            value={address}
            onChange={(e) => !readOnly && setAddress(e.target.value)}
            placeholder="Opsional"
          />
        </div>
        <IndonesiaAddressFields readOnly={readOnly} value={addressHierarchy} onChange={setAddressHierarchy} />
        {type === 'DEDICATED' ? (
          <div className="full-row">
            <label htmlFor="md-wh-customer-browse">Customer ({type})</label>
            <div className="browse-field">
              <input
                id="md-wh-customer-browse"
                readOnly
                value={
                  selectedCustomer
                    ? `${selectedCustomer.code ?? '-'} - ${selectedCustomer.name ?? '-'}`
                    : `Browse customer ${type.toLowerCase()}`
                }
                placeholder={`Browse customer ${type.toLowerCase()}`}
                onClick={() => !readOnly && setCustomerModalOpen(true)}
              />
              <button
                type="button"
                className="browse-trigger"
                onClick={() => setCustomerModalOpen(true)}
                disabled={busy || readOnly}
                aria-label="Browse customer"
              >
                Search
              </button>
            </div>
          </div>
        ) : (
          <div className="full-row">
            <label htmlFor="md-wh-shared-customer-search">Customers (SHARED, multi)</label>
            <input
              id="md-wh-shared-customer-search"
              className="modal-search"
              placeholder="Cari code atau nama customer..."
              value={customerQuery}
              onChange={(e) => !readOnly && setCustomerQuery(e.target.value)}
              readOnly={readOnly}
            />
            <div className="selection-panel">
              <div className="selection-toolbar">
                <strong className="modal-search-label">Daftar customer</strong>
                <div className="selection-toolbar-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setSharedCustomerIds((prev) => [...new Set([...prev, ...visibleSharedCustomerIds])])
                    }
                    disabled={visibleSharedCustomerIds.length === 0 || readOnly}
                  >
                    Select all visible
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setSharedCustomerIds((prev) => prev.filter((id) => !visibleSharedCustomerIds.includes(id)))
                    }
                    disabled={visibleSharedCustomerIds.length === 0 || readOnly}
                  >
                    Clear visible
                  </button>
                </div>
              </div>
              <div className="selection-list">
                {browsedCustomers.length === 0 ? (
                  <div className="selection-empty">Tidak ada customer sesuai pencarian.</div>
                ) : (
                  browsedCustomers.map((c) => (
                    <label key={c.id} className="selection-item">
                      <input
                        type="checkbox"
                        checked={sharedCustomerIds.includes(c.id)}
                        disabled={readOnly}
                        onChange={(e) =>
                          setSharedCustomerIds((prev) =>
                            e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                          )
                        }
                      />
                      {c.code} - {c.name}
                    </label>
                  ))
                )}
              </div>
            </div>
            <small className="selection-summary">
              Terpilih: {selectedSharedCustomers.length} total, {selectedVisibleSharedCount}/{visibleSharedCustomerIds.length} visible
            </small>
          </div>
        )}
      </div>
      {type === 'DEDICATED' && customerModalOpen && !readOnly ? (
        <div className="modal-backdrop" onClick={() => setCustomerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Select Customer ({type})</strong>
              <button type="button" className="btn-secondary" onClick={() => setCustomerModalOpen(false)}>
                Close
              </button>
            </div>
            <label htmlFor="md-wh-modal-search" className="modal-search-label">
              Cari customer
            </label>
            <input
              id="md-wh-modal-search"
              className="modal-search"
              placeholder="Cari code atau nama…"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
            />
            <div className="modal-list">
              <button
                type="button"
                className={!customerId ? 'modal-item active' : 'modal-item'}
                onClick={() => {
                  setCustomerId('');
                  setCustomerModalOpen(false);
                }}
              >
                No Dedicated Customer
              </button>
              {browsedCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={customerId === c.id ? 'modal-item active' : 'modal-item'}
                  onClick={() => {
                    setCustomerId(c.id);
                    setCustomerModalOpen(false);
                  }}
                >
                  {c.code} - {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {!readOnly ? (
        <div className="modal-form-actions">
          {onCancel ? (
            <button type="button" className="btn-secondary btn-modal-action" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          ) : null}
          <button
            type="button"
            className="btn-modal-action"
            onClick={() =>
              onSubmit({
                code,
                name,
                type,
                ownerCompanyId,
                ...(variant === 'edit'
                  ? { operatorCompanyId: operatorCompanyId || null }
                  : operatorCompanyId
                    ? { operatorCompanyId }
                    : {}),
                phone: phone.trim(),
                address: address.trim(),
                province: addressHierarchy.province.trim(),
                city: addressHierarchy.city.trim(),
                district: addressHierarchy.district.trim(),
                subdistrict: addressHierarchy.subdistrict.trim(),
                postalCode: addressHierarchy.postalCode.trim(),
                ...(type === 'DEDICATED' && customerId ? { customerId } : {}),
                ...(type === 'SHARED' && sharedCustomerIds.length > 0 ? { customerIds: sharedCustomerIds } : {}),
              })
            }
            disabled={busy || !ownerCompanyId}
          >
            {submitLabel}
          </button>
        </div>
      ) : null}
    </>
  );
}
