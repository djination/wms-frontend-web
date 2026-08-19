'use client';

type AppHeaderProps = {
  apiBase: string;
  busy: boolean;
  tenantName?: string;
  onApiBaseChange: (value: string) => void;
  onHealth: () => void;
  onLogout: () => void;
};

export default function AppHeader(props: AppHeaderProps) {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <strong>WMS Platform</strong>
        <span className="badge">Web Application</span>
        {props.tenantName ? (
          <span className="badge tenant-badge" title="Tenant aktif">
            {props.tenantName}
          </span>
        ) : null}
      </div>
      <div className="navbar-right">
        {/* <input value={apiBase} onChange={(e) => onApiBaseChange(e.target.value)} /> */}
        {/* <button onClick={onHealth} disabled={busy}>
          Health
        </button> */}
        <button className="btn-secondary" onClick={props.onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
