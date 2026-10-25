"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { getCurrentUser } from "@/lib/auth";
import { EventItem, EventRegistration, AttendanceRecord, Membership } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserPlus,
  RefreshCw,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  ArrowRight,
  Radio,
  PlusCircle,
  CreditCard,
  QrCode,
  DollarSign,
  X,
} from "lucide-react";

export default function VenueDeskPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Search input state
  const [prnQuery, setPrnQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search result
  const [searchResult, setSearchResult] = useState<{
    exists: boolean;
    membership: Partial<Membership> | null;
    registration: EventRegistration | null;
    attendance: AttendanceRecord | null;
    event: Partial<EventItem> | null;
  } | null>(null);

  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // Live Stats for the selected event
  const [deskStats, setDeskStats] = useState<{
    totalRegistered: number;
    totalPresent: number;
    totalAbsent: number;
    totalWalkIns: number;
    percentage: number;
  }>({
    totalRegistered: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalWalkIns: 0,
    percentage: 0,
  });

  // Walk-In Modal state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInPrn, setWalkInPrn] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInContact, setWalkInContact] = useState("");
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);
  const [walkInFeedback, setWalkInFeedback] = useState<string | null>(null);

  // Late Entry ₹1,000 Member Modal State
  const [lateModalOpen, setLateModalOpen] = useState(false);
  const [latePrn, setLatePrn] = useState("");
  const [lateName, setLateName] = useState("");
  const [lateEmail, setLateEmail] = useState("");
  const [lateContact, setLateContact] = useState("");
  const [lateYear, setLateYear] = useState("Third Year (TY)");
  const [lateFeeAmount, setLateFeeAmount] = useState(1000);
  const [latePaymentMode, setLatePaymentMode] = useState("UPI QR Code");
  const [lateNotes, setLateNotes] = useState("");
  const [submittingLate, setSubmittingLate] = useState(false);
  const [lateFeedback, setLateFeedback] = useState<string | null>(null);

  // Verify volunteer authentication
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
        } else {
          setAuthChecking(false);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Load events
  useEffect(() => {
    fetch("/api/events?all=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
          // Default to first active or published event
          const active = data.events.find((e: EventItem) => e.status === "published") || data.events[0];
          setSelectedEventId(active.id);
          setSelectedEvent(active);
        }
      })
      .catch((err) => console.error("Error loading events:", err));
  }, []);

  // Refresh stats when event changes
  const fetchEventStats = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.stats) {
        setDeskStats({
          totalRegistered: data.stats.totalRegistered,
          totalPresent: data.stats.totalPresent,
          totalAbsent: data.stats.totalAbsent,
          totalWalkIns: data.stats.totalWalkIns,
          percentage: data.stats.attendancePercentage,
        });
      }
    } catch (err) {
      console.error("Failed to load desk stats:", err);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      const found = events.find((e) => e.id === selectedEventId) || null;
      setSelectedEvent(found);
      fetchEventStats(selectedEventId);
      setSearchResult(null);
      setMessage(null);
      // Focus PRN input
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [selectedEventId, events]);

  // Live Auto-Refresh polling (every 6 seconds across multiple volunteer devices)
  useEffect(() => {
    if (!selectedEventId) return;
    const interval = setInterval(() => {
      fetchEventStats(selectedEventId);
    }, 6000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  // Execute PRN Lookup
  const handleSearchPrn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prnQuery.trim() || !selectedEventId) return;

    setSearching(true);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/attendance/search?eventId=${selectedEventId}&prn=${encodeURIComponent(prnQuery.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setSearchResult(data);

      if (!data.registration && !data.membership) {
        setMessage({
          type: "error",
          text: `PRN '${prnQuery.toUpperCase()}' not found in SESA records. If they paid ₹1,000 now, click 'Register Late Entry' below.`,
        });
      } else if (!data.registration && data.membership) {
        if (data.membership.payment_status === "paid") {
          setMessage({
            type: "warning",
            text: `Student is a verified paid member (₹${data.membership.fee_amount || 1000}) but not pre-registered. Use 'Walk-In Registration' below.`,
          });
        } else {
          setMessage({
            type: "error",
            text: `Student membership is marked as '${data.membership.payment_status?.toUpperCase()}'. Verify ₹1,000 fee before entry.`,
          });
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSearching(false);
    }
  };

  // Mark Present Action
  const handleMarkPresent = async () => {
    if (!searchResult?.registration || !selectedEventId) return;

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          registrationId: searchResult.registration.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Attendance marking failed");
      }

      setMessage({
        type: "success",
        text: `Success! ${searchResult.registration.student_name_snapshot} (${searchResult.registration.prn}) is marked PRESENT.`,
      });

      // Update local state and stats
      setSearchResult({
        ...searchResult,
        attendance: data.attendance,
      });
      fetchEventStats(selectedEventId);
      // Auto-clear search query for next student
      setPrnQuery("");
      searchInputRef.current?.focus();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    }
  };

  // Walk-In Submit Action
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInPrn.trim() || !selectedEventId) return;

    setSubmittingWalkIn(true);
    setWalkInFeedback(null);

    try {
      const res = await fetch("/api/attendance/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          prn: walkInPrn.trim(),
          email: walkInEmail.trim() || undefined,
          contact: walkInContact.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Walk-in registration failed");
      }

      setMessage({
        type: "success",
        text: data.message || "Walk-in registered and marked present successfully!",
      });

      setWalkInModalOpen(false);
      setWalkInPrn("");
      setWalkInEmail("");
      setWalkInContact("");
      fetchEventStats(selectedEventId);
      searchInputRef.current?.focus();
    } catch (err: any) {
      setWalkInFeedback(err.message);
    } finally {
      setSubmittingWalkIn(false);
    }
  };

  // Open Late Member Modal
  const openLateModalWithPrn = (prnToUse?: string) => {
    setLatePrn(prnToUse || prnQuery.trim().toUpperCase());
    setLateName("");
    setLateEmail("");
    setLateContact("");
    setLateYear("Third Year (TY)");
    setLateFeeAmount(1000);
    setLatePaymentMode("UPI QR Code");
    setLateNotes("Verified ₹1,000 fee at entrance desk");
    setLateFeedback(null);
    setLateModalOpen(true);
  };

  // Late-Entry Member Submit: Saves to Central Membership DB + Checks In into active event
  const handleLateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!latePrn.trim() || !lateName.trim() || !selectedEventId) return;

    setSubmittingLate(true);
    setLateFeedback(null);

    try {
      // 1. Add / update membership in central DB as paid with ₹1,000
      const memRes = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prn: latePrn.trim().toUpperCase(),
          full_name: lateName.trim(),
          email: lateEmail.trim() || `${latePrn.toLowerCase()}@mitaoe.ac.in`,
          contact: lateContact.trim() || undefined,
          branch: "Department Of Software Engineering",
          academic_year: lateYear,
          payment_status: "paid",
          fee_amount: Number(lateFeeAmount) || 1000,
          payment_mode: latePaymentMode,
          verification_notes: lateNotes || `Verified ₹${lateFeeAmount} payment at desk`,
        }),
      });

      const memData = await memRes.json();
      if (!memRes.ok) {
        throw new Error(memData.error || "Failed to save membership record");
      }

      // 2. Register for event & mark present immediately via walk-in endpoint
      const walkRes = await fetch("/api/attendance/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          prn: latePrn.trim().toUpperCase(),
          email: lateEmail.trim() || undefined,
          contact: lateContact.trim() || undefined,
        }),
      });

      const walkData = await walkRes.json();
      if (!walkRes.ok) {
        throw new Error(walkData.error || "Saved as member, but walk-in check-in failed");
      }

      setMessage({
        type: "success",
        text: `Success! ${lateName} (${latePrn.toUpperCase()}) registered as ₹1,000 verified SESA member and marked PRESENT.`,
      });

      setLateModalOpen(false);
      setPrnQuery("");
      fetchEventStats(selectedEventId);
      searchInputRef.current?.focus();
    } catch (err: any) {
      setLateFeedback(err.message);
    } finally {
      setSubmittingLate(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#08162a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#b18345] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F1E6]">
      

      {/* Desk Action Header */}
      <section className="bg-[#09172B] text-white py-6 px-4 sm:px-6 lg:px-8 border-b border-[#263346]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#E4BC70] px-2 py-0.5 rounded bg-[#263346] border border-[#34445A]">
                Venue Entrance Desk
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">
              Attendance & Walk-in Terminal
            </h1>
            <p className="text-xs text-[#AEB9C9]">
              High-speed PRN lookups, 1-tap check-ins, and on-spot ₹1,000 late entry registrations.
            </p>
          </div>

          {/* Right Action: Event Selector & Late Member Registration */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openLateModalWithPrn()}
              className="px-3.5 py-2 bg-[#E4BC70] hover:bg-[#D4A95B] text-[#09172B] font-bold text-xs uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Register Late ₹1,000 Member
            </button>

            <div className="flex items-center gap-2 bg-[#1A2634] p-1 rounded-lg border border-[#34445A]">
              <label className="text-xs text-[#AEB9C9] pl-2 whitespace-nowrap">Active Event:</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-[#263346] text-white border border-[#34445A] rounded px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#E4BC70] max-w-xs"
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Live Turnout Metrics Strip */}
      <section className="bg-white border-b border-[#EFE8DC] py-4 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-5 gap-4 text-center divide-x divide-[#EFE8DC]">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-medium">Registered</p>
            <p className="font-serif text-2xl font-bold text-[#09172B]">
              {deskStats.totalRegistered}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-600 font-medium">Checked In</p>
            <p className="font-serif text-2xl font-bold text-emerald-700">
              {deskStats.totalPresent}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-600 font-medium">Pending Entry</p>
            <p className="font-serif text-2xl font-bold text-amber-700">
              {deskStats.totalAbsent}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#34445A] font-medium">Walk-Ins</p>
            <p className="font-serif text-2xl font-bold text-[#09172B]">
              {deskStats.totalWalkIns}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[#C69A45] font-medium">Turnout %</p>
            <p className="font-serif text-2xl font-bold text-[#09172B]">
              {deskStats.percentage}%
            </p>
          </div>
        </div>
      </section>

      {/* Main Desk Terminal Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Search & One-Tap Actions */}
          <div className="lg:col-span-8 space-y-6">
            {/* PRN Lookup Box */}
            <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#09172B]">
                    Student PRN Lookup
                  </h3>
                  <p className="text-xs text-gray-500">
                    Type College PRN and press Enter to pull registration & attendance status.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setWalkInPrn(prnQuery.toUpperCase().trim());
                      setWalkInModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-[#F8F1E6] hover:bg-[#EFE8DC] text-[#09172B] border border-[#EFE8DC] rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#C69A45]" />
                    Walk-in
                  </button>
                </div>
              </div>

              <form onSubmit={handleSearchPrn} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={prnQuery}
                    onChange={(e) => setPrnQuery(e.target.value)}
                    placeholder="Enter PRN (e.g. MIT2024001, MIT2024002)..."
                    className="w-full pl-11 pr-4 py-3 border-2 border-[#263346]/20 focus:border-[#09172B] rounded-lg text-lg text-[#09172B] font-mono uppercase tracking-wide focus:outline-none transition shadow-inner"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-3 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition flex items-center gap-2 cursor-pointer"
                >
                  {searching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Lookup
                    </>
                  )}
                </button>
              </form>

              {/* Status Notice / Feedback Banner */}
              {message && (
                <div
                  className={`p-4 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-all ${
                    message.type === "success"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : message.type === "warning"
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : "bg-red-50 border-red-300 text-red-800"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {message.type === "success" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium text-sm">{message.text}</span>
                  </div>

                  {/* Immediate Action Buttons if student not found or unpaid */}
                  {message.type === "error" && (
                    <button
                      type="button"
                      onClick={() => openLateModalWithPrn(prnQuery.trim().toUpperCase())}
                      className="px-3 py-1.5 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-bold uppercase rounded shadow flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#E4BC70]" />
                      Register ₹1,000 Now
                    </button>
                  )}

                  {message.type === "warning" && (
                    <button
                      type="button"
                      onClick={() => {
                        setWalkInPrn(prnQuery.trim().toUpperCase());
                        setWalkInModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-bold uppercase rounded shadow flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-[#E4BC70]" />
                      Walk-In Check In
                    </button>
                  )}
                </div>
              )}

              {/* Search Result Card: Pre-Registered Attendee */}
              {searchResult && searchResult.registration && (
                <div className="mt-4 p-5 bg-[#F8F1E6]/60 rounded-xl border border-[#EFE8DC] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFE8DC] pb-3">
                    <div>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-gray-500">
                        Pre-Registered Attendee
                      </span>
                      <h4 className="font-serif text-2xl font-bold text-[#09172B]">
                        {searchResult.registration.student_name_snapshot}
                      </h4>
                      <p className="text-xs text-gray-600 font-mono">
                        PRN: {searchResult.registration.prn} • Email: {searchResult.registration.email}
                      </p>
                    </div>

                    <div className="text-right">
                      {searchResult.attendance ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          ALREADY CHECKED IN
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold">
                          <Clock className="w-4 h-4" />
                          AWAITING CHECK-IN
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attendance Check-in Status Details */}
                  {searchResult.attendance ? (
                    <div className="p-3 bg-white rounded-lg border border-[#EFE8DC] text-xs text-gray-600 space-y-1">
                      <p className="font-semibold text-[#09172B]">Check-in Timestamp:</p>
                      <p>
                        {formatDateIST(searchResult.attendance.checked_in_at)} via{" "}
                        <span className="font-mono uppercase">{searchResult.attendance.method}</span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Verified by Volunteer: {searchResult.attendance.checked_in_by_name}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        onClick={handleMarkPresent}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm uppercase tracking-wider rounded-lg shadow transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UserCheck className="w-5 h-5" />
                        Mark Present (One-Tap Entry)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Desk Info & Guidelines */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#09172B]">
                Desk Volunteer Checklist
              </h3>
              <ul className="text-xs text-gray-600 space-y-2.5">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <span>Ask the student for their College PRN.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <span>Verify their identity by matching their college ID badge.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <span>Tap <strong>Mark Present</strong> to securely record their entry.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <span>For unregistered paid members, click <strong>Walk-in</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <span>If not in records, click <strong>Register Late ₹1,000 Member</strong>.</span>
                </li>
              </ul>
            </div>

            {selectedEvent && (
              <div className="bg-[#263346] text-white rounded-xl p-6 shadow-sm space-y-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#E4BC70]">
                  Active Event Details
                </span>
                <h4 className="font-serif text-lg font-bold text-white">
                  {selectedEvent.name}
                </h4>
                <div className="space-y-1.5 text-xs text-[#AEB9C9]">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#E4BC70]" />
                    {selectedEvent.venue}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#E4BC70]" />
                    {formatDateIST(selectedEvent.starts_at)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Late Entry ₹1,000 Member Registration & Check-in Modal */}
      {lateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#EFE8DC]">
            <div className="flex items-center justify-between border-b border-[#EFE8DC] pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C69A45] block">
                  Venue Desk Member Registration
                </span>
                <h3 className="font-serif text-xl font-bold text-[#09172B]">
                  Register Late ₹1,000 Member
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Enrolls student into the central SESA database as a verified ₹1,000 paid member, registers them for the event, and marks them present immediately.
            </p>

            <form onSubmit={handleLateMemberSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  College PRN *
                </label>
                <input
                  type="text"
                  value={latePrn}
                  onChange={(e) => setLatePrn(e.target.value.toUpperCase())}
                  placeholder="e.g. MIT2024099"
                  required
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-sm text-[#09172B] font-mono uppercase focus:outline-none focus:border-[#09172B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  value={lateName}
                  onChange={(e) => setLateName(e.target.value)}
                  placeholder="e.g. Atharva Joshi"
                  required
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Contact / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={lateContact}
                    onChange={(e) => setLateContact(e.target.value)}
                    placeholder="9820011221"
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={latePaymentMode}
                    onChange={(e) => setLatePaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] bg-white focus:outline-none focus:border-[#09172B]"
                  >
                    <option value="UPI QR Code">UPI QR Code</option>
                    <option value="Cash at Desk">Cash at Venue Desk</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  Fee Amount (₹)
                </label>
                <input
                  type="number"
                  value={lateFeeAmount}
                  onChange={(e) => setLateFeeAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] font-mono focus:outline-none focus:border-[#09172B]"
                />
              </div>

              {lateFeedback && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {lateFeedback}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-[#EFE8DC]">
                <button
                  type="button"
                  onClick={() => setLateModalOpen(false)}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLate}
                  className="flex-1 py-2.5 bg-[#E4BC70] hover:bg-[#D4A95B] disabled:opacity-50 text-[#09172B] font-bold text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  {submittingLate ? (
                    <span className="animate-spin w-4 h-4 border-2 border-[#09172B] border-t-transparent rounded-full" />
                  ) : (
                    "Save ₹1,000 & Mark Present"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Walk-In Registration Modal */}
      {walkInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#EFE8DC]">
            <div className="flex items-center justify-between border-b border-[#EFE8DC] pb-3">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C69A45] block">
                  On-Spot Entrance Entry
                </span>
                <h3 className="font-serif text-xl font-bold text-[#09172B]">
                  Walk-In Registration
                </h3>
              </div>
              <UserPlus className="w-6 h-6 text-[#09172B]" />
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Registers an eligible paid member and marks them present in one safe server-side workflow.
            </p>

            <form onSubmit={handleWalkInSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  College PRN
                </label>
                <input
                  type="text"
                  value={walkInPrn}
                  onChange={(e) => setWalkInPrn(e.target.value.toUpperCase())}
                  placeholder="e.g. MIT2024008"
                  required
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-sm text-[#09172B] font-mono uppercase focus:outline-none focus:border-[#09172B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={walkInEmail}
                  onChange={(e) => setWalkInEmail(e.target.value)}
                  placeholder="name@mitaoe.ac.in"
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="tel"
                  value={walkInContact}
                  onChange={(e) => setWalkInContact(e.target.value)}
                  placeholder="9820011221"
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                />
              </div>

              {walkInFeedback && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {walkInFeedback}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalkInModalOpen(false)}
                  className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWalkIn}
                  className="flex-1 py-2.5 bg-[#09172B] hover:bg-[#263346] disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingWalkIn ? (
                    <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    "Register & Mark Present"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

     
    </div>
  );
}
