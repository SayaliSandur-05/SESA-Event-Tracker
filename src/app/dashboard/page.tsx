"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardStats } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import {
  Calendar,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  PlusCircle,
  CheckSquare,
  ShieldAlert,
  Clock,
  TrendingUp,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats);
      })
      .catch((err) => console.error("Error loading stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DC] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#34445A]">
            Control Center
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#09172B]">
            Organizer Dashboard Overview
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Department Of Software Engineering • SESA MITAOE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/events/new"
            className="px-4 py-2 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#E4BC70]" />
            New Event
          </Link>
          <Link
            href="/desk"
            className="px-4 py-2 bg-[#E4BC70] hover:bg-[#D4A95B] text-[#09172B] text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-sm"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Launch Venue Desk
          </Link>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#EFE8DC] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
              Total Events
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#09172B] flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="font-serif text-3xl font-bold text-[#09172B]">
            {loading ? "..." : stats?.totalEvents ?? 0}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium">
            {stats?.activeEventsCount ?? 0} published & active
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#EFE8DC] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
              Registrations
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="font-serif text-3xl font-bold text-[#09172B]">
            {loading ? "..." : stats?.totalRegistrations ?? 0}
          </p>
          <p className="text-[11px] text-gray-500">
            Includes {stats?.totalWalkIns ?? 0} walk-in attendees
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#EFE8DC] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
              Total Checked In
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="font-serif text-3xl font-bold text-[#09172B]">
            {loading ? "..." : stats?.totalCheckedIn ?? 0}
          </p>
          <p className="text-[11px] text-gray-500">Live venue attendance</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#EFE8DC] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-semibold text-gray-500 tracking-wider">
              Paid Members
            </span>
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="font-serif text-3xl font-bold text-[#09172B]">
            {loading ? "..." : stats?.totalPaidMembers ?? 0}
          </p>
          <p className="text-[11px] text-amber-600 font-medium">
            {stats?.totalPendingMembers ?? 0} pending verification
          </p>
        </div>
      </div>

      {/* Core Functions Banner for Volunteers & Organizers */}
      <div className="bg-[#09172B] text-white p-6 rounded-2xl border border-[#34445A] shadow-lg relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#E4BC70] px-2 py-0.5 rounded bg-[#263346] border border-[#34445A]">
                Volunteer Terminal System
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Simultaneous Multi-Device Access Enabled
              </span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white">
              Primary SESA Volunteer Operations Hub
            </h2>
            <p className="text-xs text-[#AEB9C9] max-w-2xl">
              All 4–5 desk volunteers have unified access across phones and laptops to manage the complete event lifecycle.
            </p>
          </div>
        </div>

        {/* 3 Core Functions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 relative z-10">
          <Link
            href="/dashboard/events"
            className="p-4 bg-[#1E2C3F]/80 hover:bg-[#263346] border border-[#34445A] hover:border-[#E4BC70]/50 rounded-xl transition group space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 bg-[#E4BC70]/20 text-[#E4BC70] rounded">
                Function 1
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-serif text-base font-bold text-white group-hover:text-[#E4BC70] transition">
              Create & Manage Events
            </h3>
            <p className="text-[11px] text-[#AEB9C9] leading-relaxed">
              Create, edit, publish events, configure capacities, and export formula-sanitized attendance reports.
            </p>
          </Link>

          <Link
            href="/desk"
            className="p-4 bg-[#1E2C3F]/80 hover:bg-[#263346] border border-[#34445A] hover:border-[#E4BC70]/50 rounded-xl transition group space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 bg-[#E4BC70]/20 text-[#E4BC70] rounded">
                Function 2
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-serif text-base font-bold text-white group-hover:text-[#E4BC70] transition">
              Mark Venue Attendance
            </h3>
            <p className="text-[11px] text-[#AEB9C9] leading-relaxed">
              Rapid PRN lookups, 1-tap &apos;Mark Present&apos; check-ins, and walk-in entrance handling.
            </p>
          </Link>

          <Link
            href="/dashboard/memberships"
            className="p-4 bg-[#1E2C3F]/80 hover:bg-[#263346] border border-[#34445A] hover:border-[#E4BC70]/50 rounded-xl transition group space-y-2 block"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 bg-[#E4BC70]/20 text-[#E4BC70] rounded">
                Function 3
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-serif text-base font-bold text-white group-hover:text-[#E4BC70] transition">
              Register Members & Excel Sync
            </h3>
            <p className="text-[11px] text-[#AEB9C9] leading-relaxed">
              Register venue students paying ₹1,000 fee directly, plus safe upsert of .xlsx/.xls/.csv rosters.
            </p>
          </Link>
        </div>
      </div>

      {/* System Audit Activity Stream */}
      <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#EFE8DC] pb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#09172B]" />
            <h3 className="font-serif text-lg font-bold text-[#09172B]">
              Recent Audit Activity
            </h3>
          </div>
          <Link
            href="/dashboard/audit"
            className="text-xs font-semibold text-[#09172B] hover:underline"
          >
            View Full Trail &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : !stats?.recentActivity || stats.recentActivity.length === 0 ? (
          <p className="text-xs text-gray-500 py-6 text-center">No recent activity recorded.</p>
        ) : (
          <div className="divide-y divide-[#EFE8DC]">
            {stats.recentActivity.slice(0, 8).map((log) => (
              <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-[#09172B] bg-[#F8F1E6] px-1.5 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                    <span className="font-medium text-[#34445A]">{log.actor_name}</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Entity: {log.entity_type} ({log.entity_id})
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateIST(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
