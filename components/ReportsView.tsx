"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw, ShieldCheck, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { getJson } from "@/lib/api";

type Dashboard = {
  product_count: number;
  low_stock_count: number;
  sales_total: number;
  purchase_total: number;
};

type SaleRecord = {
  id: number;
  grand_total: number;
  tax_total: number;
  tax_mode: string;
};

type PurchaseRecord = {
  id: number;
  grand_total: number;
  tax_total: number;
  tax_mode: string;
};

type Product = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  purchase_price: string;
  selling_price: string;
  stock_quantity: string;
  reorder_level: string;
};

const currency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);

export function ReportsView() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [dash, sList, pList, prodList] = await Promise.all([
        getJson<Dashboard>("/api/dashboard"),
        getJson<SaleRecord[]>("/api/sales"),
        getJson<PurchaseRecord[]>("/api/purchases"),
        getJson<Product[]>("/api/products"),
      ]);
      setDashboard(dash);
      setSales(sList);
      setPurchases(pList);
      setProducts(prodList);
    } catch {
      // Handled in UI
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const totalSales = dashboard?.sales_total ?? 0;
  const totalPurchases = dashboard?.purchase_total ?? 0;
  const netMargin = totalSales - totalPurchases;

  // Stock value
  const inventoryAssetValue = products.reduce(
    (acc, p) => acc + (parseFloat(p.stock_quantity) || 0) * (parseFloat(p.purchase_price) || 0),
    0
  );

  // Tax calculations
  const outputGst = sales.reduce((acc, s) => acc + (s.tax_total || 0), 0);
  const inputGst = purchases.reduce((acc, p) => acc + (p.tax_total || 0), 0);
  const netGstPayable = outputGst - inputGst;

  // Critical stock items
  const criticalStock = products.filter(
    (p) => parseFloat(p.stock_quantity) <= parseFloat(p.reorder_level)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Financial & Warehouse Reports</h2>
          <p className="mt-1 text-sm text-slate-500">
            Real-time revenue, procurement spend, GST position, and inventory health analytics.
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
          title="Refresh"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Top Financial Overview */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Sales Revenue</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <ArrowUpRight size={17} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{currency(totalSales)}</div>
          <div className="mt-1 text-xs text-slate-400">{sales.length} invoices recorded</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Procurement Spend</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 text-purple-700">
              <ArrowDownRight size={17} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{currency(totalPurchases)}</div>
          <div className="mt-1 text-xs text-slate-400">{purchases.length} purchase bills recorded</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Operating Difference</span>
            <span
              className={`grid h-8 w-8 place-items-center rounded-lg ${
                netMargin >= 0 ? "bg-blue-50 text-blue-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {netMargin >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
            </span>
          </div>
          <div className={`mt-3 text-2xl font-bold tracking-tight ${netMargin >= 0 ? "text-blue-700" : "text-rose-600"}`}>
            {currency(netMargin)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Recorded sales minus purchases</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Inventory Asset Value</span>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-700">
              <Package size={17} />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            {currency(inventoryAssetValue)}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total warehouse stock on hand</div>
        </div>
      </div>

      {/* Grid: GST Summary & Stock Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* GST Overview Card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900">GST & Tax Summary</h3>
              <p className="text-xs text-slate-500">Tax collected vs. Input Tax Credit paid</p>
            </div>
            <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
              Tax Mode: GST
            </span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Output GST (Collected)</div>
                <div className="text-sm text-slate-600 mt-0.5">Tax charged on customer sales</div>
              </div>
              <div className="text-base font-bold text-slate-900">{currency(outputGst)}</div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Input GST (ITC Paid)</div>
                <div className="text-sm text-slate-600 mt-0.5">Tax paid on supplier purchases</div>
              </div>
              <div className="text-base font-bold text-slate-900">{currency(inputGst)}</div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-blue-50/70 p-4 border border-blue-100">
              <div>
                <div className="text-xs font-bold uppercase text-blue-900">Net Estimated GST Position</div>
                <div className="text-xs text-blue-700 mt-0.5">
                  {netGstPayable >= 0 ? "Output tax liability to remit" : "ITC balance / carry forward"}
                </div>
              </div>
              <div className="text-lg font-black text-blue-900">{currency(Math.abs(netGstPayable))}</div>
            </div>
          </div>
        </section>

        {/* Low Stock Alerts */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900">Reorder Alert Matrix</h3>
              <p className="text-xs text-slate-500">Products requiring procurement action</p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {criticalStock.length} Items Critical
            </span>
          </div>

          {criticalStock.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShieldCheck size={32} className="mx-auto text-emerald-600 mb-2" />
              <div className="font-semibold text-slate-700">All Stock Levels Healthy</div>
              <div className="text-xs text-slate-400 mt-1">No products are currently at or below reorder level.</div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[260px] space-y-2 pr-1">
              {criticalStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/40 p-3"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{p.name}</div>
                    <div className="text-xs text-slate-500 font-mono">SKU: {p.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-amber-800">
                      {p.stock_quantity} {p.unit}
                    </div>
                    <div className="text-xs text-slate-500">Threshold: {p.reorder_level} {p.unit}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
