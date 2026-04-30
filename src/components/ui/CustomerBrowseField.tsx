'use client';

import { useMemo, useState } from 'react';
import type { OptionItem } from '@/src/lib/useWmsData';

type Props = {
  label: string;
  customers: OptionItem[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function CustomerBrowseField({
  label,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  placeholder = 'Pilih customer...',
  disabled = false,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId],
  );
  const browsedCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const code = String(c.code ?? '').toLowerCase();
      const name = String(c.name ?? '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [customers, query]);

  return (
    <div>
      <label>{label}</label>
      <div className="browse-field">
        <input
          readOnly
          value={selectedCustomer ? `${selectedCustomer.code ?? '-'} - ${selectedCustomer.name ?? '-'}` : placeholder}
          placeholder="Browse customer"
          onClick={() => {
            if (disabled) return;
            setModalOpen(true);
          }}
        />
        <button type="button" className="browse-trigger" disabled={disabled} aria-label="Browse customer" onClick={() => setModalOpen(true)}>
          Browse
        </button>
      </div>
      {modalOpen ? (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Pilih customer</strong>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                Tutup
              </button>
            </div>
            <label className="modal-search-label">Cari customer</label>
            <input
              className="modal-search"
              placeholder="Code atau nama..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="modal-list">
              {browsedCustomers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={selectedCustomerId === c.id ? 'modal-item active' : 'modal-item'}
                  onClick={() => {
                    onSelectCustomer(c.id);
                    setModalOpen(false);
                  }}
                >
                  {c.code ?? '-'} - {c.name ?? '-'}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
