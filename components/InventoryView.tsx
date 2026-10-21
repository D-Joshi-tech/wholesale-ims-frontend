"use client";

import { useEffect, useState } from "react";
import { Boxes, RefreshCw, Search, ArrowUpRight, ArrowDownRight, History } from "lucide-react";
import { getJson } from "@/lib/api";

type Product = {
  id: number;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  purchase_price: string;
  selling_price: string;
  gst_rate: string;
  stock_quantity: string;
  reorder_level: string;
};

type Movement = {
  id: number;
  product: string;
  sku: string;
  movement_type: string;
  quantity_change: number;
  reference: string | null;
  created_at: string;
};

const currency = (val: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(val);

export function InventoryView() {
  const [tab, setTab] = useState<"live" | "movements">("live");
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [movementFilter, setMovementFilter] = useState<string>("all");

  async function loadData() {
    setLoading(true);
    try {
      const [prods, moves] = await Promise.all([
        getJson<Product[]>("/api/products"),
        getJson<Movement[]>("/api/inventory/movements"),
      ]);
      setProducts(prods);
      setMovements(moves);
    } catch {
      // Handled in UI
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Summary Metrics
  const totalItems = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (parseFloat(p.stock_quantity) || 0), 0);
  const totalValuation = products.reduce(
    (acc, p) => acc + (parseFloat(p.stock_quantity) || 0) * (parseFloat(p.purchase_price) || 0),
    0
  );
  const lowStockCount = products.filter(
    (p) => parseFloat(p.stock_quantity) <= parseFloat(p.reorder_level)
  ).length;

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(search.toLowerCase()));

    const qty = parseFloat(p.stock_quantity);
    const reorder = parseFloat(p.reorder_level);

    if (stockFilter === "low") return matchesSearch && qty > 0 && qty <= reorder;
    if (stockFilter === "out") return matchesSearch && qty <= 0;
    return matchesSearch;
  });

  // Filtered Movements
  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      m.product.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.reference && m.reference.toLowerCase().includes(search.toLowerCase()));

    if (movementFilter !== "all") return matchesSearch && m.movement_type === movementFilter;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Inventory & Stock Ledger</h2>
          <p className="mt-1 text-sm text-slate-500">
            Real-time warehouse balance, valuation, and complete movement audit trail.
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total SKUs</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{totalItems}</div>
          <div className="mt-1 text-xs text-slate-400">Catalogue items</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Total Stock Units</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {totalStockUnits.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
          </div>
          <div className="mt-1 text-xs text-slate-400">Total physical units in warehouse</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Inventory Valuation</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-blue-700">
            {currency(totalValuation)}
          </div>
          <div className="mt-1 text-xs text-slate-400">At purchase cost value</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Low Stock Alerts</div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-amber-600">{lowStockCount}</div>
          <div className="mt-1 text-xs text-slate-400">Below threshold level</div>
        </div>
      </div>

      {/* Tab Switcher & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("live")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "live" ? "bg-blue-700 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Boxes size={16} /> Live Stock Status
          </button>
          <button
            onClick={() => setTab("movements")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === "movements"
                ? "bg-blue-700 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <History size={16} /> Stock Movement Audit ({movements.length})
          </button>
        </div>

        {tab === "live" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Filter:</span>
            {(["all", "low", "out"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setStockFilter(mode)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                  stockFilter === mode
                    ? "bg-slate-800 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {mode === "all" ? "All Products" : mode === "low" ? "Low Stock" : "Out of Stock"}
              </button>
            ))}
          </div>
        )}

        {tab === "movements" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Type:</span>
            {["all", "purchase", "sale", "opening"].map((t) => (
              <button
                key={t}
                onClick={() => setMovementFilter(t)}
                className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                  movementFilter === t
                    ? "bg-slate-800 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Search size={17} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "live" ? "Search product name, SKU, or category..." : "Search movements by product, SKU, or doc #..."
            }
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </div>

        {tab === "live" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-3 font-semibold">Product</th>
                  <th className="pb-3 font-semibold">SKU</th>
                  <th className="pb-3 font-semibold">Unit Price</th>
                  <th className="pb-3 text-right font-semibold">In Stock</th>
                  <th className="pb-3 text-right font-semibold">Threshold</th>
                  <th className="pb-3 text-right font-semibold">Stock Value</th>
                  <th className="pb-3 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading stock levels...
                    </td>
                  </tr>
                )}
                {!loading && filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No matching products found.
                    </td>
                  </tr>
                )}
                {filteredProducts.map((p) => {
                  const qty = parseFloat(p.stock_quantity);
                  const reorder = parseFloat(p.reorder_level);
                  const cost = parseFloat(p.purchase_price);
                  const value = qty * cost;

                  let badge = (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      In Stock
                    </span>
                  );
                  if (qty <= 0) {
                    badge = (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                        Out of Stock
                      </span>
                    );
                  } else if (qty <= reorder) {
                    badge = (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        Low Stock
                      </span>
                    );
                  }

                  return (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition">
                      <td className="py-3.5">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-400">{p.category || "Uncategorised"}</div>
                      </td>
                      <td className="py-3.5 text-slate-500 font-mono text-xs">{p.sku}</td>
                      <td className="py-3.5 text-slate-700">{currency(cost)}</td>
                      <td className="py-3.5 text-right font-bold text-slate-900">
                        {p.stock_quantity} {p.unit}
                      </td>
                      <td className="py-3.5 text-right text-slate-500 text-xs">
                        {p.reorder_level} {p.unit}
                      </td>
                      <td className="py-3.5 text-right font-semibold text-blue-700">{currency(value)}</td>
                      <td className="py-3.5 text-right">{badge}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "movements" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold">Product</th>
                  <th className="pb-3 font-semibold">Movement Type</th>
                  <th className="pb-3 font-semibold">Reference Document</th>
                  <th className="pb-3 text-right font-semibold">Quantity Change</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading movement ledger...
                    </td>
                  </tr>
                )}
                {!loading && filteredMovements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                )}
                {filteredMovements.map((m) => {
                  const isPositive = m.quantity_change > 0;
                  const dateStr = new Date(m.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition">
                      <td className="py-3.5 text-xs text-slate-500">{dateStr}</td>
                      <td className="py-3.5">
                        <div className="font-semibold text-slate-800">{m.product}</div>
                        <div className="text-xs text-slate-400 font-mono">{m.sku}</div>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold capitalize ${
                            m.movement_type === "purchase"
                              ? "bg-emerald-50 text-emerald-700"
                              : m.movement_type === "sale"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {m.movement_type === "purchase" && <ArrowDownRight size={13} />}
                          {m.movement_type === "sale" && <ArrowUpRight size={13} />}
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs font-mono font-medium text-slate-700">
                        {m.reference || "—"}
                      </td>
                      <td className="py-3.5 text-right font-bold text-sm">
                        <span className={isPositive ? "text-emerald-700" : "text-rose-700"}>
                          {isPositive ? `+${m.quantity_change}` : m.quantity_change}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
