"use client";

import React, { useState, useEffect } from "react";
import { AuditLog } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import { ShieldAlert, Search, Clock, User, Filter, RefreshCw } from "lucide-react";

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      if (data.stats?.recentActivity) {
        setLogs(data.stats.recentActivity);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.actor_name.toLowerCase().includes(q) ||
      l.entity_type.toLowerCase().includes(q) ||
      l.entity_id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DC] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#34445A]">
            Security & Governance
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#09172B]">
            System Audit Trail
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Immutable log of event configurations, membership updates, bulk imports, and venue attendance records.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-[#EFE8DC] rounded text-xs font-semibold uppercase text-gray-700 transition flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#EFE8DC] p-4 flex items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit actions, actors, or entity IDs..."
            className="w-full pl-9 pr-4 py-1.5 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#EFE8DC] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading audit log...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">No audit logs matching query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F1E6] text-[#09172B] uppercase tracking-wider text-[10px] font-semibold border-b border-[#EFE8DC]">
                <tr>
                  <th className="px-4 py-3">Timestamp (IST)</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Entity Identifier</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">
                      {formatDateIST(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-[11px] bg-[#F8F1E6] text-[#09172B] px-2 py-0.5 rounded border border-[#EFE8DC]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-[#09172B]">
                      {log.actor_name}
                      <span className="block text-[10px] text-gray-400 font-mono">
                        {log.actor_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 uppercase text-[11px] text-gray-600 font-mono">
                      {log.entity_type}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700">{log.entity_id}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs font-mono text-[11px] truncate">
                      {log.metadata ? JSON.stringify(log.metadata) : "—"}
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
