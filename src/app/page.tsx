"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EventItem } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Search,
  Sparkles,
  Award,
  Clock,
  Lightbulb,
  UserPlus,
} from "lucide-react";

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Quick Eligibility Checker state
  const [prnInput, setPrnInput] = useState("");
  const [checkingPrn, setCheckingPrn] = useState(false);
  const [prnResult, setPrnResult] = useState<{
    checked: boolean;
    exists?: boolean;
    isPaid?: boolean;
    student?: { full_name: string; prn: string; branch?: string };
    message?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        if (data.events) {
          setEvents(data.events.slice(0, 3));
        }
      })
      .catch((err) => console.error("Error loading events:", err))
      .finally(() => setLoadingEvents(false));
  }, []);

  const handlePrnCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prnInput.trim()) return;

    setCheckingPrn(true);
    setPrnResult(null);

    try {
      const res = await fetch("/api/memberships/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prn: prnInput }),
      });
      const data = await res.json();
      setPrnResult({
        checked: true,
        exists: data.exists,
        isPaid: data.isPaid,
        student: data.student,
        message: data.message,
      });
    } catch {
      setPrnResult({
        checked: true,
        exists: false,
        isPaid: false,
        message: "Failed to connect to verification server. Please retry.",
      });
    } finally {
      setCheckingPrn(false);
    }
  };
return (
  
    <div className="min-h-screen flex flex-col bg-[#fbf5eb]">
      <Navbar />

      {/* Hero Section matching sesa-omega.vercel.app */}
      <section className="relative min-h-[760px] bg-[#08162a] pb-20 pt-28 text-[#fbf5eb] sm:min-h-[820px] sm:pt-32 lg:min-h-screen lg:pb-28 lg:pt-36 overflow-hidden">
        {/* Glows and Hero Grid */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-48 top-32 size-[32rem] rounded-full bg-[#1f4b78]/28 blur-3xl"></div>
          <div className="absolute -right-52 top-10 size-[34rem] rounded-full bg-[#b18345]/16 blur-3xl"></div>
          <div className="hero-grid absolute inset-0 opacity-30"></div>
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#fbf5eb] to-transparent"></div>
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
          {/* Left Column: Heading, Subtitle & CTAs */}
          <div className="max-w-3xl">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e0bd7d] backdrop-blur">
              <Sparkles className="size-4" />
              Department student association
            </div>

            {/* H1 Title */}
            <h1 className="mt-7 font-display text-4xl leading-[0.95] tracking-[-0.045em] sm:text-5xl md:text-6xl lg:text-[5.2rem] text-[#fbf5eb]">
              Where software engineers
              <span className="block text-[#e0bd7d]">build what&apos;s next.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              SESA is the student-led platform for practical learning, technical collaboration,
              stronger projects and a more connected Software Engineering community at MITAOE.
            </p>

            {/* CTA Buttons */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap items-center">
              <Link
                href="/pay-fee"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#b18345] hover:bg-[#8b6535] px-6 py-3.5 text-sm font-bold text-[#08162a] transition shadow-lg shadow-[#b18345]/25"
              >
                <ShieldCheck className="size-4" />
                Pay Association Fee
              </Link>
              <Link
                href="/events"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3.5 text-sm font-medium text-[#fbf5eb] transition"
              >
                Explore events
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 hover:border-white/25 px-5 py-3.5 text-sm font-medium text-slate-300 hover:text-white transition"
              >
                Admin Login &rarr;
              </Link>
            </div>

            {/* Department Focus Pillars (No stats or promises) */}
            <div className="mt-12 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-7">
              <div>
                <p className="font-display text-base sm:text-lg text-[#fbf5eb] tracking-wide">Workshops</p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#e0bd7d]">
                  Hands-on Sessions
                </p>
              </div>
              <div>
                <p className="font-display text-base sm:text-lg text-[#fbf5eb] tracking-wide">Hackathons</p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#e0bd7d]">
                  Collaborative Coding
                </p>
              </div>
              <div>
                <p className="font-display text-base sm:text-lg text-[#fbf5eb] tracking-wide">Community</p>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#e0bd7d]">
                  Student Network
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: SESA Crest Badge Card (Exact component from sesa-omega) */}
          <div className="relative mx-auto w-full max-w-[570px] lg:mx-0 lg:justify-self-end">
            <div className="absolute inset-8 rounded-full bg-[#b18345]/16 blur-3xl"></div>
            <div className="relative rounded-[2.4rem] border border-white/12 bg-white/[0.055] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
              {/* Inner Ivory Card with Crest */}
              <div className="relative rounded-[1.9rem] border border-white/10 bg-[linear-gradient(145deg,#fdf6eb_0%,#efe4d0_100%)] px-6 py-8 sm:px-10 sm:py-10 overflow-hidden text-center">
                <div className="absolute -right-12 -top-12 size-40 rounded-full border border-[#b18345]/20 pointer-events-none"></div>
                <div className="absolute -bottom-16 -left-14 size-48 rounded-full border border-[#08162a]/10 pointer-events-none"></div>

                {/* Official SESA Crest Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="SESA official crest"
                  width={320}
                  height={320}
                  className="relative mx-auto h-auto w-[240px] object-cover drop-shadow-[0_28px_45px_rgba(17,38,71,0.18)] sm:w-[280px]"
                  style={{
                    mixBlendMode: "multiply",
                    borderRadius: "24px",
                  }}
                  src="/sesa_logo_white.png"
                />
              </div>

              {/* Bottom Motto Strip */}
              <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-[#102137]/80 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e0bd7d]">
                    Our motto
                  </p>
                  <p className="mt-1 font-display text-xl tracking-[0.07em] text-[#fbf5eb]">
                    Dream • Build • Achieve
                  </p>
                </div>
                <div className="hidden size-11 place-items-center rounded-full border border-white/12 text-[#e0bd7d] sm:grid">
                  <Lightbulb className="size-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student Eligibility Quick-Check Section */}
      <section className="relative z-10 -mt-10 px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-[#b18345]/25 bg-white p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-1 max-w-xl">
                <span className="inline-flex items-center rounded-full border border-[#b18345]/30 bg-[#b18345]/10 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#8b6535]">
                  Student Eligibility Terminal
                </span>
                <h3 className="font-display text-2xl sm:text-3xl text-[#08162a]">
                  Check SESA Membership Standing
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter your College PRN to instantly verify payment clearance for event registrations
                  and entrance admission.
                </p>
              </div>

              {/* Inline PRN Form */}
              <form onSubmit={handlePrnCheck} className="flex-1 max-w-md w-full space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={prnInput}
                    onChange={(e) => setPrnInput(e.target.value)}
                    placeholder="Enter College PRN (e.g. MIT2024001)"
                    required
                    className="flex-1 px-4 py-2.5 bg-[#fbf5eb] border border-[#e0bd7d]/40 rounded-lg text-sm text-[#08162a] font-mono uppercase focus:outline-none focus:border-[#b18345]"
                  />
                  <button
                    type="submit"
                    disabled={checkingPrn}
                    className="px-5 py-2.5 bg-[#08162a] hover:bg-[#102137] disabled:opacity-50 text-[#fbf5eb] font-semibold text-xs uppercase tracking-wider rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {checkingPrn ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 text-[#e0bd7d]" />
                        Verify
                      </>
                    )}
                  </button>
                </div>

                {/* PRN Status Output */}
                {prnResult && (
                  <div
                    className={`p-3 rounded-lg text-xs border ${
                      prnResult.isPaid
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-amber-50 border-amber-300 text-amber-800"
                    }`}
                  >
                    {prnResult.isPaid && prnResult.student ? (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold">
                            {prnResult.student.full_name} ({prnResult.student.prn})
                          </p>
                          <p className="text-[11px] text-emerald-700">
                            Membership Status: PAID & VERIFIED
                          </p>
                        </div>
                        <Link
                          href="/events"
                          className="px-3 py-1 bg-emerald-700 text-white font-semibold rounded text-[11px] hover:bg-emerald-800 whitespace-nowrap"
                        >
                          Register for Events &rarr;
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p>{prnResult.message}</p>
                        <p className="text-[11px] text-amber-900 font-medium">
                          Please pay the Association Fee before registering for events.
                        </p>
                        <div className="pt-1">
                          <Link
                            href="/pay-fee"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#08162a] text-[#e0bd7d] hover:text-white rounded text-[11px] font-bold uppercase tracking-wider transition"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Pay Association Fee (₹1,000) &rarr;
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events Section matching sesa-omega */}
      <section className="section-pad">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between border-b border-[#08162a]/10 pb-8">
            <div className="max-w-3xl text-[#08162a]">
              <span className="inline-flex items-center rounded-full border border-current/15 bg-current/8 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] mb-4 text-[#8b6535]">
                Upcoming events
              </span>
              <h2 className="font-display text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
                Worth showing up for.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 sm:text-lg text-slate-600">
                Focused experiences designed around learning, building and meeting people who take
                engineering seriously.
              </p>
            </div>

            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#08162a] hover:text-[#8b6535] transition"
            >
              Browse all events
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Event Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loadingEvents ? (
              [1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-2xl p-6 border border-[#e0bd7d]/20 animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-6 bg-gray-200 rounded w-3/4" />
                  <div className="h-16 bg-gray-200 rounded" />
                </div>
              ))
            ) : events.length === 0 ? (
              <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-[#e0bd7d]/20">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No published events scheduled right now.</p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl border border-[#b18345]/20 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-7 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded bg-[#fbf5eb] text-[#8b6535] border border-[#e0bd7d]/30">
                        {event.status === "published" ? "Open" : event.status}
                      </span>
                      {event.walk_ins_enabled && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          Walk-ins On
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-2xl text-[#08162a] group-hover:text-[#8b6535] transition">
                      <Link href={`/events/${event.slug}`}>{event.name}</Link>
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {event.summary}
                    </p>

                    <div className="pt-4 border-t border-[#fbf5eb] space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="size-3.5 text-[#b18345]" />
                        <span>{formatDateIST(event.starts_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-[#b18345]" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-[#fbf5eb]/60 border-t border-[#b18345]/15">
                    <Link
                      href={`/events/${event.slug}`}
                      className="w-full py-2.5 bg-[#08162a] hover:bg-[#102137] text-[#fbf5eb] text-xs font-semibold uppercase tracking-wider rounded-lg text-center block transition"
                    >
                      View Details & Register
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Academic Engineering Pillars Section */}
      <section className="bg-[#08162a] text-[#fbf5eb] py-20 px-5 sm:px-8 lg:px-10 border-t border-white/10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl space-y-3 mb-12">
            <span className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-[#e0bd7d]">
              Our Foundation
            </span>
            <h2 className="font-display text-3xl sm:text-5xl text-[#fbf5eb]">
              A practical bridge between classrooms and real engineering.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We focus on the skills industry architects look for: systems architecture, code
              quality, collaboration, and building with purpose.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
              <h4 className="font-display text-xl text-[#e0bd7d]">Zero Paper Attendance</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Seamless PRN-based digital verification at the venue entrance. Fast, reliable, and
                integrated directly with departmental eligibility records.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
              <h4 className="font-display text-xl text-[#e0bd7d]">Verified Student Membership</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paid departmental memberships grant admission to technical hackathons, masterclasses,
                and industry speaker series.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
              <h4 className="font-display text-xl text-[#e0bd7d]">On-the-spot Walk-ins</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Volunteers can register and check in eligible students in a single safe workflow right
                at the event door.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
