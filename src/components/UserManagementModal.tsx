import React, { useState, useEffect } from "react";
import {
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Crown,
  Edit3,
  Eye
} from "lucide-react";

export type UserRole = "admin" | "crm_editor" | "fsm";

export interface UserRecord {
  email: string;
  name: string;
  role: UserRole;
  addedAt: string;
  addedBy: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail: string;
  onNotification: (notif: { type: "success" | "error"; message: string }) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onNotification
}) => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  // New user form state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("crm_editor");
  const [isAddingUser, setIsAddingUser] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users", {
        headers: {
          "X-User-Email": currentUserEmail
        }
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        onNotification({
          type: "error",
          message: data.error || "Failed to load user access list"
        });
      }
    } catch (err: any) {
      onNotification({
        type: "error",
        message: err.message || "Failed to connect to users service"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      const interval = setInterval(fetchUsers, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleRoleChange = async (targetEmail: string, newRoleValue: UserRole) => {
    if (targetEmail.toLowerCase() === "shekharphi785@gmail.com" && newRoleValue !== "admin") {
      onNotification({
        type: "error",
        message: "The primary Super Admin role cannot be demoted."
      });
      return;
    }

    setIsUpdatingRole(targetEmail);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(targetEmail)}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": currentUserEmail
        },
        body: JSON.stringify({ role: newRoleValue })
      });

      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        onNotification({
          type: "success",
          message: `Permissions updated for ${targetEmail} -> ${
            newRoleValue === "admin"
              ? "Administrator"
              : newRoleValue === "crm_editor"
              ? "CRM Reviewer & Editor"
              : "FSM Submitter (Read-Only Status)"
          }`
        });
      } else {
        onNotification({
          type: "error",
          message: data.error || "Failed to update user role"
        });
      }
    } catch (err: any) {
      onNotification({
        type: "error",
        message: err.message || "Error updating role"
      });
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsAddingUser(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": currentUserEmail
        },
        body: JSON.stringify({
          email: newEmail.trim().toLowerCase(),
          name: newName.trim() || newEmail.split("@")[0],
          role: newRole
        })
      });

      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        setNewEmail("");
        setNewName("");
        setShowAddUser(false);
        onNotification({
          type: "success",
          message: `User ${newEmail.trim()} successfully configured with ${
            newRole === "crm_editor"
              ? "CRM Reviewer / Editor"
              : newRole === "admin"
              ? "Administrator"
              : "FSM Submitter"
          } permissions.`
        });
      } else {
        onNotification({
          type: "error",
          message: data.error || "Failed to add user"
        });
      }
    } catch (err: any) {
      onNotification({
        type: "error",
        message: err.message || "Error adding user"
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        id="user-management-modal"
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  Access Control & Role Permissions
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                  Admin Exclusive
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Control which CRM team members can update case remarks and statuses. FSMs are restricted to read-only status checks.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Search Bar */}
        <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800/70 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-blue-900/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddUser ? "Hide Form" : "Grant Access to User"}</span>
            </button>
          </div>
        </div>

        {/* Add User Form Drawer */}
        {showAddUser && (
          <form
            onSubmit={handleAddUserSubmit}
            className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end animate-fadeIn"
          >
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="colleague@philips.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Mitchell (CRM)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Assigned Role & Permission
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="crm_editor">CRM Reviewer & Editor (Can update remarks)</option>
                <option value="fsm">FSM Submitter (Read-Only Status)</option>
                <option value="admin">Administrator (Full Access)</option>
              </select>
            </div>
            <div>
              <button
                type="submit"
                disabled={isAddingUser}
                className="w-full py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {isAddingUser ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserCheck className="w-3.5 h-3.5" />
                )}
                <span>Save User Access</span>
              </button>
            </div>
          </form>
        )}

        {/* Roles Legend / Info Card */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">Permission Roles:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <strong className="text-emerald-300">CRM Reviewer:</strong> Can view all cases and edit CRM remarks & statuses.
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <strong className="text-sky-300">FSM Submitter:</strong> Can submit cases and view real-time remarks in read-only mode.
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <strong className="text-purple-300">Admin:</strong> Has full portal controls & manages team permissions.
          </div>
        </div>

        {/* Users Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
              <p className="text-xs">Loading user access roster...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No users found</p>
              <p className="text-xs text-slate-500 mt-1">
                Add a user above to grant them CRM Reviewer or FSM access.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User / Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Current Permission</th>
                    <th className="py-3 px-4">Access Level Switcher</th>
                    <th className="py-3 px-4 text-right">Added By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                  {filteredUsers.map((user) => {
                    const isSelf =
                      user.email.toLowerCase() === currentUserEmail.toLowerCase();
                    const isSuperAdmin =
                      user.email.toLowerCase() === "shekharphi785@gmail.com";
                    const isUpdating = isUpdatingRole === user.email;

                    return (
                      <tr
                        key={user.email}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-medium text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-blue-400 uppercase">
                            {user.name ? user.name[0] : user.email[0]}
                          </div>
                          <div>
                            <div>{user.name || "Colleague"}</div>
                            {isSelf && (
                              <span className="text-[10px] text-blue-400 font-normal">
                                (You)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px]">
                          {user.email}
                        </td>

                        <td className="py-3.5 px-4">
                          {user.role === "admin" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <Crown className="w-3 h-3" />
                              Administrator
                            </span>
                          ) : user.role === "crm_editor" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <Edit3 className="w-3 h-3" />
                              CRM Editor (Can Edit Remarks)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              <Eye className="w-3 h-3" />
                              FSM Submitter (Read-Only)
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isSuperAdmin ? (
                            <span className="text-[11px] text-slate-500 italic flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Primary Root Admin
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <select
                                disabled={isUpdating}
                                value={user.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    user.email,
                                    e.target.value as UserRole
                                  )
                                }
                                className="px-2.5 py-1 bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                              >
                                <option value="fsm">
                                  FSM Submitter (Read-Only)
                                </option>
                                <option value="crm_editor">
                                  CRM Editor (Can Update Remarks)
                                </option>
                                <option value="admin">
                                  Administrator (Full Access)
                                </option>
                              </select>
                              {isUpdating && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right text-[11px] text-slate-400">
                          {user.addedBy || "Admin"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Total Registered Members:{" "}
            <strong className="text-white">{users.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
