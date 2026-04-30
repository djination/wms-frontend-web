/** Mirrors backend `GET /kpi/summary` response shape. */
export type KpiSummary = {
  period: { from: string; to: string };
  filters: { warehouseId: string | null; customerId: string | null };
  inbound: {
    asnCountByStatusCreatedInPeriod: Partial<Record<string, number>>;
    completedAsnCountClosedInPeriod: number;
    receivingFillRate: number | null;
    lineDiscrepancyCountBelowExpected: number;
    qtyExpectedInCompletedAsns: string;
    qtyReceivedInCompletedAsns: string;
  };
  outbound: {
    ordersCreatedInPeriodByStatus: Partial<Record<string, number>>;
    shippedOrdersInPeriod: number;
    orderFulfillmentRateByQty: number | null;
    orderedQtyInPeriod: string;
    shippedQtyInPeriod: string;
    outboundTasksCreatedInPeriodByStatus: Partial<Record<string, number>>;
    taskCompletionRate: number | null;
  };
  inventory: {
    snapshotAsOf: string;
    totalQtyOnHand: string;
    balanceLineCount: number;
    binsWithStock: number;
    binsTotalActive: number;
    spaceUtilizationRate: number | null;
  };
  billing: {
    amountPosted: string;
    linesPosted: number;
    amountDraft: string;
    linesDraft: number;
    byComponentAndStatus: Array<{
      component: string;
      status: string;
      lines: number;
      amount: string;
    }>;
  };
  processFlow: {
    transfersCompletedInPeriod: number;
    transferQtyMovedInPeriod: string;
    transformationsCompletedInPeriod: number;
    transformationOutputQtyInPeriod: string;
    transformationInputQtyConsumedInPeriod: string;
    kitchenYieldRatioOutputOverInput: number | null;
  };
};
