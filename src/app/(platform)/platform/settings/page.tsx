'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  fetchPlatformSettings,
  PlatformSettingRow,
  upsertPlatformSetting,
} from '@/src/lib/platform-api';

type SettingForm = {
  defaultTrialDays: number;
  signupEnabled: boolean;
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
};

function parseSettings(items: PlatformSettingRow[]): SettingForm {
  const byKey = Object.fromEntries(items.map((s) => [s.key, s.value]));
  return {
    defaultTrialDays: Number((byKey.default_trial_days as { days?: number })?.days ?? 14),
    signupEnabled: Boolean((byKey.signup_enabled as { enabled?: boolean })?.enabled ?? true),
    maintenanceEnabled: Boolean((byKey.maintenance_mode as { enabled?: boolean })?.enabled ?? false),
    maintenanceMessage: String((byKey.maintenance_mode as { message?: string })?.message ?? ''),
  };
}

export default function PlatformSettingsPage() {
  const [form, setForm] = useState<SettingForm>({
    defaultTrialDays: 14,
    signupEnabled: true,
    maintenanceEnabled: false,
    maintenanceMessage: '',
  });
  const [rawItems, setRawItems] = useState<PlatformSettingRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchPlatformSettings();
      setRawItems(data.items);
      setForm(parseSettings(data.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat settings');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await Promise.all([
        upsertPlatformSetting('default_trial_days', { days: form.defaultTrialDays }),
        upsertPlatformSetting('signup_enabled', { enabled: form.signupEnabled }),
        upsertPlatformSetting('maintenance_mode', {
          enabled: form.maintenanceEnabled,
          message: form.maintenanceMessage,
        }),
      ]);
      setSuccess('Platform settings disimpan');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan settings');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>Platform Settings</h1>
      <p className="muted">Konfigurasi global SaaS (schema platform.platform_settings).</p>
      {error ? <p className="error">{error}</p> : null}
      {success ? <p className="success-msg">{success}</p> : null}

      <form onSubmit={onSubmit} className="platform-settings-form">
        <p className="form-section-title">Trial & signup</p>
        <div className="form-grid platform-settings-grid">
          <div className="full-row">
            <label htmlFor="trial-days">Default trial (hari)</label>
            <input
              id="trial-days"
              type="number"
              min={1}
              value={form.defaultTrialDays}
              onChange={(e) => setForm((f) => ({ ...f, defaultTrialDays: Number(e.target.value) }))}
            />
          </div>

          <div className="full-row checkbox-row">
            <label className="checkbox-row" htmlFor="signup-enabled">
              <input
                id="signup-enabled"
                type="checkbox"
                checked={form.signupEnabled}
                onChange={(e) => setForm((f) => ({ ...f, signupEnabled: e.target.checked }))}
              />
              Signup tenant publik diaktifkan
            </label>
          </div>
        </div>

        <p className="form-section-title">Maintenance</p>
        <div className="form-grid platform-settings-grid">
          <div className="full-row checkbox-row">
            <label className="checkbox-row" htmlFor="maintenance-enabled">
              <input
                id="maintenance-enabled"
                type="checkbox"
                checked={form.maintenanceEnabled}
                onChange={(e) => setForm((f) => ({ ...f, maintenanceEnabled: e.target.checked }))}
              />
              Maintenance mode
            </label>
          </div>

          <div className="full-row">
            <label htmlFor="maintenance-msg">Pesan maintenance</label>
            <textarea
              id="maintenance-msg"
              rows={3}
              placeholder="Pesan yang ditampilkan saat maintenance mode aktif"
              value={form.maintenanceMessage}
              disabled={!form.maintenanceEnabled}
              onChange={(e) => setForm((f) => ({ ...f, maintenanceMessage: e.target.value }))}
            />
          </div>
        </div>

        <div className="platform-settings-actions">
          <button type="submit" disabled={busy}>
            {busy ? 'Menyimpan...' : 'Simpan Settings'}
          </button>
        </div>
      </form>

      {rawItems.length > 0 ? (
        <details className="platform-settings-raw">
          <summary>Raw settings (JSON)</summary>
          <pre>{JSON.stringify(rawItems, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
