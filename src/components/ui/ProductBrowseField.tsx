'use client';

import { useMemo, useState } from 'react';
import type { OptionItem } from '@/src/lib/useWmsData';

type Props = {
  label: string;
  products: OptionItem[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
};

export default function ProductBrowseField({
  label,
  products,
  selectedProductId,
  onSelectProduct,
  disabled = false,
  emptyMessage = 'Tidak ada produk untuk filter saat ini.',
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );
  const browsedProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((p) => `${p.sku ?? ''} ${p.code ?? ''} ${p.name ?? ''}`.toLowerCase().includes(needle));
  }, [products, query]);

  return (
    <div>
      <label>{label}</label>
      <div className="browse-field">
        <input
          readOnly
          value={selectedProduct ? `${selectedProduct.sku ?? selectedProduct.code ?? '-'} — ${selectedProduct.name ?? '-'}` : 'Pilih produk...'}
          placeholder="Browse produk"
          onClick={() => {
            if (disabled) return;
            setModalOpen(true);
          }}
        />
        <button
          type="button"
          className="browse-trigger"
          disabled={disabled}
          aria-label="Browse produk"
          onClick={() => setModalOpen(true)}
        >
          Browse
        </button>
      </div>
      {modalOpen ? (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <strong>Pilih produk</strong>
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                Tutup
              </button>
            </div>
            <label className="modal-search-label">Cari produk</label>
            <input
              className="modal-search"
              placeholder="SKU atau nama..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="modal-list">
              {browsedProducts.length === 0 ? (
                <div className="modal-item" style={{ cursor: 'default' }}>
                  {emptyMessage}
                </div>
              ) : (
                browsedProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={selectedProductId === p.id ? 'modal-item active' : 'modal-item'}
                    onClick={() => {
                      onSelectProduct(p.id);
                      setModalOpen(false);
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
    </div>
  );
}
