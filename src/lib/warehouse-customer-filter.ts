import type { OptionItem } from '@/src/lib/useWmsData';

/**
 * Same rules as ASN create: dedicated warehouse vs shared + customerMappings.
 * When customerId is empty, returns all warehouses (caller may still restrict UX).
 */
export function filterWarehousesForCustomer(warehouses: OptionItem[], customerId: string | undefined): OptionItem[] {
  if (!customerId) return warehouses;
  return warehouses.filter((raw) => {
    const row = raw as unknown as Record<string, unknown>;
    const warehouseType = String(row.type ?? '');
    if (warehouseType === 'DEDICATED') {
      const dedicatedCustomerId = row.customerId != null ? String(row.customerId) : '';
      return !dedicatedCustomerId || dedicatedCustomerId === customerId;
    }
    const mappings = Array.isArray(row.customerMappings)
      ? (row.customerMappings as Record<string, unknown>[])
      : [];
    const mappedCustomerIds = mappings
      .map((m) => (m.customerId != null ? String(m.customerId) : ''))
      .filter(Boolean);
    if (mappedCustomerIds.length === 0) return true;
    return mappedCustomerIds.includes(customerId);
  });
}
