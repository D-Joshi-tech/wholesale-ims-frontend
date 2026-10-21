"use client";

import { useEffect, useState } from "react";
import {
  UserPlus, Shield, CheckCircle, XCircle, Trash2,
  RefreshCw, AlertCircle, Mail, UserCheck
} from "lucide-react";
import { getJson, postJson, patchJson, deleteJson, AuthUser } from "@/lib/api";

type UserRecord = {
  id: number;
  email: string;
  name: string | null;
  picture: string | null;
  role: "admin" | "manager" | "viewer";
  is_allowed: boolean;
  created_at: string | null;
  last_login: string | null;
};

type UserManagementViewProps = {
  currentUser: AuthUser;
};

export function UserManagementView({ currentUser }: UserManagementViewProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add User Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const data = await getJson<UserRecord[]>("/api/users");
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load user whitelist");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await postJson<UserRecord>("/api/users", {
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || undefined,
        role: newRole,
        is_allowed: true,
      });
      setSuccess(`Added ${newEmail} to authorized whitelist.`);
      setNewEmail("");
      setNewName("");
      setNewRole("viewer");
      setShowAddModal(false);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not add user");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(user: UserRecord) {
    if (user.id === currentUser.id) {
      setError("Cannot deactivate your own active admin account.");
      return;
    }
    setError("");
    setSuccess("");
    try {
      await patchJson<UserRecord>(`/api/users/${user.id}`, {
        is_allowed: !user.is_allowed,
      });
      setSuccess(`Updated status for ${user.email}`);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  async function handleRoleChange(user: UserRecord, role: "admin" | "manager" | "viewer") {
    setError("");
    setSuccess("");
    try {
      await patchJson<UserRecord>(`/api/users/${user.id}`, { role });
      setSuccess(`Updated ${user.email} to ${role}`);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Role update failed");
    }
  }

  async function handleDeleteUser(user: UserRecord) {
    if (user.id === currentUser.id) {
      setError("Cannot delete your own active admin account.");
      return;
    }
    if (!confirm(`Are you sure you want to remove ${user.email} from the whitelist?`)) return;

    setError("");
    setSuccess("");
    try {
      await deleteJson(`/api/users/${user.id}`);
      setSuccess(`Removed ${user.email}`);
      await loadUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <span>Authorized Email Whitelist</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Only email addresses listed here can authenticate and access this Wholesale IMS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadUsers()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh Whitelist"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Authorize New Email</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">User / Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Access Status</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300 uppercase text-xs">
                          {u.name ? u.name[0] : u.email[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                            <span>{u.name || "Authorized User"}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/30 font-medium">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          void handleRoleChange(u, e.target.value as "admin" | "manager" | "viewer")
                        }
                        disabled={isSelf}
                        className="rounded-lg bg-slate-950 border border-slate-800 text-slate-200 px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.is_allowed ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          <span>Active Whitelist</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          <span>Suspended</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : "Never logged in"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => void handleToggleStatus(u)}
                          disabled={isSelf}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition disabled:opacity-30 ${
                            u.is_allowed
                              ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {u.is_allowed ? "Revoke Access" : "Grant Access"}
                        </button>
                        <button
                          onClick={() => void handleDeleteUser(u)}
                          disabled={isSelf}
                          className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-30"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <UserCheck className="w-5 h-5 text-indigo-400" />
              <span>Authorize New Email</span>
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Google / Workspace Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as "admin" | "manager" | "viewer")
                  }
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="manager">Manager (Create & Edit Sales/Purchases)</option>
                  <option value="admin">Admin (Full Control & User Management)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {saving ? "Authorizing..." : "Add to Whitelist"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
