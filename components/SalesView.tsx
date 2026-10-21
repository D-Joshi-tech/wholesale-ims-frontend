"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, RefreshCw, Trash2, Calendar, Printer, CheckCircle2, AlertTriangle, Eye, X } from "lucide-react";
import { getJson, postJson } from "@/lib/api";

type SaleRecord = {
  id: number;
  invoice_number: string;
  customer: string;
  invoice_date: string;
  tax_mode: string;
  subtotal: number;
  tax_total: number;
  grand_total: number;
};

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  gstin: string | null;
  address: string | null;
};

type Product = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  selling_price: string;
  gst_rate: string;
  stock_quantity: string;
};

type SaleLineItem = {
  product_id: number;
  quantity: number;
  unit_price: number;
  gst_rate: number;
};

const currency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);

export function SalesView({ onStockUpdated }: { onStockUpdated?: () => void }) {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Invoice view / print modal
  const [previewSale, setPreviewSale] = useState<SaleRecord | null>(null);

  // Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<number | "">(""); // empty string = Walk-in
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [taxMode, setTaxMode] = useState<"gst" | "non_gst">("gst");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<SaleLineItem[]>([
    { product_id: 0, quantity: 1, unit_price: 0, gst_rate: 0 },
  ]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [salesData, customersData, productsData] = await Promise.all([
        getJson<SaleRecord[]>("/api/sales"),
        getJson<Customer[]>("/api/parties?party_type=customer"),
        getJson<Product[]>("/api/products"),
      ]);
      setSales(salesData);
      setCustomers(customersData);
      setProducts(productsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sales records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function handleOpenForm() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setInvoiceNumber(`INV-${todayStr.replace(/-/g, "")}-${randomSuffix}`);
    setCustomerId("");
    setInvoiceDate(todayStr);
    setTaxMode("gst");
    setNotes("");
    if (products.length > 0) {
      setLines([
        {
          product_id: products[0].id,
          quantity: 1,
          unit_price: Number(products[0].selling_price),
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
      unit_price: prod ? Number(prod.selling_price) : 0,
      gst_rate: prod ? Number(prod.gst_rate) : 0,
    };
    setLines(updated);
  }

  function handleLineChange(index: number, field: keyof SaleLineItem, value: number) {
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
          unit_price: Number(products[0].selling_price),
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

    // Check for negative or missing line items
    for (const l of lines) {
      if (!l.product_id || l.quantity <= 0) {
        setError("Please choose a valid product and ensure quantity is above 0.");
        return;
      }
      const prod = products.find((p) => p.id === l.product_id);
      if (prod && Number(prod.stock_quantity) < l.quantity) {
        setError(`Insufficient stock for ${prod.name}. Available: ${prod.stock_quantity} ${prod.unit}`);
        return;
      }
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        invoice_number: invoiceNumber.trim(),
        customer_id: customerId === "" ? null : Number(customerId),
        invoice_date: invoiceDate,
        tax_mode: taxMode,
        notes: notes.trim() || null,
        lines: lines.map((l) => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          gst_rate: taxMode === "gst" ? Number(l.gst_rate) : 0,
        })),
      };
      await postJson("/api/sales", payload);

      setSuccess(`Invoice #${invoiceNumber} generated successfully. Stock deducted.`);
      setShowForm(false);
      await loadData();
      if (onStockUpdated) onStockUpdated();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating invoice");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Sales & Invoicing</h2>
          <p className="mt-1 text-sm text-slate-500">
            Generate GST tax invoices, record sales, and automatically deduct stock.
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
            <Plus size={17} /> Create Bill / Invoice
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

      {/* Invoice Form */}
      {showForm && (
        <section className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md">
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">New Sales Bill</h3>
              <p className="text-xs text-slate-500">
                Outward bill generation with automatic warehouse stock deduction.
              </p>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm font-medium text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice # <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-001"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Customer
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Walk-in / Cash Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gstin ? `(${c.gstin})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
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
                  <option value="gst">GST Tax Invoice</option>
                  <option value="non_gst">Non-GST / Cash Bill</option>
                </select>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Billed Items ({lines.length})
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
                  const selectedProduct = products.find((p) => p.id === line.product_id);
                  const availableStock = selectedProduct ? Number(selectedProduct.stock_quantity) : 0;
                  const isStockInsufficient = selectedProduct && availableStock < line.quantity;

                  const lineBase = line.quantity * line.unit_price;
                  const lineTax = taxMode === "gst" ? lineBase * (line.gst_rate / 100) : 0;
                  const total = lineBase + lineTax;

                  return (
                    <div
                      key={idx}
                      className={`grid gap-3 sm:grid-cols-12 items-end p-3 rounded-lg border ${
                        isStockInsufficient
                          ? "bg-red-50/50 border-red-200"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
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
                              {p.name} ({p.sku}) — Avail: {p.stock_quantity} {p.unit}
                            </option>
                          ))}
                        </select>
                        {selectedProduct && (
                          <div className={`mt-1 text-[11px] ${isStockInsufficient ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                            {isStockInsufficient
                              ? `⚠️ Stock insufficient! Only ${availableStock} ${selectedProduct.unit} available.`
                              : `Available stock: ${availableStock} ${selectedProduct.unit}`}
                          </div>
                        )}
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
                          className={`h-9 w-full rounded-md border bg-white px-2.5 text-sm outline-none ${
                            isStockInsufficient ? "border-red-400 focus:ring-red-100" : "border-slate-300"
                          }`}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Rate / Price (₹)
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
                  Payment / Bill Remarks
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Terms of payment, delivery vehicle number, or reference..."
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
                  <span className="text-emerald-700">{currency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? "Generating Invoice..." : "Confirm & Create Invoice"}
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

      {/* Sales Invoices List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">Invoice #</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Tax Mode</th>
                <th className="pb-3 text-right font-semibold">Tax</th>
                <th className="pb-3 text-right font-semibold">Grand Total</th>
                <th className="pb-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading sales invoices...
                  </td>
                </tr>
              )}
              {!loading && sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-2">
                      <FileText size={22} />
                    </div>
                    No sales invoices recorded yet. Click &quot;Create Bill / Invoice&quot; to issue your first bill.
                  </td>
                </tr>
              )}
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition">
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs">
                        <FileText size={15} />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">{s.invoice_number}</span>
                        <div className="text-xs text-slate-400">Bill ID #{s.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-600 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>{s.invoice_date}</span>
                    </div>
                  </td>
                  <td className="py-3.5 font-medium text-slate-800">{s.customer}</td>
                  <td className="py-3.5">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${
                        s.tax_mode === "gst" ? "bg-purple-50 text-purple-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {s.tax_mode === "gst" ? "GST" : "Non-GST"}
                    </span>
                  </td>
                  <td className="py-3.5 text-right text-slate-600">{currency(s.tax_total)}</td>
                  <td className="py-3.5 text-right font-bold text-slate-900">{currency(s.grand_total)}</td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => setPreviewSale(s)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                    >
                      <Eye size={13} /> View / Print
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invoice Printable Preview Modal */}
      {previewSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tax Invoice Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                >
                  <Printer size={14} /> Print Bill
                </button>
                <button
                  onClick={() => setPreviewSale(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="space-y-5 print:p-8">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h1 className="text-xl font-black text-blue-950">Wholesale Desk</h1>
                  <p className="text-xs text-slate-500">Inventory & Billing Warehouse</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-800">
                    {previewSale.tax_mode === "gst" ? "TAX INVOICE" : "BILL OF SUPPLY"}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{previewSale.invoice_number}</div>
                  <div className="text-xs text-slate-500">Date: {previewSale.invoice_date}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100">
                  <div className="font-semibold text-slate-400 uppercase text-[10px] mb-1">Billed To</div>
                  <div className="font-bold text-sm text-slate-800">{previewSale.customer}</div>
                  <div className="text-slate-500 mt-0.5">Mode: {previewSale.tax_mode.toUpperCase()}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 text-right">
                  <div className="font-semibold text-slate-400 uppercase text-[10px] mb-1">Invoice Amount</div>
                  <div className="text-lg font-black text-emerald-700">{currency(previewSale.grand_total)}</div>
                  <div className="text-slate-500 text-[11px]">Paid / Confirmed</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{currency(previewSale.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax Total ({previewSale.tax_mode === "gst" ? "GST" : "Exempt"}):</span>
                  <span className="font-semibold">{currency(previewSale.tax_total)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Amount Due:</span>
                  <span className="text-emerald-700">{currency(previewSale.grand_total)}</span>
                </div>
              </div>

              <div className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-100">
                Thank you for your business! This is a computer generated invoice.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
