"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, Boxes, FileText,
  BarChart3, Search, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Plus, RefreshCw, Shield, LogOut
} from "lucide-react";
import { API_URL, getJson, getToken, getStoredUser, clearSession, AuthUser, fetchCurrentUser } from "@/lib/api";
import { PartiesView } from "@/components/PartiesView";
import { PurchasesView } from "@/components/PurchasesView";
import { SalesView } from "@/components/SalesView";
import { InventoryView } from "@/components/InventoryView";
import { ReportsView } from "@/components/ReportsView";
import { LoginView } from "@/components/LoginView";
import { UserManagementView } from "@/components/UserManagementView";

type Dashboard = { product_count: number; low_stock_count: number; sales_total: number; purchase_total: number };
type Product = { id: number; sku: string; name: string; category: string | null; unit: string; purchase_price: string; selling_price: string; gst_rate: string; stock_quantity: string; reorder_level: string };

const baseNav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Products", icon: Package },
  { label: "Customers", icon: Users },
  { label: "Suppliers", icon: Truck },
  { label: "Purchases", icon: ShoppingCart },
  { label: "Sales & Bills", icon: FileText },
  { label: "Inventory", icon: Boxes },
  { label: "Reports", icon: BarChart3 },
];

const currency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

export default function Home() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [active, setActive] = useState("Dashboard");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ sku: "", name: "", category: "", unit: "pcs", purchase_price: "0", selling_price: "0", gst_rate: "0", opening_stock: "0", reorder_level: "0" });

  // Initial Auth Check
  useEffect(() => {
    const user = getStoredUser();
    const token = getToken();
    if (user && token) {
      setCurrentUser(user);
      void fetchCurrentUser()
        .then(setCurrentUser)
        .catch(() => undefined);
    }
    setAuthChecking(false);

    const handleLogout = () => {
      setCurrentUser(null);
    };
    window.addEventListener("ims_auth_logout", handleLogout);
    return () => window.removeEventListener("ims_auth_logout", handleLogout);
  }, []);

  async function refresh() {
    if (!getToken()) return;
    setLoading(true); setError("");
    try {
      const [d, p] = await Promise.all([
        getJson<Dashboard>("/api/dashboard"),
        getJson<Product[]>(`/api/products?search=${encodeURIComponent(search)}`)
      ]);
      setDashboard(d); setProducts(p);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load data";
      setError(msg);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (currentUser) {
      void refresh();
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      void getJson<Product[]>(`/api/products?search=${encodeURIComponent(search)}`)
        .then(setProducts)
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, currentUser]);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_URL}/api/products`, {
        method: "POST", headers, body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "Could not save product");
      setShowForm(false);
      setForm({ sku: "", name: "", category: "", unit: "pcs", purchase_price: "0", selling_price: "0", gst_rate: "0", opening_stock: "0", reorder_level: "0" });
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save product"); }
    finally { setSaving(false); }
  }

  function handleSignOut() {
    clearSession();
    setCurrentUser(null);
  }

  // 1. Loading splash while checking local token
  if (authChecking) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-widest text-slate-500">Checking credentials...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render Whitelist / Google Login
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          void refresh();
        }}
      />
    );
  }

  // Build navigation items dynamically based on role
  const nav = [...baseNav];
  if (currentUser.role === "admin") {
    nav.push({ label: "Users & Access", icon: Shield });
  }

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar */}
      <aside className="flex w-full flex-col bg-[#102d72] text-white md:fixed md:inset-y-0 md:w-[248px]">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-lg font-black text-blue-900">W</div>
          <div><div className="text-lg font-bold tracking-wide">Wholesale Desk</div><div className="text-xs text-blue-200">Inventory & billing</div></div>
        </div>
        <div className="px-4 py-5 text-xs font-semibold uppercase tracking-[.16em] text-blue-300">Workspace</div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 md:flex-col">
          {nav.map(item => {
            const Icon = item.icon; const selected = active === item.label;
            return <button key={item.label} onClick={() => setActive(item.label)} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition ${selected ? "bg-white text-blue-900 shadow font-semibold" : "text-blue-100 hover:bg-white/10"}`}>
              <Icon size={18}/><span>{item.label}</span>{selected && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-700"/>}
            </button>;
          })}
        </nav>
        <div className="mt-auto hidden p-4 md:block">
          <div className="rounded-xl border border-white/15 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TLS / Whitelist Active</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-200 font-mono truncate">
              {currentUser.email}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 md:ml-[248px] bg-slate-50 min-h-screen">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
          <div>
            <div className="text-xs text-slate-500">Workspace / {active}</div>
            <h1 className="mt-1 text-xl font-bold text-slate-900">{active === "Dashboard" ? "Business overview" : active}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void refresh()} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" title="Refresh">
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>

            {/* User Profile & Sign Out */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="flex items-center gap-2.5">
                {currentUser.picture ? (
                  <img src={currentUser.picture} alt="" className="w-9 h-9 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : currentUser.email[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name || currentUser.email.split("@")[0]}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                      currentUser.role === "admin"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                        : currentUser.role === "manager"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
                title="Sign out of Wholesale IMS"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-5 md:p-8">
          {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertTriangle size={18} className="mt-0.5 shrink-0"/><div>{error}</div></div>}

          {active === "Dashboard" && <>
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold tracking-tight">Good day 👋</h2><p className="mt-1 text-sm text-slate-500">Here&apos;s what&apos;s happening in your warehouse.</p></div><button onClick={() => { setActive("Products"); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"><Plus size={17}/> Add product</button></div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric title="Active products" value={dashboard?.product_count ?? "—"} note="In your catalogue" icon={<Package size={19}/>} tone="blue"/>
              <Metric title="Low stock items" value={dashboard?.low_stock_count ?? "—"} note="At or below reorder level" icon={<AlertTriangle size={19}/>} tone="amber"/>
              <Metric title="Recorded sales" value={dashboard ? currency(dashboard.sales_total) : "—"} note="All recorded invoices" icon={<ArrowUpRight size={19}/>} tone="green"/>
              <Metric title="Recorded purchases" value={dashboard ? currency(dashboard.purchase_total) : "—"} note="All purchase documents" icon={<ArrowDownRight size={19}/>} tone="violet"/>
            </div>
            <div className="mt-7 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold">Product inventory</h3><p className="mt-1 text-sm text-slate-500">Current stock across your catalogue</p></div><button onClick={() => setActive("Products")} className="text-sm font-semibold text-blue-700 hover:underline">View all</button></div>
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={17} className="text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product name or SKU..." className="h-10 w-full bg-transparent text-sm outline-none"/></div>
                <ProductTable products={products.slice(0, 6)} loading={loading}/>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-bold">Quick actions</h3><p className="mt-1 text-sm text-slate-500">Common warehouse tasks</p>
                <div className="mt-5 space-y-3">
                  <QuickAction icon={<Package size={18}/>} title="Add a product" description="Create a catalogue item" onClick={() => { setActive("Products"); setShowForm(true); }}/>
                  <QuickAction icon={<Truck size={18}/>} title="Add a supplier" description="Save supplier contact details" onClick={() => setActive("Suppliers")}/>
                  <QuickAction icon={<ShoppingCart size={18}/>} title="Record a purchase" description="Receive stock into warehouse" onClick={() => setActive("Purchases")}/>
                  <QuickAction icon={<FileText size={18}/>} title="Create a bill" description="Record a customer sale" onClick={() => setActive("Sales & Bills")}/>
                </div>
                <div className="mt-6 rounded-xl bg-blue-50 p-4"><div className="text-sm font-semibold text-blue-900">Wholesale Desk Protected</div><p className="mt-1 text-xs leading-5 text-blue-800">Only authorized emails in your PostgreSQL whitelist can access this system.</p></div>
              </section>
            </div>
          </>}

          {active === "Products" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Products</h2><p className="mt-1 text-sm text-slate-500">Manage SKUs, pricing, tax rates and stock levels.</p></div><button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17}/> Add product</button></div>
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={17} className="text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or SKU" className="h-10 w-full bg-transparent text-sm outline-none"/></div>
            {showForm && <form onSubmit={createProduct} className="mb-6 grid gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="SKU / Product code" value={form.sku} onChange={v => setForm({...form, sku:v})} required/>
              <Field label="Product name" value={form.name} onChange={v => setForm({...form, name:v})} required/>
              <Field label="Category" value={form.category} onChange={v => setForm({...form, category:v})}/>
              <Field label="Unit (pcs, box, kg...)" value={form.unit} onChange={v => setForm({...form, unit:v})} required/>
              <Field label="Purchase price (₹)" type="number" value={form.purchase_price} onChange={v => setForm({...form, purchase_price:v})} required/>
              <Field label="Selling price (₹)" type="number" value={form.selling_price} onChange={v => setForm({...form, selling_price:v})} required/>
              <Field label="GST rate (%)" type="number" value={form.gst_rate} onChange={v => setForm({...form, gst_rate:v})} required/>
              <Field label="Opening stock" type="number" value={form.opening_stock} onChange={v => setForm({...form, opening_stock:v})} required/>
              <Field label="Low-stock threshold" type="number" value={form.reorder_level} onChange={v => setForm({...form, reorder_level:v})} required/>
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3"><button disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save product"}</button><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Cancel</button></div>
            </form>}
            <ProductTable products={products} loading={loading}/>
          </section>}

          {active === "Customers" && <PartiesView partyType="customer" />}
          {active === "Suppliers" && <PartiesView partyType="supplier" />}
          {active === "Purchases" && <PurchasesView onStockUpdated={refresh} />}
          {active === "Sales & Bills" && <SalesView onStockUpdated={refresh} />}
          {active === "Inventory" && <InventoryView />}
          {active === "Reports" && <ReportsView />}
          {active === "Users & Access" && currentUser.role === "admin" && (
            <UserManagementView currentUser={currentUser} />
          )}

          <footer className="mt-8 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
            <span>Wholesale Desk · Protected Whitelist Access</span>
            <span>TLS Encryption & Role-Based Authorization</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Metric({ title, value, note, icon, tone }: { title:string; value:string|number; note:string; icon:React.ReactNode; tone:string }) {
  const colors: Record<string,string> = { blue:"bg-blue-50 text-blue-700", amber:"bg-amber-50 text-amber-700", green:"bg-emerald-50 text-emerald-700", violet:"bg-violet-50 text-violet-700" };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-500">{title}</span><span className={`grid h-10 w-10 place-items-center rounded-xl ${colors[tone]}`}>{icon}</span></div><div className="mt-4 text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-slate-500">{note}</div></div>;
}
function QuickAction({ icon, title, description, onClick }: { icon:React.ReactNode; title:string; description:string; onClick:()=>void }) {
  return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"><span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-700">{icon}</span><span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{description}</span></span><ArrowUpRight size={16} className="text-slate-400"/></button>;
}
function Field({ label, value, onChange, type="text", required=false }: { label:string; value:string; onChange:(value:string)=>void; type?:string; required?:boolean }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><input required={required} type={type} min={type==="number" ? "0" : undefined} step={type==="number" ? "0.01" : undefined} value={value} onChange={e=>onChange(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></label>;
}
function ProductTable({ products, loading }: { products:Product[]; loading:boolean }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 font-semibold">Product</th><th className="pb-3 font-semibold">SKU</th><th className="pb-3 font-semibold">Purchase</th><th className="pb-3 font-semibold">Selling</th><th className="pb-3 text-right font-semibold">In stock</th></tr></thead><tbody>
    {loading && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Loading products...</td></tr>}
    {!loading && products.length===0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">No products found. Add your first product to get started.</td></tr>}
    {products.map(p=><tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"><td className="py-3"><div className="font-semibold text-slate-800">{p.name}</div><div className="mt-0.5 text-xs text-slate-400">{p.category || "Uncategorised"}</div></td><td className="py-3 text-slate-500">{p.sku}</td><td className="py-3">{currency(Number(p.purchase_price))}</td><td className="py-3">{currency(Number(p.selling_price))}</td><td className="py-3 text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${Number(p.stock_quantity)<=Number(p.reorder_level) ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{p.stock_quantity} {p.unit}</span></td></tr>)}
  </tbody></table></div>;
}
