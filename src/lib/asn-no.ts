/** Prefix klien: `NEXT_PUBLIC_ASN_NO_PREFIX` (default ASN). */
export function getAsnNoPrefix(): string {
  const raw = process.env.NEXT_PUBLIC_ASN_NO_PREFIX?.trim();
  return raw && raw.length > 0 ? raw : 'ASN';
}

/** Prefix sales order: `NEXT_PUBLIC_SALES_ORDER_NO_PREFIX` (default SO). Format sama seperti ASN: PREFIX-yyyymmdd-001 */
export function getSalesOrderNoPrefix(): string {
  const raw = process.env.NEXT_PUBLIC_SALES_ORDER_NO_PREFIX?.trim();
  return raw && raw.length > 0 ? raw : 'SO';
}

/** Prefix wave: `NEXT_PUBLIC_WAVE_NO_PREFIX` (default WAVE). Format sama: PREFIX-yyyymmdd-001 */
export function getWaveNoPrefix(): string {
  const raw = process.env.NEXT_PUBLIC_WAVE_NO_PREFIX?.trim();
  return raw && raw.length > 0 ? raw : 'WAVE';
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `yyyy-mm-dd` → `yyyymmdd` */
export function dateInputToYyyymmdd(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return '';
  return `${y}${m}${d}`;
}

/** Nomor berikutnya: `PREFIX-yyyymmdd-001` berdasarkan ASN yang sudah ada. */
export function computeNextAsnNo(prefix: string, yyyymmdd: string, existingAsnNos: string[]): string {
  const p = prefix.trim().toUpperCase();
  if (!yyyymmdd || yyyymmdd.length !== 8) {
    return `${p}-${yyyymmdd || '00000000'}-001`;
  }
  const pattern = new RegExp(`^${escapeRegExp(p)}-${yyyymmdd}-(\\d+)$`, 'i');
  let max = 0;
  for (const raw of existingAsnNos) {
    const m = String(raw).trim().toUpperCase().match(pattern);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  return `${p}-${yyyymmdd}-${String(next).padStart(3, '0')}`;
}
