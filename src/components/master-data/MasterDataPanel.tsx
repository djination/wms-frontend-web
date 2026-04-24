'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { callApi } from '@/src/lib/api';
import { useWmsData } from '@/src/lib/useWmsData';
import ToastMessage from '@/src/components/ui/ToastMessage';
import SimpleTable, { type SimpleTableRow } from '@/src/components/ui/SimpleTable';
import CreateCustomerForm from './CreateCustomerForm';
import CreateOperatorForm from './CreateOperatorForm';
import CreateProductForm from './CreateProductForm';
import CreateSupplierForm from './CreateSupplierForm';
import CreateWarehouseForm from './CreateWarehouseForm';
import CreateAreaForm from './CreateAreaForm';
import CreateZoneForm from './CreateZoneForm';
import CreateBinForm from './CreateBinForm';
import CreateUomForm from './CreateUomForm';

function WarehouseCustomerTableCell({ row }: { row: SimpleTableRow }): ReactNode {
  const full = String(row.customerLabel ?? '').trim();
  if (!full || full === '-') return '—';
  const parts = full.split(/,\s+/).map((s) => s.trim()).filter(Boolean);
  const title = parts.join(', ');
  const display =
    parts.length > 2
      ? `${parts.slice(0, 2).join(', ')} (+${parts.length - 2} lainnya)`
      : title;
  return (
    <span
      title={title}
      style={{
        display: 'block',
        maxWidth: 'min(36rem, 100%)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {display}
    </span>
  );
}

type MasterDataSection =
  | 'customers'
  | 'operators'
  | 'suppliers'
  | 'products'
  | 'uoms'
  | 'warehouses'
  | 'areas'
  | 'zones'
  | 'bins'
  | 'inventory';

type MasterDataPanelProps = {
  section: MasterDataSection;
};

export default function MasterDataPanel({ section }: MasterDataPanelProps) {
  const {
    apiBase,
    token,
    customers,
    operators,
    suppliers,
    uoms,
    products,
    warehouses,
    areas,
    zones,
    bins,
    busy,
    refreshReferenceData,
  } = useWmsData();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [inventoryRows, setInventoryRows] = useState<Array<Record<string, string | number | null | undefined>>>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tableFilterQuery, setTableFilterQuery] = useState('');
  const [tableFilterActive, setTableFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  const updateCustomer = async (id: string, body: { code: string; name: string; type: string; isActive: boolean }) => {
    setError(null);
    setSuccess(null);
    setActionBusy(`update-customer-${id}`);
    try {
      await callApi(apiBase, token, 'PATCH', `/master-data/customers/${id}`, body);
      setSuccess('Customer berhasil diperbarui');
      await refreshReferenceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request gagal');
      throw err;
    } finally {
      setActionBusy(null);
    }
  };

  const updateMaster = async (path: string, body: Record<string, unknown>) => {
    setError(null);
    setSuccess(null);
    setActionBusy(`update-${path}`);
    try {
      await callApi(apiBase, token, 'PATCH', path, body);
      setSuccess('Data berhasil diperbarui');
      await refreshReferenceData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Request gagal';
      setError(message);
      throw new Error(message);
    } finally {
      setActionBusy(null);
    }
  };

  const run = async (
    action: string,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    payload?: unknown,
  ) => {
    setError(null);
    setSuccess(null);
    setActionBusy(action);
    try {
      const data = await callApi(apiBase, token, method, path, payload);
      if (action === 'list-inventory' && Array.isArray(data)) {
        setInventoryRows(data as Array<Record<string, string | number | null | undefined>>);
      }
      if (method !== 'GET') {
        setSuccess('Data berhasil disimpan');
        await refreshReferenceData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request gagal');
    } finally {
      setActionBusy(null);
    }
  };

  useEffect(() => {
    if (section === 'inventory' && token) {
      void run('list-inventory', 'GET', '/master-data/inventory-balances');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, token]);

  useEffect(() => {
    setShowCreateForm(false);
    setTableFilterQuery('');
    setTableFilterActive('all');
  }, [section]);

  const sectionTitle = useMemo(() => {
    if (section === 'customers') return 'Master Data - Customers';
    if (section === 'operators') return 'Master Data - Operators/Owners';
    if (section === 'suppliers') return 'Master Data - Suppliers';
    if (section === 'products') return 'Master Data - Products';
    if (section === 'uoms') return 'Master Data - UOM';
    if (section === 'warehouses') return 'Master Data - Warehouses';
    if (section === 'areas') return 'Master Data - Areas';
    if (section === 'zones') return 'Master Data - Zones';
    if (section === 'bins') return 'Master Data - Bins';
    return 'Inventory - Inventory Balance';
  }, [section]);

  const productTableRows = useMemo((): SimpleTableRow[] => {
    if (!Array.isArray(products)) return [];
    return products.map((p) => {
      const raw = p as unknown as Record<string, unknown>;
      const c = raw.customer as { name?: string; code?: string } | null | undefined;
      const customerLabel =
        c?.code && c?.name
          ? `${String(c.code)} — ${String(c.name)}`
          : c?.name
            ? String(c.name)
            : c?.code
              ? String(c.code)
              : '-';
      return {
        id: raw.id != null ? String(raw.id) : '',
        sku: raw.sku != null ? String(raw.sku) : '',
        name: raw.name != null ? String(raw.name) : '',
        customerId: raw.customerId != null ? String(raw.customerId) : '',
        customerLabel,
        supplierIds: Array.isArray(raw.supplierIds)
          ? (raw.supplierIds as unknown[]).map((v) => String(v)).join(',')
          : '',
        supplierLabel: raw.supplierLabel != null ? String(raw.supplierLabel) : '-',
        isActive: Boolean(raw.isActive),
      };
    });
  }, [products]);

  const binTableRows = useMemo((): SimpleTableRow[] => {
    if (!Array.isArray(bins)) return [];
    return bins.map((raw) => {
      const b = raw as unknown as Record<string, unknown>;
      const w = b.warehouse as { code?: string; name?: string } | undefined;
      const z = b.zone as { code?: string; name?: string } | undefined;
      return {
        id: String(b.id ?? ''),
        code: String(b.code ?? ''),
        name: String(b.name ?? ''),
        warehouseId: String(b.warehouseId ?? ''),
        zoneId: String(b.zoneId ?? ''),
        warehouseLabel:
          w?.code && w?.name ? `${w.code} — ${w.name}` : String(b.warehouseId ?? '-'),
        zoneLabel: z?.code && z?.name ? `${z.code} — ${z.name}` : String(b.zoneId ?? '-'),
        isActive: Boolean(b.isActive),
      };
    });
  }, [bins]);

  const warehouseTableRows = useMemo((): SimpleTableRow[] => {
    if (!Array.isArray(warehouses)) return [];
    return warehouses.map((raw) => {
      const w = raw as unknown as Record<string, unknown>;
      const customer = w.customer as { code?: string; name?: string } | null | undefined;
      const mappings = Array.isArray(w.customerMappings) ? w.customerMappings : [];
      const mappedCustomerNames = mappings
        .map((mapping) => {
          const m = mapping as Record<string, unknown>;
          const c = m.customer as { code?: string; name?: string } | null | undefined;
          if (!c) return '';
          if (c.code && c.name) return `${String(c.code)} — ${String(c.name)}`;
          return String(c.name ?? c.code ?? '');
        })
        .filter(Boolean);
      const fallbackCustomerLabel =
        customer?.code && customer?.name
          ? `${String(customer.code)} — ${String(customer.name)}`
          : customer?.name
            ? String(customer.name)
            : customer?.code
              ? String(customer.code)
              : '-';
      const customerLabel = mappedCustomerNames.length > 0 ? mappedCustomerNames.join(', ') : fallbackCustomerLabel;
      const ownerC = w.ownerCompany as { code?: string; name?: string } | null | undefined;
      const opC = w.operatorCompany as { code?: string; name?: string } | null | undefined;
      const ownerLabel = ownerC
        ? [ownerC.code, ownerC.name].filter(Boolean).join(' — ') || String(ownerC.name ?? ownerC.code ?? '-')
        : '-';
      const operatorLabel = opC
        ? [opC.code, opC.name].filter(Boolean).join(' — ') || String(opC.name ?? opC.code ?? '-')
        : '—';
      return {
        id: String(w.id ?? ''),
        code: String(w.code ?? ''),
        name: String(w.name ?? ''),
        type: String(w.type ?? ''),
        ownerCompanyId: String(w.ownerCompanyId ?? ''),
        operatorCompanyId: w.operatorCompanyId != null ? String(w.operatorCompanyId) : '',
        ownerLabel,
        operatorLabel,
        customerId: w.customerId != null ? String(w.customerId) : '',
        customerIds: mappings
          .map((mapping) => {
            const m = mapping as Record<string, unknown>;
            return m.customerId != null ? String(m.customerId) : '';
          })
          .filter(Boolean)
          .join(','),
        customerLabel,
        isActive: Boolean(w.isActive),
      };
    });
  }, [warehouses]);

  const areaTableRows = useMemo((): SimpleTableRow[] => {
    const warehouseById = new Map(
      warehouses.map((w) => [w.id, `${w.code ?? '-'} — ${w.name ?? '-'}`]),
    );
    if (!Array.isArray(areas)) return [];
    return areas.map((raw) => {
      const a = raw as unknown as Record<string, unknown>;
      const warehouseId = String(a.warehouseId ?? '');
      return {
        id: String(a.id ?? ''),
        code: String(a.code ?? ''),
        name: String(a.name ?? ''),
        warehouseId,
        isActive: Boolean(a.isActive),
        warehouseLabel: warehouseById.get(warehouseId) ?? '-',
      };
    });
  }, [areas, warehouses]);

  const zoneTableRows = useMemo((): SimpleTableRow[] => {
    const warehouseById = new Map(
      warehouses.map((w) => [w.id, `${w.code ?? '-'} — ${w.name ?? '-'}`]),
    );
    const areaById = new Map(
      areas.map((a) => [a.id, `${a.code ?? '-'} — ${a.name ?? '-'}`]),
    );
    if (!Array.isArray(zones)) return [];
    return zones.map((raw) => {
      const z = raw as unknown as Record<string, unknown>;
      const warehouseId = String(z.warehouseId ?? '');
      const areaId = z.areaId != null ? String(z.areaId) : '';
      return {
        id: String(z.id ?? ''),
        code: String(z.code ?? ''),
        name: String(z.name ?? ''),
        warehouseId,
        areaId,
        warehouseLabel: warehouseById.get(warehouseId) ?? '-',
        areaLabel: areaById.get(areaId) ?? '-',
        isActive: Boolean(z.isActive),
      };
    });
  }, [zones, warehouses, areas]);

  const inventoryTableRows = useMemo((): SimpleTableRow[] => {
    if (!Array.isArray(inventoryRows)) return [];
    return inventoryRows.map((raw) => {
      const row = raw as Record<string, unknown>;
      const customer = row.customer as Record<string, unknown> | undefined;
      const warehouse = row.warehouse as Record<string, unknown> | undefined;
      const product = row.product as Record<string, unknown> | undefined;
      return {
        customerName:
          customer?.name != null
            ? String(customer.name)
            : row.customerId != null
              ? String(row.customerId)
              : '-',
        warehouseCode:
          warehouse?.code != null
            ? String(warehouse.code)
            : row.warehouseId != null
              ? String(row.warehouseId)
              : '-',
        productName:
          product?.name != null
            ? String(product.name)
            : row.productId != null
              ? String(row.productId)
              : '-',
        qtyOnHand: row.qtyOnHand != null ? String(row.qtyOnHand) : '0',
      };
    });
  }, [inventoryRows]);

  const applyRowFilter = (rows: SimpleTableRow[], keys: string[]) => {
    const q = tableFilterQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (tableFilterActive !== 'all') {
        const activeValue = Boolean(row.isActive);
        if (tableFilterActive === 'active' && !activeValue) return false;
        if (tableFilterActive === 'inactive' && activeValue) return false;
      }
      if (!q) return true;
      return keys.some((key) => String(row[key] ?? '').toLowerCase().includes(q));
    });
  };

  const filteredCustomerRows = useMemo(
    () => applyRowFilter(customers as unknown as SimpleTableRow[], ['code', 'name', 'type', 'phone', 'picCountLabel']),
    [customers, tableFilterQuery, tableFilterActive],
  );
  const filteredOperatorRows = useMemo(
    () => applyRowFilter(operators as unknown as SimpleTableRow[], ['code', 'name', 'phone', 'picCountLabel']),
    [operators, tableFilterQuery, tableFilterActive],
  );
  const customerTableRows = useMemo(
    () =>
      customers.map((row) => ({
        ...row,
        picCountLabel: `${Array.isArray((row as { pics?: unknown }).pics) ? ((row as { pics?: unknown[] }).pics?.length ?? 0) : 0} PIC`,
      })),
    [customers],
  );
  const operatorTableRows = useMemo(
    () =>
      operators.map((row) => ({
        ...row,
        picCountLabel: `${Array.isArray((row as { pics?: unknown }).pics) ? ((row as { pics?: unknown[] }).pics?.length ?? 0) : 0} PIC`,
      })),
    [operators],
  );
  const filteredCustomerTableRows = useMemo(
    () => applyRowFilter(customerTableRows as unknown as SimpleTableRow[], ['code', 'name', 'type', 'phone', 'picCountLabel']),
    [customerTableRows, tableFilterQuery, tableFilterActive],
  );
  const filteredOperatorTableRows = useMemo(
    () => applyRowFilter(operatorTableRows as unknown as SimpleTableRow[], ['code', 'name', 'phone', 'picCountLabel']),
    [operatorTableRows, tableFilterQuery, tableFilterActive],
  );
  const filteredSupplierRows = useMemo(
    () => applyRowFilter(suppliers as unknown as SimpleTableRow[], ['code', 'name', 'phone']),
    [suppliers, tableFilterQuery, tableFilterActive],
  );
  const filteredWarehouseRows = useMemo(
    () =>
      applyRowFilter(warehouseTableRows, [
        'code',
        'name',
        'type',
        'ownerLabel',
        'operatorLabel',
        'customerLabel',
      ]),
    [warehouseTableRows, tableFilterQuery, tableFilterActive],
  );
  const filteredProductRows = useMemo(
    () => applyRowFilter(productTableRows, ['sku', 'name', 'customerLabel', 'supplierLabel']),
    [productTableRows, tableFilterQuery, tableFilterActive],
  );
  const filteredUomRows = useMemo(
    () => applyRowFilter(uoms as unknown as SimpleTableRow[], ['code', 'name', 'description']),
    [uoms, tableFilterQuery, tableFilterActive],
  );
  const filteredAreaRows = useMemo(
    () => applyRowFilter(areaTableRows, ['code', 'name', 'warehouseLabel']),
    [areaTableRows, tableFilterQuery, tableFilterActive],
  );
  const filteredZoneRows = useMemo(
    () => applyRowFilter(zoneTableRows, ['code', 'name', 'warehouseLabel', 'areaLabel']),
    [zoneTableRows, tableFilterQuery, tableFilterActive],
  );
  const filteredBinRows = useMemo(
    () => applyRowFilter(binTableRows, ['code', 'name', 'warehouseLabel', 'zoneLabel']),
    [binTableRows, tableFilterQuery, tableFilterActive],
  );
  const filteredInventoryRows = useMemo(
    () => applyRowFilter(inventoryTableRows, ['customerName', 'warehouseCode', 'productName']),
    [inventoryTableRows, tableFilterQuery, tableFilterActive],
  );

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />

      <section className="card">
        <h2>{sectionTitle}</h2>
        <div className="master-data-toolbar">
          <div className="master-data-toolbar-filters">
            <div>
              <label htmlFor="md-table-filter-query">Filter data</label>
              <input
                id="md-table-filter-query"
                placeholder="Cari data..."
                value={tableFilterQuery}
                onChange={(e) => setTableFilterQuery(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="md-table-filter-active">Status aktif</label>
              <select
                id="md-table-filter-active"
                value={tableFilterActive}
                onChange={(e) => setTableFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              >
                <option value="all">Semua</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          {section !== 'inventory' ? (
            <div className="master-data-toolbar-actions">
              <button
                type="button"
                className="btn-add-data"
                onClick={() => setShowCreateForm((prev) => !prev)}
              >
                {showCreateForm ? 'Back to List' : `Add Data ${sectionTitle.replace('Master Data - ', '')}`}
              </button>
            </div>
          ) : null}
        </div>

        {showCreateForm && section === 'customers' ? (
          <CreateCustomerForm
            busy={busy || actionBusy === 'create-customer'}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-customer', 'POST', '/master-data/customers', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'operators' ? (
          <CreateOperatorForm
            busy={busy || actionBusy === 'create-operator'}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-operator', 'POST', '/master-data/operators', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'suppliers' ? (
          <CreateSupplierForm
            busy={busy || actionBusy === 'create-supplier'}
            customers={customers}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-supplier', 'POST', '/master-data/suppliers', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'products' ? (
          <CreateProductForm
            busy={busy || actionBusy === 'create-product'}
            customers={customers}
            suppliers={suppliers}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-product', 'POST', '/master-data/products', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'uoms' ? (
          <CreateUomForm
            busy={busy || actionBusy === 'create-uom'}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-uom', 'POST', '/master-data/uoms', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'areas' ? (
          <CreateAreaForm
            busy={busy || actionBusy === 'create-area'}
            warehouses={warehouses}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-area', 'POST', '/master-data/areas', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'zones' ? (
          <CreateZoneForm
            busy={busy || actionBusy === 'create-zone'}
            warehouses={warehouses}
            areas={areas}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-zone', 'POST', '/master-data/zones', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'bins' ? (
          <CreateBinForm
            busy={busy || actionBusy === 'create-bin'}
            warehouses={warehouses}
            zones={zones}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-bin', 'POST', '/master-data/bins', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}

        {showCreateForm && section === 'warehouses' ? (
          <CreateWarehouseForm
            busy={busy || actionBusy === 'create-warehouse'}
            variant="create"
            customers={customers}
            operators={operators}
            onCancel={() => setShowCreateForm(false)}
            onSubmit={async (payload) => {
              await run('create-warehouse', 'POST', '/master-data/warehouses', payload);
              setShowCreateForm(false);
            }}
          />
        ) : null}
      </section>

      {section === 'customers' ? (
        <SimpleTable
          title="Customers"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'type', label: 'Type', sortType: 'text' },
            { key: 'phone', label: 'Phone', sortType: 'text' },
            { key: 'picCountLabel', label: 'PIC', sortType: 'text' },
          ]}
          rows={filteredCustomerTableRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateCustomerForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'Customer' : 'Edit Customer'}
                submitLabel="Save Customer"
                initialData={{
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                  type: String(row.type ?? 'SHARED'),
                  phone: row.phone != null ? String(row.phone) : '',
                  address: row.address != null ? String(row.address) : '',
                  province: row.province != null ? String(row.province) : '',
                  city: row.city != null ? String(row.city) : '',
                  district: row.district != null ? String(row.district) : '',
                  subdistrict: row.subdistrict != null ? String(row.subdistrict) : '',
                  postalCode: row.postalCode != null ? String(row.postalCode) : '',
                  pics: Array.isArray((row as { pics?: unknown }).pics)
                    ? ((row as { pics?: unknown }).pics as { name?: string; phone?: string | null; email?: string | null }[])
                    : [],
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  await updateCustomer(String(row.id ?? ''), { ...payload, isActive: Boolean(row.isActive) });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-customer', 'DELETE', `/master-data/customers/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'operators' ? (
        <SimpleTable
          title="Operators"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'phone', label: 'Phone', sortType: 'text' },
            { key: 'picCountLabel', label: 'PIC', sortType: 'text' },
          ]}
          rows={filteredOperatorTableRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateOperatorForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'Operator' : 'Edit Operator'}
                submitLabel="Save Operator"
                initialData={{
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                  phone: row.phone != null ? String(row.phone) : '',
                  address: row.address != null ? String(row.address) : '',
                  province: row.province != null ? String(row.province) : '',
                  city: row.city != null ? String(row.city) : '',
                  district: row.district != null ? String(row.district) : '',
                  subdistrict: row.subdistrict != null ? String(row.subdistrict) : '',
                  postalCode: row.postalCode != null ? String(row.postalCode) : '',
                  pics: Array.isArray((row as { pics?: unknown }).pics)
                    ? ((row as { pics?: unknown }).pics as { name?: string; phone?: string | null; email?: string | null }[])
                    : [],
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  await updateMaster(`/master-data/operators/${String(row.id ?? '')}`, {
                    ...payload,
                    isActive: Boolean(row.isActive),
                  });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-operator', 'DELETE', `/master-data/operators/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'suppliers' ? (
        <SimpleTable
          title="Suppliers"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'phone', label: 'Phone', sortType: 'text' },
          ]}
          rows={filteredSupplierRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            const rowPics = (row as { pics?: unknown }).pics;
            return (
              <CreateSupplierForm
                key={String(row.id ?? '')}
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'Supplier' : 'Edit Supplier'}
                submitLabel="Save Supplier"
                customers={customers}
                initialData={{
                  customerId: String(row.customerId ?? ''),
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                  phone: row.phone != null ? String(row.phone) : '',
                  address: row.address != null ? String(row.address) : '',
                  province: row.province != null ? String(row.province) : '',
                  city: row.city != null ? String(row.city) : '',
                  district: row.district != null ? String(row.district) : '',
                  subdistrict: row.subdistrict != null ? String(row.subdistrict) : '',
                  postalCode: row.postalCode != null ? String(row.postalCode) : '',
                  pics: Array.isArray(rowPics) ? (rowPics as { name?: string; phone?: string | null; email?: string | null }[]) : [],
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  const { customerId: _customerId, ...patch } = payload;
                  await updateMaster(`/master-data/suppliers/${String(row.id ?? '')}`, {
                    ...patch,
                    isActive: Boolean(row.isActive),
                  });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-supplier', 'DELETE', `/master-data/suppliers/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'warehouses' ? (
        <SimpleTable
          title="Warehouses"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'type', label: 'Type', sortType: 'text' },
            { key: 'ownerLabel', label: 'Pemilik (owner)', sortType: 'text' },
            { key: 'operatorLabel', label: 'Pengelola (operator)', sortType: 'text' },
            {
              key: 'customerLabel',
              label: 'Customer Name',
              sortType: 'text',
              renderCell: (row) => <WarehouseCustomerTableCell row={row} />,
            },
          ]}
          rows={filteredWarehouseRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateWarehouseForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                variant="edit"
                title={readOnly ? 'Warehouse' : 'Edit Warehouse'}
                submitLabel="Save Warehouse"
                customers={customers}
                operators={operators}
                initialData={{
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                  type: String(row.type ?? 'SHARED'),
                  ownerCompanyId: String(row.ownerCompanyId ?? ''),
                  operatorCompanyId:
                    row.operatorCompanyId != null && String(row.operatorCompanyId) !== ''
                      ? String(row.operatorCompanyId)
                      : null,
                  customerId: String(row.customerId ?? ''),
                  customerIds: String(row.customerIds ?? '')
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                  phone: row.phone != null ? String(row.phone) : '',
                  address: row.address != null ? String(row.address) : '',
                  province: row.province != null ? String(row.province) : '',
                  city: row.city != null ? String(row.city) : '',
                  district: row.district != null ? String(row.district) : '',
                  subdistrict: row.subdistrict != null ? String(row.subdistrict) : '',
                  postalCode: row.postalCode != null ? String(row.postalCode) : '',
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  const { customerIds, ...warehousePayload } = payload;
                  await updateMaster(`/master-data/warehouses/${String(row.id ?? '')}`, {
                    ...warehousePayload,
                    isActive: Boolean(row.isActive),
                  });
                  if (payload.type === 'SHARED') {
                    await run('assign-shared-customers', 'POST', '/master-data/warehouses/assign-customers', {
                      warehouseId: String(row.id ?? ''),
                      customerIds: customerIds ?? [],
                    });
                  }
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-warehouse', 'DELETE', `/master-data/warehouses/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'bins' ? (
        <SimpleTable
          title="Bins"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'warehouseLabel', label: 'Warehouse', sortType: 'text' },
            { key: 'zoneLabel', label: 'Zone', sortType: 'text' },
            {
              key: 'isActive',
              label: 'Active',
              sortType: 'text',
              renderCell: (row) => (row.isActive ? 'Yes' : 'No'),
            },
          ]}
          rows={filteredBinRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateBinForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'Bin' : 'Edit Bin'}
                submitLabel="Save Bin"
                warehouses={warehouses}
                zones={zones}
                initialData={{
                  warehouseId: String(row.warehouseId ?? ''),
                  zoneId: String(row.zoneId ?? ''),
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  await updateMaster(`/master-data/bins/${String(row.id ?? '')}`, {
                    ...payload,
                    isActive: Boolean(row.isActive),
                  });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-bin', 'DELETE', `/master-data/bins/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'areas' ? (
        <SimpleTable
          title="Areas"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'warehouseLabel', label: 'Warehouse', sortType: 'text' },
            {
              key: 'isActive',
              label: 'Active',
              sortType: 'text',
              renderCell: (row) => (row.isActive ? 'Yes' : 'No'),
            },
          ]}
          rows={filteredAreaRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateAreaForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'Area' : 'Edit Area'}
                submitLabel="Save Area"
                warehouses={warehouses}
                initialData={{
                  warehouseId: String(row.warehouseId ?? ''),
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  await updateMaster(`/master-data/areas/${String(row.id ?? '')}`, {
                    ...payload,
                    isActive: Boolean(row.isActive),
                  });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-area', 'DELETE', `/master-data/areas/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'zones' ? (
        <SimpleTable
          title="Zones"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'warehouseLabel', label: 'Warehouse', sortType: 'text' },
            { key: 'areaLabel', label: 'Area', sortType: 'text' },
            {
              key: 'isActive',
              label: 'Active',
              sortType: 'text',
              renderCell: (row) => (row.isActive ? 'Yes' : 'No'),
            },
          ]}
          rows={filteredZoneRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateZoneForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'Zone' : 'Edit Zone'}
                submitLabel="Save Zone"
                warehouses={warehouses}
                areas={areas}
                initialData={{
                  warehouseId: String(row.warehouseId ?? ''),
                  areaId: String(row.areaId ?? ''),
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  await updateMaster(`/master-data/zones/${String(row.id ?? '')}`, {
                    ...payload,
                    isActive: Boolean(row.isActive),
                  });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-zone', 'DELETE', `/master-data/zones/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'inventory' ? (
        <SimpleTable
          title="Inventory Balances"
          columns={[
            { key: 'customerName', label: 'Customer', sortType: 'text' },
            { key: 'warehouseCode', label: 'Warehouse', sortType: 'text' },
            { key: 'productName', label: 'Product', sortType: 'text' },
            { key: 'qtyOnHand', label: 'Qty On Hand', sortType: 'number' },
          ]}
          rows={filteredInventoryRows}
          loading={busy || actionBusy === 'list-inventory'}
        />
      ) : null}

      {section === 'products' ? (
        <SimpleTable
          title="Products"
          columns={[
            { key: 'sku', label: 'SKU', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'customerLabel', label: 'Customer', sortType: 'text' },
            { key: 'supplierLabel', label: 'Suppliers', sortType: 'text' },
            {
              key: 'isActive',
              label: 'Active',
              sortType: 'text',
              renderCell: (row) => (row.isActive ? 'Yes' : 'No'),
            },
          ]}
          rows={filteredProductRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateProductForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'Product' : 'Edit Product'}
                submitLabel="Save Product"
                customers={customers}
                suppliers={suppliers}
                initialData={{
                  customerId: String(row.customerId ?? ''),
                  sku: String(row.sku ?? ''),
                  name: String(row.name ?? ''),
                  supplierIds: String(row.supplierIds ?? '')
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  await updateMaster(`/master-data/products/${String(row.id ?? '')}`, {
                    sku: payload.sku,
                    name: payload.name,
                    supplierIds: payload.supplierIds,
                    isActive: Boolean(row.isActive),
                  });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-product', 'DELETE', `/master-data/products/${String(row.id ?? '')}`)}
        />
      ) : null}

      {section === 'uoms' ? (
        <SimpleTable
          title="UOM"
          columns={[
            { key: 'code', label: 'Code', sortType: 'text' },
            { key: 'name', label: 'Name', sortType: 'text' },
            { key: 'description', label: 'Description', sortType: 'text' },
            {
              key: 'isActive',
              label: 'Active',
              sortType: 'text',
              renderCell: (row) => (row.isActive ? 'Yes' : 'No'),
            },
          ]}
          rows={filteredUomRows}
          loading={busy}
          renderEditModal={(row, onClose, ctx) => {
            const readOnly = ctx?.variant === 'view';
            return (
              <CreateUomForm
                busy={busy || !!actionBusy}
                readOnly={readOnly}
                title={readOnly ? 'UOM' : 'Edit UOM'}
                submitLabel="Save UOM"
                initialData={{
                  code: String(row.code ?? ''),
                  name: String(row.name ?? ''),
                  description: row.description != null ? String(row.description) : '',
                }}
                onCancel={onClose}
                onSubmit={async (payload) => {
                  await updateMaster(`/master-data/uoms/${String(row.id ?? '')}`, {
                    ...payload,
                    isActive: Boolean(row.isActive),
                  });
                  onClose();
                }}
              />
            );
          }}
          onDeleteRow={(row) => run('delete-uom', 'DELETE', `/master-data/uoms/${String(row.id ?? '')}`)}
        />
      ) : null}
    </>
  );
}
