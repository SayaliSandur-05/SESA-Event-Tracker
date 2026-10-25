"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Calendar, MapPin, Users, Clock, AlertCircle } from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [registrationOpensAt, setRegistrationOpensAt] = useState("");
  const [registrationClosesAt, setRegistrationClosesAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [walkInsEnabled, setWalkInsEnabled] = useState(true);
  const [status, setStatus] = useState("draft");

  // Auto generate slug from title
  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          summary,
          description,
          venue,
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          registration_opens_at: registrationOpensAt
            ? new Date(registrationOpensAt).toISOString()
            : new Date().toISOString(),
          registration_closes_at: registrationClosesAt
            ? new Date(registrationClosesAt).toISOString()
            : new Date(startsAt).toISOString(),
          capacity: capacity ? parseInt(capacity, 10) : null,
          walk_ins_enabled: walkInsEnabled,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create event");

      router.push(`/dashboard/events/${data.event.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-4xl mx-auto w-full">
      <div className="space-y-1">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1.5 text-xs text-[#09172B] hover:text-[#C69A45] transition font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Events
        </Link>
        <h1 className="font-serif text-3xl font-bold text-[#09172B]">Create New SESA Event</h1>
        <p className="text-xs text-gray-500">
          Configure event details, registration schedules, and venue attendance constraints.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#EFE8DC] p-6 sm:p-8 shadow-sm space-y-6">
        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg font-bold text-[#09172B] border-b border-[#EFE8DC] pb-2">
            Basic Information
          </h3>

          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              Event Title *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. DevCraft 2026: 24-Hour National Hackathon"
              required
              className="w-full px-3.5 py-2.5 border border-[#EFE8DC] rounded-lg text-sm text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              URL Slug *
            </label>
            <div className="flex items-center">
              <span className="bg-[#F8F1E6] border border-r-0 border-[#EFE8DC] px-3 py-2.5 text-xs text-gray-500 rounded-l-lg font-mono">
                /events/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 border border-[#EFE8DC] rounded-r-lg text-sm text-[#09172B] font-mono focus:outline-none focus:border-[#09172B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              Short Summary * (Displays on cards)
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Brief 1-2 sentence overview of the event..."
              required
              className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              Full Description & Guidelines *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Complete event description, schedule, requirements, prerequisites..."
              required
              className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              Venue Location *
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Main Auditorium / Lab 402, MITAOE"
              required
              className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-sm text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>
        </div>

        {/* Schedule & Times */}
        <div className="space-y-4 pt-4 border-t border-[#EFE8DC]">
          <h3 className="font-serif text-lg font-bold text-[#09172B] border-b border-[#EFE8DC] pb-2">
            Schedule & Registration Window (Asia/Kolkata)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                Event Starts At *
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                Event Ends At *
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                Registration Opens At
              </label>
              <input
                type="datetime-local"
                value={registrationOpensAt}
                onChange={(e) => setRegistrationOpensAt(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                Registration Closes At
              </label>
              <input
                type="datetime-local"
                value={registrationClosesAt}
                onChange={(e) => setRegistrationClosesAt(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
              />
            </div>
          </div>
        </div>

        {/* Capacity & Control */}
        <div className="space-y-4 pt-4 border-t border-[#EFE8DC]">
          <h3 className="font-serif text-lg font-bold text-[#09172B] border-b border-[#EFE8DC] pb-2">
            Capacity & Lifecycle Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                Maximum Capacity (Leave blank for unlimited)
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                Initial Event Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] bg-white focus:outline-none focus:border-[#09172B]"
              >
                <option value="draft">Draft (Hidden from Public)</option>
                <option value="published">Published (Live & Open)</option>
                <option value="registration_closed">Registration Closed</option>
              </select>
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={walkInsEnabled}
                  onChange={(e) => setWalkInsEnabled(e.target.checked)}
                  className="rounded border-[#EFE8DC] text-[#09172B] focus:ring-[#09172B] w-4 h-4"
                />
                <span className="text-xs font-semibold text-[#09172B]">
                  Enable Walk-In Registration at Desk
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-4 border-t border-[#EFE8DC] flex justify-end gap-3">
          <Link
            href="/dashboard/events"
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider rounded transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#09172B] hover:bg-[#263346] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-2 shadow"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Save className="w-4 h-4 text-[#E4BC70]" />
                Create Event Record
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
