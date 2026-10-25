"use client";

import React, { useState, useEffect } from "react";
import { Profile, UserRole } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import { UserCog, ShieldCheck, CheckCircle2, User, RefreshCw, AlertCircle } from "lucide-react";

export default function UserManagementPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.profiles) setProfiles(data.profiles);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (profileId: string, newRole: UserRole) => {
    setUpdatingId(profileId);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: profileId, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");

      setMessage(`Role updated successfully to ${newRole}`);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DC] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#34445A]">
            Administrative Privileges
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#09172B]">
            Staff & Volunteer Roles
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Assign Super Admin, Organizer, or Desk Volunteer capabilities across departmental personnel.
          </p>
        </div>

        <button
          onClick={loadUsers}
          className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-[#EFE8DC] rounded text-xs font-semibold uppercase text-gray-700 transition flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#EFE8DC] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading user profiles...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F1E6] text-[#09172B] uppercase tracking-wider text-[10px] font-semibold border-b border-[#EFE8DC]">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Institutional Email</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3">Change Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-medium text-[#09172B]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#09172B] text-white flex items-center justify-center font-bold text-xs">
                          {p.full_name.charAt(0)}
                        </div>
                        <span>{p.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 font-bold">{p.username}</td>
                    <td className="px-4 py-3 text-gray-500">{p.email}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-[#F8F1E6] text-[#09172B] border border-[#EFE8DC]">
                        {p.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.role}
                        disabled={updatingId === p.id}
                        onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                        className="px-2.5 py-1.5 border border-[#EFE8DC] rounded text-xs bg-white text-[#09172B] font-semibold focus:outline-none focus:border-[#09172B]"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="organizer">Event Organizer</option>
                        <option value="volunteer">Venue Volunteer</option>
                        <option value="student">Student</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
