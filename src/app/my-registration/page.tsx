"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatDateIST } from "@/lib/utils";
import {
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  ShieldCheck,
  User,
  ArrowRight,
} from "lucide-react";



export default function MyRegistrationPage() {
  const [prnInput, setPrnInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [data, setData] = useState<{
    prn: string;
    membership: {
      full_name: string;
      payment_status: string;
      branch: string;
      academic_year: string;
    } | null;
    registrations: Array<{
      id: string;
      registered_at: string;
      registration_type: string;
      registration_status: string;
      event: {
        id: string;
        name: string;
        slug: string;
        venue: string;
        starts_at: string;
        status: string;
      };
      attendance: {
        checked_in_at: string;
        method: string;
      } | null;
    }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prnInput.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/registrations/lookup?prn=${encodeURIComponent(prnInput.trim())}`);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Lookup failed");
      setData(resData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F1E6]">
      <Navbar />

      {/* Banner */}
      <section className="bg-[#09172B] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#263346]">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#E4BC70]">
            Student Verification
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Check Event Registration & Attendance Status
          </h1>
          <p className="text-sm text-[#AEB9C9] max-w-xl mx-auto leading-relaxed">
            Enter your College PRN to view all events you are registered for, your attendance check-in
            status, and your departmental SESA membership standing.
          </p>

          <form onSubmit={handleLookup} className="pt-4 max-w-md mx-auto flex gap-2">
            <input
              type="text"
              value={prnInput}
              onChange={(e) => setPrnInput(e.target.value)}
              placeholder="Enter College PRN (e.g. MIT2024001)"
              required
              className="flex-1 px-4 py-2.5 bg-[#263346] border border-[#34445A] rounded text-white text-sm focus:outline-none focus:border-[#E4BC70] font-mono uppercase"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#E4BC70] hover:bg-[#D4A95B] disabled:opacity-50 text-[#09172B] font-semibold text-xs uppercase tracking-wider rounded transition flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-[#09172B] border-t-transparent rounded-full" />
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  Lookup
                </>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Result Container */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2 mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {searched && data && (
          <div className="space-y-6">
            {/* Student Profile Card */}
            {data.membership ? (
              <div className="bg-white rounded-xl border border-[#EFE8DC] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#09172B] text-white flex items-center justify-center font-serif text-lg font-bold">
                    {data.membership.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#09172B]">
                      {data.membership.full_name}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono">
                      PRN: {data.prn} • {data.membership.branch}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                      data.membership.payment_status === "paid"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }`}
                  >
                    Membership: {data.membership.payment_status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">PRN not listed in SESA Membership Records</p>
                  <p className="mt-0.5 text-amber-800">
                    Please pay the association fee before registering for events, or visit the SESA desk at Software Engineering Department.
                  </p>
                  <div className="mt-2.5">
                    <Link
                      href="/pay-fee"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C] hover:bg-[#d8b556] text-[#09172B] font-semibold rounded text-xs transition shadow-sm"
                    >
                      Pay Association Fee (₹1,000) &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Registrations List */}
            <div className="space-y-4">
              <h3 className="font-serif text-xl font-bold text-[#09172B]">
                Registered Events ({data.registrations.length})
              </h3>

              {data.registrations.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#EFE8DC] p-8 text-center space-y-3">
                  <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-500">
                    No active event registrations found for PRN {data.prn}.
                  </p>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#09172B] text-white text-xs font-semibold rounded uppercase"
                  >
                    Browse Events & Register <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.registrations.map((reg) => (
                    <div
                      key={reg.id}
                      className="bg-white rounded-xl border border-[#EFE8DC] p-5 shadow-sm hover:shadow transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#F8F1E6] text-[#34445A] px-2 py-0.5 rounded border border-[#EFE8DC]">
                            {reg.registration_type}
                          </span>
                          <span className="text-xs text-gray-400">
                            Registered on {formatDateIST(reg.registered_at)}
                          </span>
                        </div>
                        <h4 className="font-serif text-lg font-bold text-[#09172B]">
                          {reg.event.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#C69A45]" />
                            {formatDateIST(reg.event.starts_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#C69A45]" />
                            {reg.event.venue}
                          </span>
                        </div>
                      </div>

                      {/* Attendance Status Badge */}
                      <div className="text-right flex-shrink-0">
                        {reg.attendance ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Attended / Present
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1">
                              Checked in: {formatDateIST(reg.attendance.checked_in_at)}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              Registered • Awaiting Entry
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1">
                              Show PRN at desk
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
