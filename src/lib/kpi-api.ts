import { callApi } from '@/src/lib/api';
import type { KpiSummary } from '@/src/lib/kpi-types';

const DEFAULT_TRANSIT_IMPORT_CUSTOMS: KpiSummary['transitImportCustoms'] = {
  openHeldReceiptCount: 0,
  openHeldQtyBase: '0',
  avgOpenDwellHours: null,
  openDwellStatsBasis: 'none',
  clearedInPeriodReceiptCount: 0,
  clearedInPeriodQtyBase: '0',
  avgClearedDwellHoursHoldToRelease: null,
  clearedDwellStatsBasis: 'none',
};

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
  const data = (await callApi(apiBase, token, 'GET', `/kpi/summary?${qs.toString()}`)) as KpiSummary;
  return {
    ...data,
    transitImportCustoms: {
      ...DEFAULT_TRANSIT_IMPORT_CUSTOMS,
      ...(data.transitImportCustoms ?? {}),
    },
  };
}
