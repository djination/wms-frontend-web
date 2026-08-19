'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  FeatureFlagCatalogEntry,
  fetchFeatureFlagCatalog,
  updateFeatureFlagCatalog,
} from '@/src/lib/platform-api';

export default function PlatformFeatureFlagsPage() {
  const [catalog, setCatalog] = useState<FeatureFlagCatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchFeatureFlagCatalog();
      setCatalog(data.catalog);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat catalog');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await updateFeatureFlagCatalog(catalog);
      setSuccess('Feature flag catalog disimpan');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan catalog');
    } finally {
      setBusy(false);
    }
  };

  const addRow = () => {
    setCatalog((prev) => [...prev, { key: '', label: '', description: '' }]);
  };

  const removeRow = (idx: number) => {
    setCatalog((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateRow = (idx: number, field: keyof FeatureFlagCatalogEntry, value: string) => {
    setCatalog((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  return (
    <div>
      <h1>Feature Flag Catalog</h1>
      <p className="muted">
        Definisi flag global. Override per tenant di halaman detail tenant.
      </p>
      {error ? <p className="error">{error}</p> : null}
      {success ? <p style={{ color: 'green' }}>{success}</p> : null}

      <form onSubmit={onSave}>
        <table className="table" style={{ width: '100%', marginTop: 16 }}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Label</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((entry, idx) => (
              <tr key={`${entry.key}-${idx}`}>
                <td>
                  <input
                    value={entry.key}
                    onChange={(e) => updateRow(idx, 'key', e.target.value)}
                    placeholder="transitImport"
                    required
                  />
                </td>
                <td>
                  <input
                    value={entry.label}
                    onChange={(e) => updateRow(idx, 'label', e.target.value)}
                    placeholder="Transit Import"
                    required
                  />
                </td>
                <td>
                  <input
                    value={entry.description ?? ''}
                    onChange={(e) => updateRow(idx, 'description', e.target.value)}
                    placeholder="Deskripsi opsional"
                  />
                </td>
                <td>
                  <button type="button" onClick={() => removeRow(idx)}>
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button type="button" onClick={addRow}>
            + Tambah Flag
          </button>
          <button type="submit" disabled={busy}>
            Simpan Catalog
          </button>
        </div>
      </form>
    </div>
  );
}
