"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SesaLogo } from "@/components/branding/SesaLogo";
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  GraduationCap,
  Copy,
  Check,
  Download,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function PayAssociationFeePage() {
  // Form states
  const [prn, setPrn] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [academicYear, setAcademicYear] = useState("Third Year (TY)");
  const [paymentMode, setPaymentMode] = useState("UPI QR Code");
  const [transactionRef, setTransactionRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Success state
  const [paidRecord, setPaidRecord] = useState<{
    prn: string;
    full_name: string;
    payment_status: string;
    fee_amount: number;
    id: string;
    transaction_ref?: string;
  } | null>(null);

  const copyUpiId = () => {
    navigator.clipboard.writeText("89753101@ubin");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionRef.trim() && paymentMode === "UPI QR Code") {
      setError("Please enter your 12-digit UPI UTR / Transaction Reference number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/memberships/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prn: prn.trim().toUpperCase(),
          full_name: fullName.trim(),
          email: email.trim() || undefined,
          contact: contact.trim() || undefined,
          academic_year: academicYear,
          branch: "Department Of Software Engineering",
          payment_mode: paymentMode,
          transaction_ref: transactionRef.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment record submission failed");
      }

      setPaidRecord({
        ...data.membership,
        transaction_ref: transactionRef.trim(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08162a] text-[#fbf5eb] flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#1f4b78]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#b18345]/15 rounded-full blur-3xl pointer-events-none" />

     
      {/* Top Header bar */}
      <header className="relative z-10 border-b border-white/10 px-5 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-block">
            <SesaLogo size={42} showText={true} textColor="light" />
          </Link>

          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/20 hover:border-white/40 text-slate-300 hover:text-white transition font-medium"
            >
              &larr; Home
            </Link>

            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/20 hover:border-white/40 text-slate-300 hover:text-white transition font-medium"
            >
              Browse Events &rarr;
            </Link>
          </div>
        </div>
      </header>


      {/* Split Hero / Form Area */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start w-full">
          {/* Left Column: Form or Success Card */}
          <div className="lg:col-span-7">
            {paidRecord ? (
              /* Payment Successful Card */
              <div className="bg-[#102137]/95 border border-emerald-500/50 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm space-y-6 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] uppercase tracking-widest font-mono text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-500/30 px-3 py-1 rounded-full inline-block">
                    Payment Successful
                  </span>
                  <h2 className="font-display text-3xl font-bold text-white">
                    Payment Recorded Successfully
                  </h2>
                  <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                    Thank you, <strong className="text-white">{paidRecord.full_name}</strong>. Your Association Fee payment of ₹{paidRecord.fee_amount} has been verified and recorded for College PRN <strong className="text-[#e0bd7d] font-mono">{paidRecord.prn}</strong>.
                  </p>
                  <p className="text-xs text-emerald-300/90 font-medium">
                    ✓ You are now eligible to register for all Department Of Software Engineering events.
                  </p>
                </div>

                {/* Receipt Details Pass */}
                <div className="bg-[#08162a] border border-[#b18345]/40 rounded-xl p-5 text-left space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-[11px] font-mono uppercase text-[#e0bd7d] font-semibold">
                      Department Association Fee Receipt
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase">
                      Status: {paidRecord.payment_status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Student Name</span>
                      <strong className="text-white font-medium text-sm">{paidRecord.full_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">College PRN</span>
                      <strong className="text-white font-mono text-sm">{paidRecord.prn}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Amount Paid</span>
                      <strong className="text-[#e0bd7d] font-semibold text-sm">₹{paidRecord.fee_amount}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Transaction UTR</span>
                      <strong className="text-slate-200 font-mono text-xs">
                        {paidRecord.transaction_ref || "Recorded at Desk"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Next Steps Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Link
                    href="/events"
                    className="flex-1 py-3.5 bg-[#b18345] hover:bg-[#8b6535] text-[#08162a] font-bold text-xs uppercase tracking-wider rounded-lg transition shadow flex items-center justify-center gap-2"
                  >
                    Explore & Register for Events
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/my-registration"
                    className="py-3.5 px-6 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition text-center"
                  >
                    Check Registration Status
                  </Link>
                </div>
              </div>
            ) : (
              /* Payment Form */
              <div className="bg-[#102137]/90 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#b18345]/40 bg-[#b18345]/15 text-[#e0bd7d] text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Department Of Software Engineering
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    Pay Association Fee
                  </h1>
                  <p className="text-sm text-slate-300 mt-1.5 font-medium">
                    Pay Association Fee before registering for events.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Paying the ₹1,000 annual association fee confirms your eligibility for all departmental workshops, technical hackathons, and certifications.
                  </p>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-950/80 border border-red-500/40 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <span>{error}</span>
                      {error.includes("ALREADY") && (
                        <div className="mt-2">
                          <Link
                            href="/events"
                            className="inline-block px-3 py-1 bg-white text-[#08162a] font-bold rounded text-[11px]"
                          >
                            Proceed to Events &rarr;
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  {/* Step 1: Student Information */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#e0bd7d] block">
                      1. Student Details
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                          College PRN *
                        </label>
                        <input
                          type="text"
                          value={prn}
                          onChange={(e) => setPrn(e.target.value.toUpperCase())}
                          placeholder="e.g. MIT2024045"
                          required
                          className="w-full px-3.5 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white font-mono text-sm uppercase focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                          Full Name (as on College ID) *
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Atharva Joshi"
                          required
                          className="w-full px-3.5 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                          College Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@mitaoe.ac.in"
                          className="w-full px-3.5 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white text-sm focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                          WhatsApp / Contact Number *
                        </label>
                        <input
                          type="tel"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder="9820011221"
                          required
                          className="w-full px-3.5 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                        Academic Year
                      </label>
                      <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white text-sm focus:outline-none"
                      >
                        <option value="First Year (FY)">First Year (FY)</option>
                        <option value="Second Year (SY)">Second Year (SY)</option>
                        <option value="Third Year (TY)">Third Year (TY)</option>
                        <option value="Final Year (B.Tech)">Final Year (B.Tech)</option>
                      </select>
                    </div>
                  </div>

                  {/* Step 2: Payment Details */}
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#e0bd7d] block">
                      2. Association Fee Payment (₹1,000)
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                          Payment Method
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white text-sm focus:outline-none"
                        >
                          <option value="UPI QR Code">UPI QR Code (Recommended)</option>
                          <option value="Bank NEFT/IMPS">Bank Transfer / NEFT</option>
                          <option value="Cash at Desk">Cash at Venue Desk</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                          UPI UTR / Reference No. *
                        </label>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="12-digit UPI UTR (e.g. 728104819201)"
                          required={paymentMode === "UPI QR Code"}
                          className="w-full px-3.5 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white font-mono text-sm focus:outline-none"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      * After scanning the QR code and completing payment, paste the 12-digit UTR / transaction ID here to record your payment.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#b18345] hover:bg-[#8b6535] disabled:opacity-50 text-[#08162a] font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    {loading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-[#08162a] border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Submit & Confirm ₹1,000 Association Fee
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Official Union Bank QR Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#102137]/80 border border-white/10 rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#e0bd7d] block">
                    Official Payment Gateway
                  </span>
                  <h3 className="font-display text-xl font-bold text-white">
                    Scan & Pay with Any UPI App
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#b18345]/20 text-[#e0bd7d] text-xs font-bold font-mono border border-[#b18345]/40">
                  ₹1,000
                </span>
              </div>

              {/* Official QR Code Card */}
              <div className="bg-white rounded-xl p-3 shadow-lg flex flex-col items-center border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/sesa-upi-qr.png"
                  alt="Union Bank of India UPI QR - Association of Students"
                  className="w-full max-w-[280px] h-auto object-contain rounded-lg"
                />
              </div>

              {/* UPI Details Box with Copy button */}
              <div className="p-4 bg-[#08162a] rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Beneficiary Name:</span>
                  <span className="font-semibold text-white">ASSOCIATION OF STUDENTS</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Bank:</span>
                  <span className="font-semibold text-white">Union Bank of India</span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                  <span className="text-slate-400">UPI ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-[#e0bd7d] font-mono font-bold bg-[#102137] px-2 py-0.5 rounded border border-[#b18345]/30">
                      89753101@ubin
                    </code>
                    <button
                      type="button"
                      onClick={copyUpiId}
                      className="p-1.5 text-slate-300 hover:text-white bg-white/10 hover:bg-white/15 rounded transition cursor-pointer"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* PDF Download link */}
              <div className="flex items-center justify-between text-xs pt-1">
                <a
                  href="/sesa-payment-qr.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[#e0bd7d] hover:text-white transition font-medium text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download / View QR PDF
                </a>
                <span className="text-[11px] text-slate-400">
                  Supports GPay, PhonePe, Paytm
                </span>
              </div>

              {/* Critical Notice */}
              <div className="p-3.5 bg-[#08162a]/80 rounded-xl border border-[#b18345]/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#e0bd7d] font-semibold text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Important Fee Information</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  The ₹1,000 Association Fee is an annual departmental contribution for attending student events and workshops. <strong>Payment of this fee does not grant volunteer or organizer account credentials.</strong>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer minimal */}
      <footer className="relative z-10 border-t border-white/10 px-5 py-4 text-center text-xs text-slate-400">
        Department Of Software Engineering
      </footer>
    </div>
  );
}
