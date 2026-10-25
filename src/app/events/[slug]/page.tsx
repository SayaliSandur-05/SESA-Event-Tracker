"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { EventItem, EventRegistration } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
  Mail,
  Phone,
  Ticket,
  Printer,
  ShieldAlert,
  X,
} from "lucide-react";



export default function EventDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Student registration workflow state
  const [step, setStep] = useState<"prn_check" | "register_form" | "confirmed">("prn_check");
  const [prn, setPrn] = useState("");
  const [verifyingPrn, setVerifyingPrn] = useState(false);
  const [prnError, setPrnError] = useState<string | null>(null);

  // Verified member details
  const [verifiedStudent, setVerifiedStudent] = useState<{
    prn: string;
    full_name: string;
    email: string;
    branch: string;
    academic_year: string;
  } | null>(null);

  // Form inputs
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Confirmed registration
  const [confirmedReg, setConfirmedReg] = useState<EventRegistration | null>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/events/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => {
        if (data.stats && data.stats.event) {
          setEvent(data.stats.event);
        } else {
          setError("Event not found");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  // Step 1: Verify PRN
  const handleVerifyPrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prn.trim() || !event) return;

    setVerifyingPrn(true);
    setPrnError(null);

    try {
      const res = await fetch("/api/memberships/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prn: prn.trim(), eventId: event.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify PRN");
      }

      if (data.alreadyRegistered) {
        setPrnError(`Student ${prn.toUpperCase()} is already registered for this event.`);
        return;
      }

      if (!data.isPaid) {
        setShowFeeModal(true);
        setPrnError(data.message || "Association Fee has not been paid for this PRN.");
        return;
      }

      // Eligible! Proceed to Form
      setVerifiedStudent(data.student);
      setEmail(data.student.email || `${data.student.prn.toLowerCase()}@mitaoe.ac.in`);
      setStep("register_form");
    } catch (err: any) {
      setPrnError(err.message);
    } finally {
      setVerifyingPrn(false);
    }
  };

  // Step 2: Submit Registration
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !verifiedStudent) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          prn: verifiedStudent.prn,
          email: email.trim(),
          contact: contact.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setConfirmedReg(data.registration);
      setStep("confirmed");
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F1E6]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#09172B] border-t-transparent rounded-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8F1E6]">
        <Navbar />
        <div className="max-w-xl mx-auto my-20 p-8 bg-white rounded-xl border border-[#EFE8DC] text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="font-serif text-2xl font-bold text-[#09172B]">Event Not Found</h2>
          <p className="text-xs text-[#34445A]">
            The event you are looking for may have been archived or removed.
          </p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#09172B] text-white text-xs font-semibold rounded uppercase"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Events
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const now = new Date();

const isRegistrationOpen =
  event.status === "published" &&
  !!event.registration_opens_at &&
  !!event.registration_closes_at &&
  new Date(event.registration_opens_at).getTime() <= now.getTime() &&
  now.getTime() <= new Date(event.registration_closes_at).getTime() &&
  new Date(event.ends_at).getTime() >= now.getTime();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F1E6]">
      <Navbar />

      {/* Breadcrumb Header */}
      <section className="bg-[#09172B] text-white py-8 px-4 sm:px-6 lg:px-8 border-b border-[#263346]">
        <div className="max-w-7xl mx-auto space-y-2">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs text-[#E4BC70] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to All Events
          </Link>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                isRegistrationOpen ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-gray-700 text-gray-300"
              }`}
            >
              {isRegistrationOpen ? "Registration Open" : event.status.replace("_", " ")}
            </span>
            {event.walk_ins_enabled && (
              <span className="text-[10px] bg-[#263346] text-[#E4BC70] px-2 py-0.5 rounded border border-[#34445A]">
                Walk-ins Enabled at Entrance
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white pt-1">
            {event.name}
          </h1>
        </div>
      </section>

      {/* Main Grid: Details + Interactive Registration Card */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Event Overview & Information */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="space-y-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-[#34445A]">
                  Event Summary
                </span>
                <p className="text-base text-[#09172B] font-medium leading-relaxed">
                  {event.summary}
                </p>
              </div>

              {/* Event Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EFE8DC]">
                <div className="flex items-start gap-3 p-3 bg-[#F8F1E6]/50 rounded-lg border border-[#EFE8DC]">
                  <Clock className="w-5 h-5 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34445A]">
                      Date & Schedule
                    </p>
                    <p className="text-xs font-medium text-[#09172B] mt-0.5">
                      {formatDateIST(event.starts_at)}
                    </p>
                    <p className="text-[10px] text-gray-500">to {formatDateIST(event.ends_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#F8F1E6]/50 rounded-lg border border-[#EFE8DC]">
                  <MapPin className="w-5 h-5 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34445A]">
                      Venue Location
                    </p>
                    <p className="text-xs font-medium text-[#09172B] mt-0.5">{event.venue}</p>
                    <p className="text-[10px] text-gray-500">MITAOE Campus, Alandi</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#F8F1E6]/50 rounded-lg border border-[#EFE8DC]">
                  <Users className="w-5 h-5 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34445A]">
                      Capacity Limit
                    </p>
                    <p className="text-xs font-medium text-[#09172B] mt-0.5">
                      {event.capacity ? `${event.capacity} Attendees` : "Open / Unlimited"}
                    </p>
                    <p className="text-[10px] text-gray-500">Controlled by server concurrency</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#F8F1E6]/50 rounded-lg border border-[#EFE8DC]">
                  <ShieldCheck className="w-5 h-5 text-[#C69A45] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#34445A]">
                      Eligibility Requirement
                    </p>
                    <p className="text-xs font-medium text-[#09172B] mt-0.5">SESA Paid Membership</p>
                    <p className="text-[10px] text-gray-500">Verified via College PRN</p>
                  </div>
                </div>
              </div>

              {/* Full Description */}
              <div className="pt-4 border-t border-[#EFE8DC] space-y-3">
                <h3 className="font-serif text-lg font-bold text-[#09172B]">
                  Detailed Description & Guidelines
                </h3>
                <div className="text-xs text-[#34445A] leading-relaxed whitespace-pre-line">
                  {event.description}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Step-by-Step Registration Desk */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl border border-[#EFE8DC] shadow-md p-6 sm:p-8 relative sticky top-24">
              <div className="flex items-center justify-between pb-4 border-b border-[#EFE8DC]">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#C69A45] block">
                    Student Portal
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#09172B]">
                    Event Registration
                  </h3>
                </div>
                <Ticket className="w-6 h-6 text-[#09172B]" />
              </div>

              {!isRegistrationOpen ? (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center space-y-2">
                  <Lock className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm font-semibold text-gray-700">Registration Is Closed</p>
                  <p className="text-xs text-gray-500">
                    This event is currently {event.status.replace("_", " ")}. Direct inquiries to
                    SESA event coordinators.
                  </p>
                </div>
              ) : step === "prn_check" ? (
                /* Step 1: PRN Verification */
                <div className="mt-6 space-y-4">
                  <p className="text-xs text-[#34445A] leading-relaxed">
                    Please enter your College PRN to verify membership eligibility. Only verified
                    paid members can complete online registration.
                  </p>

                  <form onSubmit={handleVerifyPrn} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#09172B] uppercase tracking-wider mb-1">
                        College PRN
                      </label>
                      <input
                        type="text"
                        value={prn}
                        onChange={(e) => setPrn(e.target.value)}
                        placeholder="e.g. MIT2024001"
                        required
                        className="w-full px-3.5 py-2.5 border border-[#EFE8DC] rounded text-sm text-[#09172B] font-mono uppercase focus:outline-none focus:border-[#09172B]"
                      />
                    </div>

                    {prnError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{prnError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={verifyingPrn}
                      className="w-full py-2.5 bg-[#09172B] hover:bg-[#263346] disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {verifyingPrn ? (
                        <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-[#E4BC70]" />
                          Verify Eligibility & Proceed
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-4 border-t border-[#EFE8DC] text-[11px] text-[#34445A] space-y-1.5">
                    <p className="font-semibold text-[#09172B]">Haven&apos;t paid the Association Fee yet?</p>
                    <p>
                      Please pay the Association Fee before registering for events.
                    </p>
                    <Link
                      href="/pay-fee"
                      className="inline-flex items-center gap-1 text-[#8b6535] hover:text-[#09172B] font-bold underline"
                    >
                      Pay Association Fee (₹1,000) &rarr;
                    </Link>
                  </div>
                </div>
              ) : step === "register_form" && verifiedStudent ? (
                /* Step 2: Confirmation & Submission */
                <div className="mt-6 space-y-4">
                  {/* Verified Student Badge */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Membership Verified: Paid</span>
                    </div>
                    <p className="text-[#09172B] font-bold text-sm">
                      {verifiedStudent.full_name}
                    </p>
                    <p className="text-gray-600">
                      PRN: {verifiedStudent.prn} • {verifiedStudent.branch}
                    </p>
                  </div>

                  <form onSubmit={handleSubmitRegistration} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#09172B] uppercase tracking-wider mb-1">
                        Institutional Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-9 pr-3.5 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#09172B] uppercase tracking-wider mb-1">
                        Contact Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder="e.g. 9820011221"
                          className="w-full pl-9 pr-3.5 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                        />
                      </div>
                    </div>

                    {submitError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {submitError}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setStep("prn_check")}
                        className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-[#09172B] text-xs font-medium rounded transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2.5 bg-[#09172B] hover:bg-[#263346] disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wider rounded transition flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          "Confirm Registration"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : step === "confirmed" && confirmedReg ? (
                /* Step 3: Success Confirmation */
                <div className="mt-6 space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>

                  <div>
                    <h4 className="font-serif text-xl font-bold text-[#09172B]">
                      Registration Confirmed!
                    </h4>
                    <p className="text-xs text-gray-600 mt-1">
                      You are successfully registered for this event.
                    </p>
                  </div>

                  <div className="bg-[#F8F1E6] p-4 rounded-lg border border-[#EFE8DC] text-left text-xs space-y-2">
                    <div className="flex justify-between border-b border-[#EFE8DC] pb-2">
                      <span className="text-gray-500">Registration ID:</span>
                      <span className="font-mono font-bold text-[#09172B]">
                        {confirmedReg.id}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#EFE8DC] pb-2">
                      <span className="text-gray-500">Student Name:</span>
                      <span className="font-medium text-[#09172B]">
                        {confirmedReg.student_name_snapshot}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-[#EFE8DC] pb-2">
                      <span className="text-gray-500">College PRN:</span>
                      <span className="font-mono font-medium text-[#09172B]">
                        {confirmedReg.prn}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entry Method:</span>
                      <span className="text-[#C69A45] font-semibold uppercase">
                        PRN Lookup at Venue
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-500 leading-normal">
                    No physical or QR ticket required. Simply state your College PRN to the SESA
                    desk volunteers at the entrance of {event.venue}.
                  </p>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      onClick={() => window.print()}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-[#09172B] text-xs font-medium rounded flex items-center justify-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print / Save Confirmation
                    </button>
                    <Link
                      href="/my-registration"
                      className="w-full py-2 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-semibold uppercase tracking-wider rounded transition"
                    >
                      View All My Registrations
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {/* Pay Association Fee Required Popup Modal */}
      {showFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#08162a] border border-[#b18345] rounded-2xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowFeeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#b18345]/20 text-[#e0bd7d] flex items-center justify-center border border-[#b18345]/40 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#e0bd7d] block">
                Association Fee Required
              </span>
              <h3 className="font-display text-2xl font-bold text-white">
                Pay Association Fee Before Registering
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                College PRN <strong className="text-[#e0bd7d] font-mono">{prn.toUpperCase()}</strong> was not found in the verified ₹1,000 Association Fee records.
              </p>
              <p className="text-xs text-slate-400">
                Please complete your Association Fee payment to register for this event.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Link
                href="/pay-fee"
                className="flex-1 py-3 bg-[#b18345] hover:bg-[#8b6535] text-[#08162a] font-bold text-xs uppercase tracking-wider rounded-lg text-center transition shadow flex items-center justify-center gap-1.5"
              >
                Pay Association Fee (₹1,000) &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setShowFeeModal(false)}
                className="py-3 px-4 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
