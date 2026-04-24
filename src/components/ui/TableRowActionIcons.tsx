/** Ikon kecil untuk kolom aksi tabel (inline SVG, tanpa dependency ikon). */

export function IconView() {
  return (
    <svg className="table-action-svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0-7C7 4 2.73 7.11 1 12c1.73 4.89 6 8 11 8s9.27-3.11 11-8c-1.73-4.89-6-8-11-8Zm0 14c-3.86 0-7.17-2.1-8.9-5 1.73-2.9 5.04-5 8.9-5 3.86 0 7.17 2.1 8.9 5-1.73 2.9-5.04 5-8.9 5Z"
      />
    </svg>
  );
}

export function IconEdit() {
  return (
    <svg className="table-action-svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
      />
    </svg>
  );
}

export function IconDelete() {
  return (
    <svg className="table-action-svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"
      />
    </svg>
  );
}
