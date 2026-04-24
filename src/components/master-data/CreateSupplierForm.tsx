'use client';

import { useEffect, useMemo, useState } from 'react';
import { OptionItem, SupplierPicRow } from '@/src/lib/useWmsData';
import IndonesiaAddressFields, { IndonesiaAddressValue } from './IndonesiaAddressFields';

export type SupplierSubmitPayload = {
  customerId: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  pics: Array<{ name: string; phone?: string; email?: string }>;
};

type PicRow = { name: string; phone: string; email: string };

type Props = {
  busy: boolean;
  readOnly?: boolean;
  customers: OptionItem[];
  title?: string;
  submitLabel?: string;
  initialData?: {
    customerId?: string;
    code?: string;
    name?: string;
    phone?: string | null;
    address?: string | null;
    province?: string | null;
    city?: string | null;
    district?: string | null;
    subdistrict?: string | null;
    postalCode?: string | null;
    pics?: SupplierPicRow[];
  };
  onCancel?: () => void;
  onSubmit: (payload: SupplierSubmitPayload) => Promise<void>;
};

const emptyPic = (): PicRow => ({ name: '', phone: '', email: '' });

export default function CreateSupplierForm({
  busy,
  readOnly = false,
  customers,
  title = 'Supplier',
  submitLabel = 'Create Supplier',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [customerId, setCustomerId] = useState('');
  const [code, setCode] = useState('SUP-001');
  const [name, setName] = useState('Supplier A');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressHierarchy, setAddressHierarchy] = useState<IndonesiaAddressValue>({
    province: '',
    city: '',
    district: '',
    subdistrict: '',
    postalCode: '',
  });
  const [pics, setPics] = useState<PicRow[]>([emptyPic()]);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === customerId), [customers, customerId]);
  const browsedCustomers = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) => `${c.code ?? ''} ${c.name ?? ''}`.toLowerCase().includes(needle));
  }, [customers, customerQuery]);

  useEffect(() => {
    if (!initialData) return;
    setCustomerId(initialData.customerId ?? '');
    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');
    setPhone(initialData.phone != null && initialData.phone !== '' ? String(initialData.phone) : '');
    setAddress(initialData.address != null && initialData.address !== '' ? String(initialData.address) : '');
    setAddressHierarchy({
      province: initialData.province != null ? String(initialData.province) : '',
      city: initialData.city != null ? String(initialData.city) : '',
      district: initialData.district != null ? String(initialData.district) : '',
      subdistrict: initialData.subdistrict != null ? String(initialData.subdistrict) : '',
      postalCode: initialData.postalCode != null ? String(initialData.postalCode) : '',
    });
    const raw = initialData.pics;
    if (Array.isArray(raw) && raw.length > 0) {
      setPics(
        raw.map((p) => ({
          name: String(p.name ?? ''),
          phone: p.phone != null ? String(p.phone) : '',
          email: p.email != null ? String(p.email) : '',
        })),
      );
    } else {
      setPics([emptyPic()]);
    }
  }, [initialData]);

  const addPicRow = () => setPics((prev) => [...prev, emptyPic()]);
  const removePicRow = (index: number) =>
    setPics((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  const updatePic = (index: number, field: keyof PicRow, value: string) =>
    setPics((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  const buildPayload = (): SupplierSubmitPayload => {
    const picsOut = pics
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        ...(p.phone.trim() ? { phone: p.phone.trim() } : {}),
        ...(p.email.trim() ? { email: p.email.trim() } : {}),
      }));
    return {
      customerId,
      code,
      name,
      phone: phone.trim(),
      address: address.trim(),
      province: addressHierarchy.province.trim(),
      city: addressHierarchy.city.trim(),
      district: addressHierarchy.district.trim(),
      subdistrict: addressHierarchy.subdistrict.trim(),
      postalCode: addressHierarchy.postalCode.trim(),
      pics: picsOut,
    };
  };

  const handleSubmit = () => onSubmit(buildPayload());

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <p className="form-subsection-title">Detail supplier</p>
      <div className="form-grid">
        <div className="full-row">
          <label htmlFor="md-sup-customer">Customer</label>
          <div className="browse-field">
            <input
              id="md-sup-customer"
              readOnly
              value={selectedCustomer ? `${selectedCustomer.code ?? '-'} - ${selectedCustomer.name ?? '-'}` : 'Pilih customer…'}
              onClick={() => !readOnly && setCustomerModalOpen(true)}
            />
            <button
              type="button"
              className="browse-trigger"
              onClick={() => setCustomerModalOpen(true)}
              disabled={busy || readOnly}
            >
              Search
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="md-sup-code">Supplier code</label>
          <input id="md-sup-code" readOnly={readOnly} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label htmlFor="md-sup-name">Supplier name</label>
          <input id="md-sup-name" readOnly={readOnly} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="md-sup-phone">Nomor telepon</label>
          <input
            id="md-sup-phone"
            readOnly={readOnly}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Opsional"
          />
        </div>
        <div className="full-row">
          <label htmlFor="md-sup-address">Alamat</label>
          <textarea
            id="md-sup-address"
            readOnly={readOnly}
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Opsional"
          />
        </div>
        <IndonesiaAddressFields readOnly={readOnly} value={addressHierarchy} onChange={setAddressHierarchy} />

        <div className="supplier-pic-section">
          <div className="supplier-pic-heading">PIC (bisa lebih dari satu)</div>
          <div className="supplier-pic-list">
            {pics.map((row, index) => (
              <div key={index} className="supplier-pic-row">
                <label>
                  Nama PIC
                  <input
                    readOnly={readOnly}
                    value={row.name}
                    onChange={(e) => updatePic(index, 'name', e.target.value)}
                    placeholder="Nama"
                  />
                </label>
                <label>
                  Telepon
                  <input
                    readOnly={readOnly}
                    value={row.phone}
                    onChange={(e) => updatePic(index, 'phone', e.target.value)}
                    placeholder="Opsional"
                  />
                </label>
                <label>
                  Email
                  <input
                    readOnly={readOnly}
                    type="email"
                    autoComplete="off"
                    value={row.email}
                    onChange={(e) => updatePic(index, 'email', e.target.value)}
                    placeholder="Opsional"
                  />
                </label>
                {!readOnly ? (
                  <button
                    type="button"
                    className="btn-secondary supplier-pic-remove"
                    onClick={() => removePicRow(index)}
                    disabled={busy || pics.length <= 1}
                    title="Hapus baris"
                  >
                    Hapus
                  </button>
                ) : (
                  <span className="supplier-pic-remove-spacer" aria-hidden />
                )}
              </div>
            ))}
          </div>
          {!readOnly ? (
            <button type="button" className="btn-secondary supplier-pic-add" onClick={addPicRow} disabled={busy}>
              + Tambah PIC
            </button>
          ) : null}
        </div>
      </div>
      {customerModalOpen && !readOnly ? (
        <div className="modal-backdrop" onClick={() => setCustomerModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Pilih customer</strong>
              <button type="button" className="btn-secondary" onClick={() => setCustomerModalOpen(false)}>
                Tutup
              </button>
            </div>
            <label htmlFor="md-sup-customer-search" className="modal-search-label">
              Cari customer
            </label>
            <input
              id="md-sup-customer-search"
              className="modal-search"
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
        <div className="row">
          <button type="button" onClick={handleSubmit} disabled={busy || !customerId}>
            {submitLabel}
          </button>
          {onCancel ? (
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
