'use client';

type ToastMessageProps = {
  message: string | null;
  variant?: 'success' | 'error';
};

function humanizeBackendError(raw: string): string {
  const trimmed = raw.trim();

  // Format lama: "400 Bad Request: {"message":"...","error":"...","path":"..."}"
  const jsonStart = trimmed.indexOf('{');
  if (jsonStart >= 0) {
    const maybeJson = trimmed.slice(jsonStart);
    try {
      const parsed = JSON.parse(maybeJson) as { message?: unknown; path?: unknown };
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        const msg = parsed.message.trim();
        if (msg === 'Received quantity exceeds ASN expected quantity') {
          return 'Qty diterima melebihi qty ASN yang diharapkan. Silakan cek ulang jumlahnya.';
        }
        if (msg === 'ASN is not receivable') {
          return 'ASN ini tidak bisa di-receive (status sudah selesai atau dibatalkan).';
        }
        if (msg === 'Unauthorized') {
          return 'Sesi login sudah tidak valid. Silakan login ulang.';
        }
        return msg;
      }
    } catch {
      // fallback ke formatter umum di bawah
    }
  }

  if (trimmed.includes('401') && /Unauthorized/i.test(trimmed)) {
    return 'Sesi login sudah tidak valid. Silakan login ulang.';
  }

  // Hilangkan prefix status agar lebih ringkas
  return trimmed.replace(/^\d+\s+[A-Za-z ]+:\s*/, '');
}

export default function ToastMessage({ message, variant = 'success' }: ToastMessageProps) {
  if (!message) return null;
  const content = variant === 'error' ? humanizeBackendError(message) : message;
  return <div className={variant === 'error' ? 'toast toast-error' : 'toast toast-success'}>{content}</div>;
}
