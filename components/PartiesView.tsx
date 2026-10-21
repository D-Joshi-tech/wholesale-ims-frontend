"use client";

import { useEffect, useState } from "react";
import { Users, Truck, Plus, Search, Phone, Mail, MapPin, CheckCircle2, RefreshCw } from "lucide-react";
import { getJson, postJson } from "@/lib/api";

export type Party = {
  id: number;
  party_type: "customer" | "supplier";
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  state_code: string | null;
  is_active: boolean;
};

interface PartiesViewProps {
  partyType: "customer" | "supplier";
}

export function PartiesView({ partyType }: PartiesViewProps) {
  const isCustomer = partyType === "customer";
  const title = isCustomer ? "Customers" : "Suppliers";
  const singular = isCustomer ? "Customer" : "Supplier";

  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    address: "",
    state_code: "",
  });

  async function loadParties() {
    setLoading(true);
    setError("");
    try {
      const data = await getJson<Party[]>(
        `/api/parties?party_type=${partyType}&search=${encodeURIComponent(search)}`
      );
      setParties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadParties();
    }, 250);
    return () => clearTimeout(timer);
  }, [partyType, search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await postJson("/api/parties", {
        party_type: partyType,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : null,
        address: form.address.trim() || null,
        state_code: form.state_code.trim() || null,
      });

      setSuccess(`${singular} "${form.name}" added successfully.`);
      setForm({ name: "", phone: "", email: "", gstin: "", address: "", state_code: "" });
      setShowForm(false);
      await loadParties();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isCustomer
              ? "Manage client records, billing profiles, and GSTINs."
              : "Manage vendor contacts, procurement sources, and supplier tax details."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadParties()}
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              setShowForm((v) => !v);
              setError("");
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 transition"
          >
            <Plus size={17} /> Add {singular}
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Create Form Drawer / Card */}
      {showForm && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">New {singular} Profile</h3>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              {partyType}
            </span>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {singular} Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder={isCustomer ? "e.g. Acme Traders / Rajesh Kumar" : "e.g. Apex Wholesalers Pvt Ltd"}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                placeholder="contact@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                GSTIN (Tax ID)
              </label>
              <input
                type="text"
                placeholder="27AAAAA0000A1Z5"
                maxLength={15}
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm uppercase outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State Code (2 digits)
              </label>
              <input
                type="text"
                placeholder="e.g. 27 or 33"
                maxLength={2}
                value={form.state_code}
                onChange={(e) => setForm({ ...form, state_code: e.target.value })}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Address / City / Pincode
              </label>
              <textarea
                rows={2}
                placeholder="Shop No, Street, Market area, City, Pincode"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : `Save ${singular}`}
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

      {/* Search & List */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Search size={17} className="text-slate-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()} by name, phone or GSTIN...`}
            className="h-10 w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-3 font-semibold">{singular} Name</th>
                <th className="pb-3 font-semibold">Contact</th>
                <th className="pb-3 font-semibold">GSTIN</th>
                <th className="pb-3 font-semibold">Address</th>
                <th className="pb-3 text-right font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Loading {title.toLowerCase()}...
                  </td>
                </tr>
              )}
              {!loading && parties.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-2">
                      {isCustomer ? <Users size={22} /> : <Truck size={22} />}
                    </div>
                    No {title.toLowerCase()} found. Click &quot;Add {singular}&quot; to register your first one.
                  </td>
                </tr>
              )}
              {parties.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70 transition">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 font-bold text-blue-800 text-xs">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-400">ID: #{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5">
                    <div className="space-y-0.5 text-xs text-slate-600">
                      {p.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={13} className="text-slate-400" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400" />
                          <span>{p.email}</span>
                        </div>
                      )}
                      {!p.phone && !p.email && <span className="text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="py-3.5">
                    {p.gstin ? (
                      <span className="inline-block rounded-md bg-purple-50 px-2 py-0.5 text-xs font-mono font-medium text-purple-700 border border-purple-100">
                        {p.gstin}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Unregistered</span>
                    )}
                  </td>
                  <td className="py-3.5 max-w-[200px] truncate text-xs text-slate-600">
                    {p.address ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400 shrink-0" />
                        <span className="truncate">{p.address}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
