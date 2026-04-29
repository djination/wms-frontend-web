'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SimpleTable, { type SimpleTableRow } from '@/src/components/ui/SimpleTable';
import ToastMessage from '@/src/components/ui/ToastMessage';
import CustomerBrowseField from '@/src/components/ui/CustomerBrowseField';
import ProductBrowseField from '@/src/components/ui/ProductBrowseField';
import { callApi } from '@/src/lib/api';
import { computeNextAsnNo, dateInputToYyyymmdd, getTransferNoPrefix } from '@/src/lib/asn-no';
import { useWmsData } from '@/src/lib/useWmsData';

export type ProcessFlowSection = 'transfers' | 'transformations' | 'recipes';

type TransferRow = {
  id: string;
  transferNo: string;
  status: string;
  customerId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: Array<{
    productId: string;
    sourceBinId: string;
    destinationBinId: string;
    qty: string;
  }>;
  completedAt?: string;
  createdAt?: string;
};

type TransformationRow = {
  id: string;
  processNo: string;
  status: string;
  customerId: string;
  warehouseId: string;
  outputProductId: string;
  outputBinId: string;
  qtyOutput: string;
  inputs: Array<{ productId: string; binId: string; qtyConsumed: string }>;
  completedAt?: string;
  createdAt?: string;
};

type RecipeRow = {
  id: string;
  recipeCode: string;
  customerId: string;
  outputProductId: string;
  baseOutputQty: string;
  isActive: boolean;
  lines: Array<{ productId: string; qtyPerBase: string; product?: { sku?: string; code?: string; name?: string } }>;
  updatedAt?: string;
};

type InventoryBalanceRow = {
  customerId?: string;
  warehouseId?: string;
  productId?: string;
  binId?: string;
  qtyOnHand?: string | number;
};

type Props = {
  section: ProcessFlowSection;
};

export default function ProcessFlowPanel({ section }: Props) {
  const { apiBase, token, customers, warehouses, products, bins, busy } = useWmsData();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [transformations, setTransformations] = useState<TransformationRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);

  const [transferNo, setTransferNo] = useState('');
  const [transferCustomerId, setTransferCustomerId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [transferLine, setTransferLine] = useState({ productId: '', sourceBinId: '', destinationBinId: '', qty: '1' });
  const [completeTransferId, setCompleteTransferId] = useState('');

  const [processNo, setProcessNo] = useState('');
  const [processCustomerId, setProcessCustomerId] = useState('');
  const [processWarehouseId, setProcessWarehouseId] = useState('');
  const [outputProductId, setOutputProductId] = useState('');
  const [outputBinId, setOutputBinId] = useState('');
  const [qtyOutput, setQtyOutput] = useState('1');
  const [inputLine, setInputLine] = useState({ productId: '', binId: '', qtyConsumed: '1' });
  const [completeProcessId, setCompleteProcessId] = useState('');
  const [recipeCode, setRecipeCode] = useState('');
  const [recipeCustomerId, setRecipeCustomerId] = useState('');
  const [recipeOutputProductId, setRecipeOutputProductId] = useState('');
  const [recipeBaseOutputQty, setRecipeBaseOutputQty] = useState('500');
  const [recipeLine, setRecipeLine] = useState({ productId: '', qtyPerBase: '100' });
  const [recipeLines, setRecipeLines] = useState<Array<{ productId: string; qtyPerBase: string }>>([
    { productId: '', qtyPerBase: '100' },
  ]);
  const [editRecipeId, setEditRecipeId] = useState('');
  const [editRecipeCode, setEditRecipeCode] = useState('');
  const [editRecipeOutputProductId, setEditRecipeOutputProductId] = useState('');
  const [editRecipeBaseOutputQty, setEditRecipeBaseOutputQty] = useState('500');
  const [editRecipeNote, setEditRecipeNote] = useState('');
  const [editRecipeLines, setEditRecipeLines] = useState<Array<{ productId: string; qtyPerBase: string }>>([]);

  const [fromRecipeProcessNo, setFromRecipeProcessNo] = useState('');
  const [fromRecipeId, setFromRecipeId] = useState('');
  const [fromRecipeWarehouseId, setFromRecipeWarehouseId] = useState('');
  const [fromRecipeOutputBinId, setFromRecipeOutputBinId] = useState('');
  const [fromRecipeQtyOutput, setFromRecipeQtyOutput] = useState('1000');
  const [fromRecipeInputBins, setFromRecipeInputBins] = useState<Record<string, string>>({});
  const [inventoryBalances, setInventoryBalances] = useState<InventoryBalanceRow[]>([]);

  const transferDraftOptions = useMemo(
    () => transfers.filter((t) => t.status === 'DRAFT').map((t) => ({ id: t.id, label: `${t.transferNo} (${t.status})` })),
    [transfers],
  );
  const transformationDraftOptions = useMemo(
    () =>
      transformations
        .filter((t) => t.status === 'DRAFT')
        .map((t) => ({ id: t.id, label: `${t.processNo} (${t.status})` })),
    [transformations],
  );

  const binsByWarehouse = useMemo(() => {
    const map = new Map<string, typeof bins>();
    for (const b of bins) {
      const wid = b.warehouseId ?? '';
      const curr = map.get(wid) ?? [];
      curr.push(b);
      map.set(wid, curr);
    }
    return map;
  }, [bins]);

  const transferPrefix = useMemo(() => getTransferNoPrefix(), []);
  const transferToday = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const transferYyyymmdd = useMemo(() => dateInputToYyyymmdd(transferToday), [transferToday]);
  const existingTransferNos = useMemo(
    () => transfers.map((t) => t.transferNo).filter((n): n is string => typeof n === 'string' && n.length > 0),
    [transfers],
  );
  const transferProductsForCustomer = useMemo(
    () => products.filter((p) => !transferCustomerId || p.customerId === transferCustomerId),
    [products, transferCustomerId],
  );
  const processProductsForCustomer = useMemo(
    () => (processCustomerId ? products.filter((p) => p.customerId === processCustomerId) : []),
    [products, processCustomerId],
  );
  const recipeProductsForCustomer = useMemo(
    () => (recipeCustomerId ? products.filter((p) => p.customerId === recipeCustomerId) : []),
    [products, recipeCustomerId],
  );
  const editRecipeProductsForCustomer = useMemo(() => {
    const editRecipe = recipes.find((r) => r.id === editRecipeId);
    if (!editRecipe) return products;
    return products.filter((p) => p.customerId === editRecipe.customerId);
  }, [products, recipes, editRecipeId]);

  const selectedRecipe = useMemo(() => recipes.find((r) => r.id === fromRecipeId), [recipes, fromRecipeId]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (section === 'transfers') {
        const data = await callApi(apiBase, token, 'GET', '/process-flow/transfers');
        setTransfers(Array.isArray(data) ? (data as TransferRow[]) : []);
      } else if (section === 'transformations') {
        const data = await callApi(apiBase, token, 'GET', '/process-flow/transformations');
        setTransformations(Array.isArray(data) ? (data as TransformationRow[]) : []);
      } else {
        const data = await callApi(apiBase, token, 'GET', '/process-flow/recipes');
        setRecipes(Array.isArray(data) ? (data as RecipeRow[]) : []);
      }
    } catch {
      if (section === 'transfers') setTransfers([]);
      else if (section === 'transformations') setTransformations([]);
      else setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase, section, token]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (section !== 'transfers') return;
    setTransferNo(computeNextAsnNo(transferPrefix, transferYyyymmdd, existingTransferNos));
  }, [section, transferPrefix, transferYyyymmdd, existingTransferNos]);

  useEffect(() => {
    const loadInventoryBalances = async () => {
      if (!token || !fromRecipeWarehouseId) return;
      try {
        const data = await callApi(apiBase, token, 'GET', '/master-data/inventory-balances');
        setInventoryBalances(Array.isArray(data) ? (data as InventoryBalanceRow[]) : []);
      } catch {
        setInventoryBalances([]);
      }
    };
    void loadInventoryBalances();
  }, [apiBase, fromRecipeWarehouseId, token]);

  useEffect(() => {
    if (!selectedRecipe || !fromRecipeWarehouseId) return;
    const nextMappings: Record<string, string> = {};
    for (const line of selectedRecipe.lines ?? []) {
      const candidates = inventoryBalances.filter(
        (row) =>
          row.warehouseId === fromRecipeWarehouseId &&
          row.customerId === selectedRecipe.customerId &&
          row.productId === line.productId &&
          row.binId,
      );
      const best = candidates.reduce<InventoryBalanceRow | null>((acc, curr) => {
        const currQty = Number(curr.qtyOnHand ?? 0);
        const accQty = Number(acc?.qtyOnHand ?? 0);
        return currQty > accQty ? curr : acc;
      }, null);
      nextMappings[line.productId] = best?.binId ?? '';
    }
    setFromRecipeInputBins((prev) => ({ ...nextMappings, ...prev }));
  }, [inventoryBalances, fromRecipeWarehouseId, selectedRecipe]);

  const createTransfer = async () => {
    if (!transferNo || !transferCustomerId || !fromWarehouseId || !toWarehouseId) return;
    setActionBusy('create-transfer');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'POST', '/process-flow/transfers', {
        transferNo,
        customerId: transferCustomerId,
        fromWarehouseId,
        toWarehouseId,
        lines: [{ ...transferLine, qty: Number(transferLine.qty) }],
      });
      setSuccess('Internal transfer created');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed create transfer');
    } finally {
      setActionBusy(null);
    }
  };

  const completeTransfer = async () => {
    if (!completeTransferId) return;
    setActionBusy('complete-transfer');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'PATCH', `/process-flow/transfers/${completeTransferId}/complete`);
      setSuccess('Transfer completed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed complete transfer');
    } finally {
      setActionBusy(null);
    }
  };

  const createTransformation = async () => {
    if (!processNo || !processCustomerId || !processWarehouseId || !outputProductId || !outputBinId) return;
    setActionBusy('create-transformation');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'POST', '/process-flow/transformations', {
        processNo,
        customerId: processCustomerId,
        warehouseId: processWarehouseId,
        outputProductId,
        outputBinId,
        qtyOutput: Number(qtyOutput),
        inputs: [{ ...inputLine, qtyConsumed: Number(inputLine.qtyConsumed) }],
      });
      setSuccess('Material transformation created');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed create transformation');
    } finally {
      setActionBusy(null);
    }
  };

  const completeTransformation = async () => {
    if (!completeProcessId) return;
    setActionBusy('complete-transformation');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'PATCH', `/process-flow/transformations/${completeProcessId}/complete`);
      setSuccess('Transformation completed');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed complete transformation');
    } finally {
      setActionBusy(null);
    }
  };

  const createRecipe = async () => {
    if (!recipeCode || !recipeCustomerId || !recipeOutputProductId) return;
    const normalizedLines = recipeLines.filter((line) => line.productId && Number(line.qtyPerBase) > 0);
    if (normalizedLines.length === 0) {
      setError('Recipe lines minimal 1 bahan');
      return;
    }
    const uniqueProducts = new Set(normalizedLines.map((line) => line.productId));
    if (uniqueProducts.size !== normalizedLines.length) {
      setError('Bahan recipe tidak boleh duplikat');
      return;
    }
    setActionBusy('create-recipe');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'POST', '/process-flow/recipes', {
        recipeCode,
        customerId: recipeCustomerId,
        outputProductId: recipeOutputProductId,
        baseOutputQty: Number(recipeBaseOutputQty),
        lines: normalizedLines.map((line) => ({ productId: line.productId, qtyPerBase: Number(line.qtyPerBase) })),
      });
      setSuccess('Recipe created');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed create recipe');
    } finally {
      setActionBusy(null);
    }
  };

  const deactivateRecipe = async () => {
    if (!editRecipeId) return;
    setActionBusy('deactivate-recipe');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'PATCH', `/process-flow/recipes/${editRecipeId}`, { isActive: false });
      setSuccess('Recipe deactivated');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed deactivate recipe');
    } finally {
      setActionBusy(null);
    }
  };

  const activateRecipe = async () => {
    if (!editRecipeId) return;
    setActionBusy('activate-recipe');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'PATCH', `/process-flow/recipes/${editRecipeId}`, { isActive: true });
      setSuccess('Recipe activated');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed activate recipe');
    } finally {
      setActionBusy(null);
    }
  };

  const createTransformationFromRecipe = async () => {
    if (!fromRecipeProcessNo || !fromRecipeId || !fromRecipeWarehouseId || !fromRecipeOutputBinId) return;
    const selectedLines = selectedRecipe?.lines ?? [];
    const missingBin = selectedLines.find((line) => !fromRecipeInputBins[line.productId]);
    if (missingBin) {
      setError('Semua bahan recipe harus dipilih input bin-nya');
      return;
    }
    setActionBusy('create-from-recipe');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'POST', '/process-flow/transformations/from-recipe', {
        processNo: fromRecipeProcessNo,
        recipeId: fromRecipeId,
        warehouseId: fromRecipeWarehouseId,
        outputBinId: fromRecipeOutputBinId,
        qtyOutput: Number(fromRecipeQtyOutput),
        inputBins: selectedLines.map((line) => ({
          productId: line.productId,
          binId: fromRecipeInputBins[line.productId],
        })),
      });
      setSuccess('Transformation draft created from recipe');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed create transformation from recipe');
    } finally {
      setActionBusy(null);
    }
  };

  const loadRecipeToEdit = (recipeId: string) => {
    setEditRecipeId(recipeId);
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) {
      setEditRecipeCode('');
      setEditRecipeOutputProductId('');
      setEditRecipeBaseOutputQty('500');
      setEditRecipeNote('');
      setEditRecipeLines([]);
      return;
    }
    setEditRecipeCode(recipe.recipeCode ?? '');
    setEditRecipeOutputProductId(recipe.outputProductId ?? '');
    setEditRecipeBaseOutputQty(String(recipe.baseOutputQty ?? '500'));
    setEditRecipeNote('');
    setEditRecipeLines(
      (recipe.lines ?? []).map((line) => ({
        productId: line.productId,
        qtyPerBase: String(line.qtyPerBase),
      })),
    );
  };

  const saveRecipeEdit = async () => {
    if (!editRecipeId || !editRecipeCode || !editRecipeOutputProductId) return;
    const normalizedLines = editRecipeLines.filter((line) => line.productId && Number(line.qtyPerBase) > 0);
    if (normalizedLines.length === 0) {
      setError('Recipe edit harus punya minimal 1 bahan');
      return;
    }
    const uniqueProducts = new Set(normalizedLines.map((line) => line.productId));
    if (uniqueProducts.size !== normalizedLines.length) {
      setError('Bahan recipe tidak boleh duplikat');
      return;
    }
    setActionBusy('save-recipe-edit');
    setError(null);
    setSuccess(null);
    try {
      await callApi(apiBase, token, 'PATCH', `/process-flow/recipes/${editRecipeId}`, {
        recipeCode: editRecipeCode,
        outputProductId: editRecipeOutputProductId,
        baseOutputQty: Number(editRecipeBaseOutputQty),
        note: editRecipeNote || undefined,
        lines: normalizedLines.map((line) => ({
          productId: line.productId,
          qtyPerBase: Number(line.qtyPerBase),
        })),
      });
      setSuccess('Recipe updated');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed update recipe');
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <>
      <ToastMessage message={success} />
      <ToastMessage message={error} variant="error" />

      {section === 'transfers' ? (
        <section className="card">
          <h2>Process Flow - Internal Transfers</h2>
          <div className="form-grid">
            <div>
              <label>Transfer No</label>
              <input
                value={transferNo}
                readOnly
                disabled
                title="Auto generate mengikuti format nomor ASN (PREFIX-yyyymmdd-001)"
              />
            </div>
            <div>
              <CustomerBrowseField
                label="Customer"
                customers={customers}
                selectedCustomerId={transferCustomerId}
                onSelectCustomer={(nextCustomerId) => {
                  setTransferCustomerId(nextCustomerId);
                  setTransferLine((prev) => ({ ...prev, productId: '' }));
                }}
              />
            </div>
            <div>
              <ProductBrowseField
                label="Line Product"
                products={transferProductsForCustomer}
                selectedProductId={transferLine.productId}
                onSelectProduct={(nextProductId) => setTransferLine((p) => ({ ...p, productId: nextProductId }))}
                disabled={!transferCustomerId}
                emptyMessage={transferCustomerId ? 'Tidak ada produk untuk customer ini.' : 'Pilih customer dulu.'}
              />
            </div>
            <div>
              <label>Line Qty</label>
              <input
                type="number"
                min={0.0001}
                step="any"
                value={transferLine.qty}
                onChange={(e) => setTransferLine((p) => ({ ...p, qty: e.target.value }))}
              />
            </div>
            <div>
              <label>From Warehouse</label>
              <select
                value={fromWarehouseId}
                onChange={(e) => {
                  setFromWarehouseId(e.target.value);
                  setTransferLine((p) => ({ ...p, sourceBinId: '' }));
                }}
              >
                <option value="">Pilih warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code ?? w.id} - {w.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Line Source Bin</label>
              <select
                value={transferLine.sourceBinId}
                onChange={(e) => setTransferLine((p) => ({ ...p, sourceBinId: e.target.value }))}
              >
                <option value="">Pilih bin</option>
                {(binsByWarehouse.get(fromWarehouseId) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ?? b.id} - {b.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>To Warehouse</label>
              <select
                value={toWarehouseId}
                onChange={(e) => {
                  setToWarehouseId(e.target.value);
                  setTransferLine((p) => ({ ...p, destinationBinId: '' }));
                }}
              >
                <option value="">Pilih warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code ?? w.id} - {w.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Line Destination Bin</label>
              <select
                value={transferLine.destinationBinId}
                onChange={(e) => setTransferLine((p) => ({ ...p, destinationBinId: e.target.value }))}
              >
                <option value="">Pilih bin</option>
                {(binsByWarehouse.get(toWarehouseId) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ?? b.id} - {b.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <button type="button" disabled={busy || !!actionBusy} onClick={() => void createTransfer()}>
              Buat Transfer
            </button>
          </div>
          <hr style={{ borderColor: '#243041', margin: '20px 0' }} />
          <div className="form-grid">
            <div>
              <label>Complete Transfer</label>
              <select value={completeTransferId} onChange={(e) => setCompleteTransferId(e.target.value)}>
                <option value="">Pilih transfer draft</option>
                {transferDraftOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn-secondary" disabled={busy || !!actionBusy || !completeTransferId} onClick={() => void completeTransfer()}>
              Complete Transfer
            </button>
            <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => void loadData()} disabled={loading}>
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </section>
      ) : section === 'transformations' ? (
        <section className="card">
          <h2>Process Flow - Material Transformations</h2>
          <div className="form-grid">
            <div>
              <label>Process No</label>
              <input value={processNo} onChange={(e) => setProcessNo(e.target.value)} placeholder="PROC-NTI-0001" />
            </div>
            <div>
              <CustomerBrowseField
                label="Customer"
                customers={customers}
                selectedCustomerId={processCustomerId}
                onSelectCustomer={(nextCustomerId) => {
                  setProcessCustomerId(nextCustomerId);
                  setOutputProductId('');
                  setInputLine((prev) => ({ ...prev, productId: '' }));
                }}
              />
            </div>
            <div>
              <label>Warehouse</label>
              <select value={processWarehouseId} onChange={(e) => setProcessWarehouseId(e.target.value)}>
                <option value="">Pilih warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code ?? w.id} - {w.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <ProductBrowseField
                label="Output Product"
                products={processProductsForCustomer}
                selectedProductId={outputProductId}
                onSelectProduct={setOutputProductId}
                disabled={!processCustomerId}
                emptyMessage={processCustomerId ? 'Tidak ada produk untuk customer ini.' : 'Pilih customer dulu.'}
              />
            </div>
            <div>
              <label>Output Bin</label>
              <select value={outputBinId} onChange={(e) => setOutputBinId(e.target.value)}>
                <option value="">Pilih bin</option>
                {(binsByWarehouse.get(processWarehouseId) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ?? b.id} - {b.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Qty Output</label>
              <input type="number" min={0.0001} step="any" value={qtyOutput} onChange={(e) => setQtyOutput(e.target.value)} />
            </div>
            <div>
              <ProductBrowseField
                label="Input Product"
                products={processProductsForCustomer}
                selectedProductId={inputLine.productId}
                onSelectProduct={(nextProductId) => setInputLine((p) => ({ ...p, productId: nextProductId }))}
                disabled={!processCustomerId}
                emptyMessage={processCustomerId ? 'Tidak ada produk untuk customer ini.' : 'Pilih customer dulu.'}
              />
            </div>
            <div>
              <label>Input Bin</label>
              <select value={inputLine.binId} onChange={(e) => setInputLine((p) => ({ ...p, binId: e.target.value }))}>
                <option value="">Pilih bin</option>
                {(binsByWarehouse.get(processWarehouseId) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ?? b.id} - {b.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Qty Consumed</label>
              <input
                type="number"
                min={0.0001}
                step="any"
                value={inputLine.qtyConsumed}
                onChange={(e) => setInputLine((p) => ({ ...p, qtyConsumed: e.target.value }))}
              />
            </div>
          </div>
          <div className="row">
            <button type="button" disabled={busy || !!actionBusy} onClick={() => void createTransformation()}>
              Buat Transformation
            </button>
          </div>
          <hr style={{ borderColor: '#243041', margin: '20px 0' }} />
          <div className="form-grid">
            <div>
              <label>Complete Transformation</label>
              <select value={completeProcessId} onChange={(e) => setCompleteProcessId(e.target.value)}>
                <option value="">Pilih process draft</option>
                {transformationDraftOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <button
              type="button"
              className="btn-secondary"
              disabled={busy || !!actionBusy || !completeProcessId}
              onClick={() => void completeTransformation()}
            >
              Complete Transformation
            </button>
            <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => void loadData()} disabled={loading}>
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </section>
      ) : (
        <section className="card">
          <h2>Process Flow - Recipes (BOM)</h2>
          <div className="form-grid">
            <div>
              <label>Recipe Code</label>
              <input value={recipeCode} onChange={(e) => setRecipeCode(e.target.value)} placeholder="RCP-FLAV-001" />
            </div>
            <div>
              <CustomerBrowseField
                label="Customer"
                customers={customers}
                selectedCustomerId={recipeCustomerId}
                onSelectCustomer={(nextCustomerId) => {
                  setRecipeCustomerId(nextCustomerId);
                  setRecipeOutputProductId('');
                  setRecipeLines([{ productId: '', qtyPerBase: '100' }]);
                }}
              />
            </div>
            <div>
              <ProductBrowseField
                label="Output Product"
                products={recipeProductsForCustomer}
                selectedProductId={recipeOutputProductId}
                onSelectProduct={setRecipeOutputProductId}
                disabled={!recipeCustomerId}
                emptyMessage={recipeCustomerId ? 'Tidak ada produk untuk customer ini.' : 'Pilih customer dulu.'}
              />
            </div>
            <div>
              <label>Base Output Qty</label>
              <input
                type="number"
                min={0.0001}
                step="any"
                value={recipeBaseOutputQty}
                onChange={(e) => setRecipeBaseOutputQty(e.target.value)}
              />
            </div>
            <div>
              <label>Recipe Line Builder</label>
              <div className="muted">Tambahkan beberapa bahan sekaligus sebelum simpan recipe.</div>
            </div>
          </div>
          {recipeLines.map((line, idx) => (
            <div key={`recipe-builder-${idx}`} className="form-grid" style={{ marginTop: 8 }}>
              <div>
                <ProductBrowseField
                  label={`Bahan #${idx + 1}`}
                  products={recipeProductsForCustomer}
                  selectedProductId={line.productId}
                  onSelectProduct={(nextProductId) =>
                    setRecipeLines((prev) => prev.map((r, i) => (i === idx ? { ...r, productId: nextProductId } : r)))
                  }
                  disabled={!recipeCustomerId}
                  emptyMessage={recipeCustomerId ? 'Tidak ada produk untuk customer ini.' : 'Pilih customer dulu.'}
                />
              </div>
              <div>
                <label>Qty per Base</label>
                <input
                  type="number"
                  min={0.0001}
                  step="any"
                  value={line.qtyPerBase}
                  onChange={(e) =>
                    setRecipeLines((prev) => prev.map((r, i) => (i === idx ? { ...r, qtyPerBase: e.target.value } : r)))
                  }
                />
              </div>
            </div>
          ))}
          <div className="row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setRecipeLines((prev) => [...prev, { productId: '', qtyPerBase: '100' }])}
              disabled={busy || !!actionBusy}
            >
              + Tambah Bahan
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginLeft: 8 }}
              onClick={() => setRecipeLines([{ productId: '', qtyPerBase: '100' }])}
              disabled={busy || !!actionBusy}
            >
              Reset Bahan
            </button>
            <button type="button" disabled={busy || !!actionBusy} onClick={() => void createRecipe()}>
              Buat Recipe
            </button>
            <button type="button" className="btn-secondary" style={{ marginLeft: 8 }} onClick={() => void loadData()} disabled={loading}>
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <div>
              <label>Deactivate Recipe</label>
              <select value={editRecipeId} onChange={(e) => setEditRecipeId(e.target.value)}>
                <option value="">Pilih recipe aktif</option>
                {recipes.filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.recipeCode}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn-secondary" disabled={busy || !!actionBusy || !editRecipeId} onClick={() => void deactivateRecipe()}>
              Deactivate Recipe
            </button>
            <button type="button" className="btn-secondary" disabled={busy || !!actionBusy || !editRecipeId} onClick={() => void activateRecipe()}>
              Activate Recipe
            </button>
          </div>
          <hr style={{ borderColor: '#243041', margin: '20px 0' }} />
          <h3 className="form-section-title">Edit Recipe</h3>
          <div className="form-grid">
            <div>
              <label>Select Recipe</label>
              <select value={editRecipeId} onChange={(e) => loadRecipeToEdit(e.target.value)}>
                <option value="">Pilih recipe</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.recipeCode} ({r.isActive ? 'ACTIVE' : 'INACTIVE'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Recipe Code</label>
              <input value={editRecipeCode} onChange={(e) => setEditRecipeCode(e.target.value)} disabled={!editRecipeId} />
            </div>
            <div>
              <label>Output Product</label>
              <select value={editRecipeOutputProductId} onChange={(e) => setEditRecipeOutputProductId(e.target.value)} disabled={!editRecipeId}>
                <option value="">Pilih product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku ?? p.code ?? p.id} - {p.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Base Output Qty</label>
              <input
                type="number"
                min={0.0001}
                step="any"
                value={editRecipeBaseOutputQty}
                onChange={(e) => setEditRecipeBaseOutputQty(e.target.value)}
                disabled={!editRecipeId}
              />
            </div>
            <div>
              <label>Note</label>
              <input value={editRecipeNote} onChange={(e) => setEditRecipeNote(e.target.value)} disabled={!editRecipeId} />
            </div>
          </div>
          {editRecipeId
            ? editRecipeLines.map((line, idx) => (
                <div key={`edit-recipe-line-${idx}`} className="form-grid" style={{ marginTop: 8 }}>
                  <div>
                    <ProductBrowseField
                      label={`Edit Bahan #${idx + 1}`}
                      products={editRecipeProductsForCustomer}
                      selectedProductId={line.productId}
                      onSelectProduct={(nextProductId) =>
                        setEditRecipeLines((prev) => prev.map((r, i) => (i === idx ? { ...r, productId: nextProductId } : r)))
                      }
                      disabled={!editRecipeId}
                      emptyMessage="Tidak ada produk yang tersedia."
                    />
                  </div>
                  <div>
                    <label>Qty per Base</label>
                    <input
                      type="number"
                      min={0.0001}
                      step="any"
                      value={line.qtyPerBase}
                      onChange={(e) =>
                        setEditRecipeLines((prev) => prev.map((r, i) => (i === idx ? { ...r, qtyPerBase: e.target.value } : r)))
                      }
                    />
                  </div>
                </div>
              ))
            : null}
          {editRecipeId ? (
            <div className="row">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditRecipeLines((prev) => [...prev, { productId: '', qtyPerBase: '100' }])}
                disabled={busy || !!actionBusy}
              >
                + Tambah Bahan Edit
              </button>
              <button type="button" disabled={busy || !!actionBusy} onClick={() => void saveRecipeEdit()}>
                Save Recipe Edit
              </button>
            </div>
          ) : null}
          <hr style={{ borderColor: '#243041', margin: '20px 0' }} />
          <h3 className="form-section-title">Create Transformation from Recipe</h3>
          <div className="form-grid">
            <div>
              <label>Process No</label>
              <input value={fromRecipeProcessNo} onChange={(e) => setFromRecipeProcessNo(e.target.value)} placeholder="PROC-NTI-RCP-001" />
            </div>
            <div>
              <label>Recipe</label>
              <select
                value={fromRecipeId}
                onChange={(e) => {
                  const nextRecipeId = e.target.value;
                  setFromRecipeId(nextRecipeId);
                  const recipe = recipes.find((r) => r.id === nextRecipeId);
                  const nextMappings: Record<string, string> = {};
                  for (const line of recipe?.lines ?? []) {
                    nextMappings[line.productId] = '';
                  }
                  setFromRecipeInputBins(nextMappings);
                }}
              >
                <option value="">Pilih recipe</option>
                {recipes.filter((r) => r.isActive).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.recipeCode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Warehouse</label>
              <select value={fromRecipeWarehouseId} onChange={(e) => setFromRecipeWarehouseId(e.target.value)}>
                <option value="">Pilih warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code ?? w.id} - {w.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Output Bin</label>
              <select value={fromRecipeOutputBinId} onChange={(e) => setFromRecipeOutputBinId(e.target.value)}>
                <option value="">Pilih output bin</option>
                {(binsByWarehouse.get(fromRecipeWarehouseId) ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code ?? b.id} - {b.name ?? '-'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Qty Output Target</label>
              <input
                type="number"
                min={0.0001}
                step="any"
                value={fromRecipeQtyOutput}
                onChange={(e) => setFromRecipeQtyOutput(e.target.value)}
              />
            </div>
          </div>
          {selectedRecipe ? (
            <div style={{ marginTop: 12 }}>
              <label className="form-section-title">Input Bins per Recipe Line</label>
              {(selectedRecipe.lines ?? []).map((line, idx) => (
                <div key={`recipe-line-map-${line.productId}-${idx}`} className="form-grid" style={{ marginTop: 8 }}>
                  <div>
                    <label>Bahan #{idx + 1}</label>
                    <input
                      value={`${
                        line.product?.sku ?? line.product?.code ?? line.productId
                      } - ${line.product?.name ?? '-'} (qty/base ${line.qtyPerBase})`}
                      readOnly
                      disabled
                    />
                  </div>
                  <div>
                    <label>Input Bin</label>
                    <select
                      value={fromRecipeInputBins[line.productId] ?? ''}
                      onChange={(e) =>
                        setFromRecipeInputBins((prev) => ({
                          ...prev,
                          [line.productId]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Pilih input bin</option>
                      {(binsByWarehouse.get(fromRecipeWarehouseId) ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code ?? b.id} - {b.name ?? '-'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="row">
            <button type="button" className="btn-secondary" disabled={busy || !!actionBusy} onClick={() => void createTransformationFromRecipe()}>
              Create from Recipe
            </button>
          </div>
        </section>
      )}

      {section === 'transfers' ? (
        <SimpleTable
          title="Internal Transfers"
          columns={[
            { key: 'transferNo', label: 'Transfer No', sortType: 'text' },
            { key: 'status', label: 'Status', sortType: 'text' },
            { key: 'lineCount', label: 'Lines', sortType: 'number' },
            { key: 'createdAt', label: 'Created', sortType: 'date' },
          ]}
          rows={transfers.map(
            (t): SimpleTableRow => ({
              id: t.id,
              transferNo: t.transferNo,
              status: t.status,
              lineCount: t.lines.length,
              createdAt: t.createdAt ?? '',
            }),
          )}
          loading={loading}
        />
      ) : section === 'transformations' ? (
        <SimpleTable
          title="Material Transformations"
          columns={[
            { key: 'processNo', label: 'Process No', sortType: 'text' },
            { key: 'status', label: 'Status', sortType: 'text' },
            { key: 'qtyOutput', label: 'Qty Output', sortType: 'number' },
            { key: 'createdAt', label: 'Created', sortType: 'date' },
          ]}
          rows={transformations.map(
            (t): SimpleTableRow => ({
              id: t.id,
              processNo: t.processNo,
              status: t.status,
              qtyOutput: t.qtyOutput,
              createdAt: t.createdAt ?? '',
            }),
          )}
          loading={loading}
        />
      ) : (
        <SimpleTable
          title="Process Recipes"
          columns={[
            { key: 'recipeCode', label: 'Recipe', sortType: 'text' },
            { key: 'isActive', label: 'Active', sortType: 'text' },
            { key: 'baseOutputQty', label: 'Base Output', sortType: 'number' },
            { key: 'lineCount', label: 'Lines', sortType: 'number' },
            { key: 'updatedAt', label: 'Updated', sortType: 'date' },
          ]}
          rows={recipes.map(
            (r): SimpleTableRow => ({
              id: r.id,
              recipeCode: r.recipeCode,
              isActive: r.isActive ? 'YES' : 'NO',
              baseOutputQty: r.baseOutputQty,
              lineCount: r.lines.length,
              updatedAt: r.updatedAt ?? '',
            }),
          )}
          loading={loading}
        />
      )}
    </>
  );
}
