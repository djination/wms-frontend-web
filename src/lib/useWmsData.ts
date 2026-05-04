'use client';

import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { callApi } from '@/src/lib/api';
import { getStoredApiBase, getStoredToken } from '@/src/lib/session';

export type SupplierPicRow = {
  id?: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
};

export type OptionItem = {
  id: string;
  code?: string;
  name?: string;
  /** Supplier master */
  phone?: string | null;
  address?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  subdistrict?: string | null;
  postalCode?: string | null;
  pics?: SupplierPicRow[];
  isActive?: boolean;
  asnNo?: string;
  /** CustomerType from master-data customers */
  type?: string;
  /** Product master: owning customer */
  customerId?: string;
  sku?: string;
  /** Master warehouse: transit import hub (Fase 2 inbound) */
  isTransitImportHub?: boolean;
  /** Bin master: warehouse */
  warehouseId?: string;
  /** Bin master: zone */
  zoneId?: string;
  supplierIds?: string[];
  supplierLabel?: string;
};

/** Area master (GET /master-data/areas) */
export type WarehouseAreaItem = {
  id: string;
  warehouseId: string;
  code?: string;
  name?: string;
  isActive?: boolean;
};

/** Zone master (GET /master-data/zones) */
export type WarehouseZoneItem = {
  id: string;
  warehouseId: string;
  areaId?: string;
  code?: string;
  name?: string;
  isActive?: boolean;
};

export type SalesOrderRow = {
  id: string;
  orderNo: string;
  status: string;
  warehouseId?: string;
  createdAt?: string;
  updatedAt?: string;
  items?: Array<{
    id: string;
    productId: string;
    qtyOrdered?: string | number | unknown;
    product?: { sku?: string; name?: string };
  }>;
};

export type OutboundWaveRow = {
  id: string;
  waveNo: string;
  salesOrderId?: string;
  plannedAt?: string;
  createdAt?: string;
};

type WmsDataContextValue = {
  apiBase: string;
  token: string;
  customers: OptionItem[];
  operators: OptionItem[];
  suppliers: OptionItem[];
  uoms: OptionItem[];
  warehouses: OptionItem[];
  products: OptionItem[];
  areas: WarehouseAreaItem[];
  bins: OptionItem[];
  zones: WarehouseZoneItem[];
  asns: OptionItem[];
  salesOrders: SalesOrderRow[];
  waves: OutboundWaveRow[];
  busy: boolean;
  refreshReferenceData: () => Promise<void>;
};

const WmsDataContext = createContext<WmsDataContextValue | null>(null);

export function WmsDataProvider({ children }: { children: React.ReactNode }) {
  const [apiBase, setApiBase] = useState(getStoredApiBase());
  const [token, setToken] = useState('');
  const [customers, setCustomers] = useState<OptionItem[]>([]);
  const [operators, setOperators] = useState<OptionItem[]>([]);
  const [suppliers, setSuppliers] = useState<OptionItem[]>([]);
  const [uoms, setUoms] = useState<OptionItem[]>([]);
  const [warehouses, setWarehouses] = useState<OptionItem[]>([]);
  const [products, setProducts] = useState<OptionItem[]>([]);
  const [areas, setAreas] = useState<WarehouseAreaItem[]>([]);
  const [bins, setBins] = useState<OptionItem[]>([]);
  const [zones, setZones] = useState<WarehouseZoneItem[]>([]);
  const [asns, setAsns] = useState<OptionItem[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrderRow[]>([]);
  const [waves, setWaves] = useState<OutboundWaveRow[]>([]);
  const [busy, setBusy] = useState(false);

  const refreshReferenceData = async () => {
    const currentToken = getStoredToken();
    if (!currentToken) return;
    const currentApiBase = getStoredApiBase();
    setApiBase(currentApiBase);
    setBusy(true);
    try {
      const [c, o, s, u, w, p, ar, z, b, a, so, wav] = await Promise.all([
        callApi(currentApiBase, currentToken, 'GET', '/master-data/customers'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/operators'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/suppliers'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/uoms'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/warehouses'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/products'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/areas'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/zones'),
        callApi(currentApiBase, currentToken, 'GET', '/master-data/bins'),
        callApi(currentApiBase, currentToken, 'GET', '/inbound/asns'),
        callApi(currentApiBase, currentToken, 'GET', '/outbound/sales-orders'),
        callApi(currentApiBase, currentToken, 'GET', '/outbound/waves'),
      ]);
      setCustomers(Array.isArray(c) ? c : []);
      setOperators(Array.isArray(o) ? o : []);
      setSuppliers(Array.isArray(s) ? s : []);
      setUoms(Array.isArray(u) ? u : []);
      setWarehouses(Array.isArray(w) ? w : []);
      setProducts(
        Array.isArray(p)
          ? (p as Record<string, unknown>[]).map((row) => {
              const mappings = Array.isArray(row.supplierMappings)
                ? (row.supplierMappings as Record<string, unknown>[])
                : [];
              const supplierIds = mappings
                .map((m) => (m.supplierId != null ? String(m.supplierId) : ''))
                .filter(Boolean);
              const supplierLabel = mappings
                .map((m) => {
                  const sup = (m.supplier ?? null) as Record<string, unknown> | null;
                  if (!sup) return '';
                  const code = sup.code != null ? String(sup.code) : '';
                  const name = sup.name != null ? String(sup.name) : '';
                  return code && name ? `${code} — ${name}` : name || code;
                })
                .filter(Boolean)
                .join(', ');
              return {
                ...row,
                supplierIds,
                supplierLabel,
              } as OptionItem;
            })
          : [],
      );
      setAreas(
        Array.isArray(ar)
          ? (ar as Record<string, unknown>[]).map((row) => ({
              id: String(row.id ?? ''),
              warehouseId: String(row.warehouseId ?? ''),
              code: row.code != null ? String(row.code) : undefined,
              name: row.name != null ? String(row.name) : undefined,
              isActive: Boolean(row.isActive),
            }))
          : [],
      );
      setZones(
        Array.isArray(z)
          ? (z as Record<string, unknown>[]).map((row) => ({
              id: String(row.id ?? ''),
              warehouseId: String(row.warehouseId ?? ''),
              areaId: row.areaId != null ? String(row.areaId) : undefined,
              code: row.code != null ? String(row.code) : undefined,
              name: row.name != null ? String(row.name) : undefined,
              isActive: Boolean(row.isActive),
            }))
          : [],
      );
      setBins(Array.isArray(b) ? b : []);
      setAsns(Array.isArray(a) ? a : []);
      setSalesOrders(Array.isArray(so) ? (so as SalesOrderRow[]) : []);
      setWaves(
        Array.isArray(wav)
          ? (wav as Record<string, unknown>[]).map((row) => ({
              id: String(row.id ?? ''),
              waveNo: String(row.waveNo ?? ''),
              salesOrderId: row.salesOrderId != null ? String(row.salesOrderId) : undefined,
              plannedAt: row.plannedAt != null ? String(row.plannedAt) : undefined,
              createdAt: row.createdAt != null ? String(row.createdAt) : undefined,
            }))
          : [],
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setApiBase(getStoredApiBase());
    setToken(getStoredToken());
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshReferenceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const value = useMemo(
    () => ({
      apiBase,
      token,
      customers,
      operators,
      suppliers,
      uoms,
      warehouses,
      products,
      areas,
      bins,
      zones,
      asns,
      salesOrders,
      waves,
      busy,
      refreshReferenceData,
    }),
    [
      apiBase,
      token,
      customers,
      operators,
      suppliers,
      uoms,
      warehouses,
      products,
      areas,
      bins,
      zones,
      asns,
      salesOrders,
      waves,
      busy,
    ],
  );

  return createElement(WmsDataContext.Provider, { value }, children);
}

export function useWmsData() {
  const ctx = useContext(WmsDataContext);
  if (!ctx) {
    throw new Error('useWmsData must be used within WmsDataProvider');
  }
  return ctx;
}
