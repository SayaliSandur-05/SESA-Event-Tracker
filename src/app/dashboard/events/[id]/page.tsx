"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { EventItem, EventRegistration, AttendanceRecord, Membership } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  Users,
  CheckCircle2,
  Clock,
  UserCheck,
  Search,
  Filter,
  FileSpreadsheet,
  Edit3,
  Calendar,
  MapPin,
} from "lucide-react";



interface AttendeeRow {
  registration: EventRegistration;
  membership: Membership | null;
  attendance: AttendanceRecord | null;
  status: "present" | "absent";
}

export default function EventReportsPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"all" | "present" | "absent" | "walk_in">("all");

  const loadData = async () => {
    try {
      const [resStats, resAttendees] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/attendees`),
      ]);

      const dataStats = await resStats.json();
      const dataAttendees = await resAttendees.json();

      if (dataStats.stats?.event) {
        setEvent(dataStats.stats.event);
      }
      if (dataAttendees.attendees) {
        setAttendees(dataAttendees.attendees);
      }
    } catch (err) {
      console.error("Error loading event report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) loadData();
  }, [eventId]);

  // Derived statistics
  const totalRegistered = attendees.length;
  const totalPresent = attendees.filter((a) => a.status === "present").length;
  const totalAbsent = attendees.filter((a) => a.status === "absent").length;
  const totalWalkIns = attendees.filter((a) => a.registration.registration_type === "walk_in").length;
  const attendancePercentage =
    totalRegistered > 0 ? Math.round((totalPresent / totalRegistered) * 100) : 0;
  const remainingCapacity =
    event?.capacity ? Math.max(0, event.capacity - totalRegistered) : null;

  // Filter attendees
  const filteredAttendees = attendees.filter((row) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      row.registration.student_name_snapshot.toLowerCase().includes(q) ||
      row.registration.prn.toLowerCase().includes(q) ||
      row.registration.email.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (tab === "present") return row.status === "present";
    if (tab === "absent") return row.status === "absent";
    if (tab === "walk_in") return row.registration.registration_type === "walk_in";
    return true;
  });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DC] pb-6">
        <div className="space-y-1">
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-1.5 text-xs text-[#09172B] hover:text-[#C69A45] transition font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Events List
          </Link>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F8F1E6] text-[#09172B] border border-[#EFE8DC]">
              {event?.status.replace("_", " ") || "Event"}
            </span>
            <span className="text-xs text-gray-400">ID: {eventId}</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#09172B]">
            {event?.name || "Loading Event..."}
          </h1>
        </div>

        {/* Action Controls & CSV Exports */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/events/${eventId}/export?type=registrations`}
            download
            className="px-4 py-2 bg-[#F8F1E6] hover:bg-[#EFE8DC] text-[#09172B] border border-[#EFE8DC] rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#C69A45]" />
            Export Registrations CSV
          </a>

          <a
            href={`/api/events/${eventId}/export?type=attendance`}
            download
            className="px-4 py-2 bg-[#09172B] hover:bg-[#263346] text-white rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#E4BC70]" />
            Export Attendance Turnout CSV
          </a>

          <Link
            href={`/dashboard/events/${eventId}/edit`}
            className="px-3 py-2 bg-white hover:bg-gray-50 border border-[#EFE8DC] text-gray-700 rounded text-xs font-semibold transition"
          >
            <Edit3 className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Turnout KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase text-gray-500">Total Registered</p>
          <p className="font-serif text-2xl font-bold text-[#09172B]">{totalRegistered}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase text-emerald-600">Checked In (Present)</p>
          <p className="font-serif text-2xl font-bold text-emerald-700">{totalPresent}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase text-amber-600">Pending Arrival</p>
          <p className="font-serif text-2xl font-bold text-amber-700">{totalAbsent}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase text-[#34445A]">Walk-In Entries</p>
          <p className="font-serif text-2xl font-bold text-[#09172B]">{totalWalkIns}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase text-[#C69A45]">Attendance Rate</p>
          <p className="font-serif text-2xl font-bold text-[#09172B]">{attendancePercentage}%</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] text-center space-y-1">
          <p className="text-[11px] font-semibold uppercase text-gray-500">Seats Remaining</p>
          <p className="font-serif text-2xl font-bold text-[#09172B]">
            {remainingCapacity !== null ? remainingCapacity : "∞"}
          </p>
        </div>
      </div>

      {/* Attendees Table Section */}
      <div className="bg-white rounded-xl border border-[#EFE8DC] shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DC] pb-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: `All Attendees (${totalRegistered})` },
              { id: "present", label: `Present (${totalPresent})` },
              { id: "absent", label: `Absent / Pending (${totalAbsent})` },
              { id: "walk_in", label: `Walk-Ins (${totalWalkIns})` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                  tab === t.id
                    ? "bg-[#09172B] text-white"
                    : "bg-[#F8F1E6] text-gray-600 hover:bg-[#EFE8DC]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or PRN..."
              className="w-full pl-9 pr-3 py-1.5 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading attendee records...</div>
        ) : filteredAttendees.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 space-y-1">
            <Users className="w-8 h-8 text-gray-300 mx-auto" />
            <p>No attendees found matching filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F1E6] text-[#09172B] uppercase tracking-wider text-[10px] font-semibold border-y border-[#EFE8DC]">
                <tr>
                  <th className="px-4 py-3">Sr.</th>
                  <th className="px-4 py-3">College PRN</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Registration Type</th>
                  <th className="px-4 py-3">Attendance Status</th>
                  <th className="px-4 py-3">Check-in Time (IST)</th>
                  <th className="px-4 py-3">Verified By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]">
                {filteredAttendees.map((row, idx) => (
                  <tr key={row.registration.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#09172B]">
                      {row.registration.prn}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#09172B]">
                      {row.registration.student_name_snapshot}
                      <span className="block text-[11px] text-gray-400 font-normal">
                        {row.registration.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                          row.registration.registration_type === "walk_in"
                            ? "bg-purple-50 text-purple-800 border border-purple-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {row.registration.registration_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.status === "present" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3.5 h-3.5" /> Absent
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {row.attendance ? formatDateIST(row.attendance.checked_in_at) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.attendance?.checked_in_by_name || "—"}
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
