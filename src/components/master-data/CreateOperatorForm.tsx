'use client';

import { useEffect, useState } from 'react';
import IndonesiaAddressFields, { IndonesiaAddressValue } from './IndonesiaAddressFields';

type Props = {
  busy: boolean;
  readOnly?: boolean;
  title?: string;
  submitLabel?: string;
  initialData?: {
    code?: string;
    name?: string;
    phone?: string | null;
    address?: string | null;
    province?: string | null;
    city?: string | null;
    district?: string | null;
    subdistrict?: string | null;
    postalCode?: string | null;
    pics?: Array<{ name?: string; phone?: string | null; email?: string | null }>;
  };
  onCancel?: () => void;
  onSubmit: (payload: {
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
  }) => Promise<void>;
};

type PicRow = { name: string; phone: string; email: string };
const emptyPic = (): PicRow => ({ name: '', phone: '', email: '' });

export default function CreateOperatorForm({
  busy,
  readOnly = false,
  title = 'Operator/Owner company',
  submitLabel = 'Create Operator',
  initialData,
  onCancel,
  onSubmit,
}: Props) {
  const [code, setCode] = useState('OPR-A');
  const [name, setName] = useState('PT Operator Gudang A');
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

  useEffect(() => {
    if (!initialData) return;
    setCode(initialData.code ?? '');
    setName(initialData.name ?? '');
    setPhone(initialData.phone != null ? String(initialData.phone) : '');
    setAddress(initialData.address != null ? String(initialData.address) : '');
    setAddressHierarchy({
      province: initialData.province != null ? String(initialData.province) : '',
      city: initialData.city != null ? String(initialData.city) : '',
      district: initialData.district != null ? String(initialData.district) : '',
      subdistrict: initialData.subdistrict != null ? String(initialData.subdistrict) : '',
      postalCode: initialData.postalCode != null ? String(initialData.postalCode) : '',
    });
    const rawPics = initialData.pics;
    if (Array.isArray(rawPics) && rawPics.length > 0) {
      setPics(
        rawPics.map((p) => ({
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

  return (
    <>
      <h3 className="form-section-title">{title}</h3>
      <div className="form-grid">
        <div>
          <label htmlFor="md-op-code">Code</label>
          <input
            id="md-op-code"
            readOnly={readOnly}
            value={code}
            onChange={(e) => !readOnly && setCode(e.target.value)}
            placeholder="OPR-A"
          />
        </div>
        <div>
          <label htmlFor="md-op-name">Name</label>
          <input
            id="md-op-name"
            readOnly={readOnly}
            value={name}
            onChange={(e) => !readOnly && setName(e.target.value)}
            placeholder="Nama operator"
          />
        </div>
        <div>
          <label htmlFor="md-op-phone">Nomor telepon</label>
          <input
            id="md-op-phone"
            readOnly={readOnly}
            value={phone}
            onChange={(e) => !readOnly && setPhone(e.target.value)}
            placeholder="Opsional"
          />
        </div>
        <div className="full-row">
          <label htmlFor="md-op-address">Alamat</label>
          <textarea
            id="md-op-address"
            rows={3}
            readOnly={readOnly}
            value={address}
            onChange={(e) => !readOnly && setAddress(e.target.value)}
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
      {!readOnly ? (
        <div className="row">
          <button
            type="button"
            onClick={() =>
              onSubmit({
                code,
                name,
                phone: phone.trim(),
                address: address.trim(),
                province: addressHierarchy.province.trim(),
                city: addressHierarchy.city.trim(),
                district: addressHierarchy.district.trim(),
                subdistrict: addressHierarchy.subdistrict.trim(),
                postalCode: addressHierarchy.postalCode.trim(),
                pics: pics
                  .filter((p) => p.name.trim())
                  .map((p) => ({
                    name: p.name.trim(),
                    ...(p.phone.trim() ? { phone: p.phone.trim() } : {}),
                    ...(p.email.trim() ? { email: p.email.trim() } : {}),
                  })),
              })
            }
            disabled={busy}
          >
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
