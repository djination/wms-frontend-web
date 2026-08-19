'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchPlatformPlans, PlatformPlanRow, updatePlatformPlan } from '@/src/lib/platform-api';

export default function PlatformPlansPage() {
  const [items, setItems] = useState<PlatformPlanRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPlatformPlans();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat plans');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (plan: PlatformPlanRow) => {
    setBusyId(plan.id);
    setError(null);
    setSuccess(null);
    try {
      await updatePlatformPlan(plan.id, {
        name: plan.name,
        sortOrder: plan.sortOrder,
        maxWarehouses: plan.maxWarehouses,
        maxUsers: plan.maxUsers,
        maxCustomers: plan.maxCustomers,
        priceMonthly: Number(plan.priceMonthly),
        isActive: plan.isActive,
      });
      setSuccess(`Plan ${plan.code} disimpan`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan plan');
    } finally {
      setBusyId(null);
    }
  };

  const updateField = (id: string, field: keyof PlatformPlanRow, value: string | number | boolean) => {
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    );
  };

  return (
    <div>
      <h1>Subscription Plans</h1>
      <p className="muted">Paket langganan SaaS (schema platform.plans). Kolom Order mengatur urutan tampil — angka kecil tampil lebih dulu.</p>
      {error ? <p className="error">{error}</p> : null}
      {success ? <p style={{ color: 'green' }}>{success}</p> : null}

      <div style={{ overflowX: 'auto', marginTop: 16 }}>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Order</th>
              <th>Code</th>
              <th>Nama</th>
              <th>Max WH</th>
              <th>Max Users</th>
              <th>Max Customers</th>
              <th>Price/mo</th>
              <th>Active</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <input
                    type="number"
                    min={0}
                    style={{ width: 56 }}
                    value={plan.sortOrder ?? 0}
                    onChange={(e) => updateField(plan.id, 'sortOrder', Number(e.target.value))}
                    title="Urutan tampil (angka kecil = di atas)"
                  />
                </td>
                <td>
                  <code>{plan.code}</code>
                </td>
                <td>
                  <input
                    value={plan.name}
                    onChange={(e) => updateField(plan.id, 'name', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    style={{ width: 64 }}
                    value={plan.maxWarehouses}
                    onChange={(e) => updateField(plan.id, 'maxWarehouses', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    style={{ width: 64 }}
                    value={plan.maxUsers}
                    onChange={(e) => updateField(plan.id, 'maxUsers', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    style={{ width: 64 }}
                    value={plan.maxCustomers}
                    onChange={(e) => updateField(plan.id, 'maxCustomers', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    style={{ width: 100 }}
                    value={Number(plan.priceMonthly)}
                    onChange={(e) => updateField(plan.id, 'priceMonthly', Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={plan.isActive}
                    onChange={(e) => updateField(plan.id, 'isActive', e.target.checked)}
                  />
                </td>
                <td>
                  <button type="button" disabled={busyId === plan.id} onClick={() => void onSave(plan)}>
                    Simpan
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
