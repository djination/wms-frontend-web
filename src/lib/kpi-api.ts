import { callApi } from '@/src/lib/api';
import type { KpiSummary } from '@/src/lib/kpi-types';

export async function fetchKpiSummary(
  apiBase: string,
  token: string,
  opts: {
    dateFrom: string;
    dateTo: string;
    warehouseId?: string;
    customerId?: string;
  },
): Promise<KpiSummary> {
  const qs = new URLSearchParams();
  qs.set('from', `${opts.dateFrom}T00:00:00.000Z`);
  qs.set('to', `${opts.dateTo}T23:59:59.999Z`);
  if (opts.warehouseId) qs.set('warehouseId', opts.warehouseId);
  if (opts.customerId) qs.set('customerId', opts.customerId);
  return callApi(apiBase, token, 'GET', `/kpi/summary?${qs.toString()}`) as Promise<KpiSummary>;
}
