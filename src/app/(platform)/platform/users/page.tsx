'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  createPlatformUser,
  fetchPlatformUsers,
  PlatformUserRow,
  resetPlatformUserPassword,
  updatePlatformUser,
} from '@/src/lib/platform-api';

const ROLES = ['SUPER_ADMIN', 'SUPPORT', 'BILLING'];

export default function PlatformUsersPage() {
  const [items, setItems] = useState<PlatformUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState('SUPPORT');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPlatformUsers();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat platform users');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await createPlatformUser({ email, password, name, role });
      setEmail('');
      setName('');
      setSuccess('Platform user dibuat');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat user');
    } finally {
      setBusy(false);
    }
  };

  const onToggleActive = async (user: PlatformUserRow) => {
    setBusy(true);
    setError(null);
    try {
      await updatePlatformUser(user.id, { isActive: !user.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update gagal');
    } finally {
      setBusy(false);
    }
  };

  const onChangeRole = async (user: PlatformUserRow, nextRole: string) => {
    setBusy(true);
    setError(null);
    try {
      await updatePlatformUser(user.id, { role: nextRole });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update role gagal');
    } finally {
      setBusy(false);
    }
  };

  const onResetPassword = async (user: PlatformUserRow) => {
    const next = window.prompt(`Password baru untuk ${user.email}:`, 'password123');
    if (!next || next.length < 8) return;
    setBusy(true);
    setError(null);
    try {
      await resetPlatformUserPassword(user.id, next);
      setSuccess(`Password ${user.email} direset`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset password gagal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>Platform Users</h1>
      <p className="muted">Kelola admin SaaS (schema platform.platform_users).</p>
      {error ? <p className="error">{error}</p> : null}
      {success ? <p style={{ color: 'green' }}>{success}</p> : null}

      <section style={{ marginTop: 24 }}>
        <h2>Tambah User</h2>
        <form onSubmit={onCreate} style={{ maxWidth: 480 }}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="name">Nama</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <label htmlFor="role">Role</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy} style={{ marginTop: 12 }}>
            Buat User
          </button>
        </form>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Daftar User ({items.length})</h2>
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Email</th>
              <th>Nama</th>
              <th>Role</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.name ?? '—'}</td>
                <td>
                  <select
                    value={user.role}
                    disabled={busy}
                    onChange={(e) => void onChangeRole(user, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{user.isActive ? 'Active' : 'Inactive'}</td>
                <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" disabled={busy} onClick={() => void onToggleActive(user)}>
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void onResetPassword(user)}>
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
