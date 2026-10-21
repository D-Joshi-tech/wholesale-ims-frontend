"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Plus, RefreshCw, Trash2, Calendar, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { getJson, postJson } from "@/lib/api";

type PurchaseRecord = {
  id: number;
  document_number: string;
  supplier: string;
  document_date: string;
  tax_mode: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
};

type Supplier = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  purchase_price: string;
  gst_rate: string;
  stock_quantity: string;
};

type PurchaseLineItem = {
  product_id: number;
  quantity: number;
  unit_price: number;
  gst_rate: number;
};

const currency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);

export function PurchasesView({ onStockUpdated }: { onStockUpdated?: () => void }) {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const [documentNumber, setDocumentNumber] = useState("");
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [documentDate, setDocumentDate] = useState(todayStr);
  const [taxMode, setTaxMode] = useState<"gst" | "non_gst">("gst");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLineItem[]>([
    { product_id: 0, quantity: 1, unit_price: 0, gst_rate: 0 },
  ]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [purchasesData, suppliersData, productsData] = await Promise.all([
        getJson<PurchaseRecord[]>("/api/purchases"),
        getJson<Supplier[]>("/api/parties?party_type=supplier"),
        getJson<Product[]>("/api/products"),
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleOpenForm() {
    // Generate draft document number
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setDocumentNumber(`PUR-${todayStr.replace(/-/g, "")}-${randomSuffix}`);
    setSupplierId(suppliers.length > 0 ? suppliers[0].id : "");
    setDocumentDate(todayStr);
    setTaxMode("gst");
    setNotes("");
    if (products.length > 0) {
      setLines([
        {
          product_id: products[0].id,
          quantity: 1,
          unit_price: Number(products[0].purchase_price),
          gst_rate: Number(products[0].gst_rate),
        },
      ]);
    } else {
      setLines([{ product_id: 0, quantity: 1, unit_price: 0, gst_rate: 0 }]);
    }
    setError("");
    setShowForm(true);
  }

  function handleProductChange(index: number, productId: number) {
    const prod = products.find((p) => p.id === productId);
    const updated = [...lines];
    updated[index] = {
      product_id: productId,
      quantity: updated[index]?.quantity || 1,
      unit_price: prod ? Number(prod.purchase_price) : 0,
      gst_rate: prod ? Number(prod.gst_rate) : 0,
    };
    setLines(updated);
  }

  function handleLineChange(index: number, field: keyof PurchaseLineItem, value: number) {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  }

  function addLine() {
    if (products.length > 0) {
      setLines([
        ...lines,
        {
          product_id: products[0].id,
          quantity: 1,
          unit_price: Number(products[0].purchase_price),
          gst_rate: Number(products[0].gst_rate),
        },
      ]);
    } else {
      setLines([...lines, { product_id: 0, quantity: 1, unit_price: 0, gst_rate: 0 }]);
    }
  }

  function removeLine(index: number) {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  }

  // Totals Calculation
  const subtotal = lines.reduce((sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0), 0);
  const taxTotal = lines.reduce((sum, item) => {
    if (taxMode !== "gst") return sum;
    const base = (item.quantity || 0) * (item.unit_price || 0);
    return sum + base * ((item.gst_rate || 0) / 100);
  }, 0);
  const grandTotal = subtotal + taxTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      setError("Please select a valid supplier.");
      return;
    }
    if (lines.some((l) => !l.product_id || l.quantity <= 0)) {
      setError("Please ensure all items have a selected product and a quantity greater than 0.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        document_number: documentNumber.trim(),
        supplier_id: Number(supplierId),
        document_date: documentDate,
        tax_mode: taxMode,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          gst_rate: taxMode === "gst" ? Number(l.gst_rate) : 0,
        })),
      };
      await postJson("/api/purchases", payload);

      setSuccess(`Purchase Bill #${documentNumber} saved. Warehouse stock updated.`);
      setShowForm(false);
      await loadData();
      if (onStockUpdated) onStockUpdated();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error recording purchase");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Purchases & Inward Stock</h2>
          <p className="mt-1 text-sm text-slate-500">
            Record supplier bills, goods inward, and auto-increase warehouse inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenForm}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 transition"
          >
            <Plus size={17} /> Record Purchase
          </button>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* New Purchase Modal / Card */}
      {showForm && (
        <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Record Inward Purchase</h3>
              <p className="text-xs text-slate-500">Enter bill details and products received from supplier.</p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Top Details */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document / Bill # <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="e.g. PUR-2026-001"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Supplier <span className="text-red-500">*</span>
                </label>
                {suppliers.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    No suppliers found. Please add a supplier first from the Suppliers tab.
                  </div>
                ) : (
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(Number(e.target.value))}
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (ID: #{s.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Document Date
                </label>
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tax Mode
                </label>
                <select
                  value={taxMode}
                  onChange={(e) => setTaxMode(e.target.value as "gst" | "non_gst")}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="gst">GST Invoice</option>
                  <option value="non_gst">Non-GST / Exempt</option>
                </select>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Received Items ({lines.length})
                </span>
                <button
                  type="button"
                  onClick={addLine}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800"
                >
                  <Plus size={15} /> Add Line Item
                </button>
              </div>

              <div className="p-4 space-y-3">
                {lines.map((line, idx) => {
                  const lineBase = line.quantity * line.unit_price;
                  const lineTax = taxMode === "gst" ? lineBase * (line.gst_rate / 100) : 0;
                  const total = lineBase + lineTax;

                  return (
                    <div
                      key={idx}
                      className="grid gap-3 sm:grid-cols-12 items-end bg-slate-50/60 p-3 rounded-lg border border-slate-200"
                    >
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Product
                        </label>
                        <select
                          value={line.product_id}
                          onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm outline-none"
                        >
                          <option value={0}>Select a product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) — Stock: {p.stock_quantity} {p.unit}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={line.quantity}
                          onChange={(e) => handleLineChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Unit Cost (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) => handleLineChange(idx, "unit_price", parseFloat(e.target.value) || 0)}
                          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm outline-none"
                        />
                      </div>

                      {taxMode === "gst" && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            GST (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={line.gst_rate}
                            onChange={(e) => handleLineChange(idx, "gst_rate", parseFloat(e.target.value) || 0)}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm outline-none"
                          />
                        </div>
                      )}

                      <div className={taxMode === "gst" ? "sm:col-span-1" : "sm:col-span-3"}>
                        <div className="text-xs font-medium text-slate-500 mb-1">Total</div>
                        <div className="h-9 flex items-center font-semibold text-slate-800 text-sm">
                          {currency(total)}
                        </div>
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lines.length === 1}
                          className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                          title="Remove line"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes & Summary */}
            <div className="grid gap-6 sm:grid-cols-2 items-start">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Internal Remarks / Delivery Note
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes regarding batch, transporter, or payment terms..."
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{currency(subtotal)}</span>
                </div>
                {taxMode === "gst" && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>GST (Tax Total)</span>
                    <span>{currency(taxTotal)}</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-blue-700">{currency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || suppliers.length === 0}
                className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? "Saving & Updating Stock..." : "Confirm & Save Purchase"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Purchases List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Document #</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Supplier</th>
                <th className="pb-3 font-semibold">Tax Mode</th>
                <th className="pb-3 text-right font-semibold">Tax</th>
                <th className="pb-3 text-right font-semibold">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading purchases...
                  </td>
                </tr>
              )}
              {!loading && purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-2">
                      <ShoppingCart size={22} />
                    </div>
                    No purchase records yet. Click &quot;Record Purchase&quot; to bring in stock.
                  </td>
                </tr>
              )}
              {purchases.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        <FileText size={15} />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">{p.document_number}</span>
                        <div className="text-xs text-slate-400">Entry #{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-600 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{p.document_date}</span>
                    </div>
                  </td>
                  <td className="py-3.5 font-medium text-slate-800">{p.supplier}</td>
                  <td className="py-3.5">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                        p.tax_mode === "gst" ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.tax_mode === "gst" ? "GST" : "Non-GST"}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-slate-600">{currency(p.tax_total)}</td>
                  <td className="py-3.5 text-right font-bold text-slate-900">{currency(p.grand_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
