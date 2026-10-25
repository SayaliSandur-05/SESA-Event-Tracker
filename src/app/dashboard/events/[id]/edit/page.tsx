"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { EventItem } from "@/lib/types";



export default function EditEventPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [walkInsEnabled, setWalkInsEnabled] = useState(true);
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/events/${eventId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.stats?.event) {
          const e: EventItem = data.stats.event;
          setName(e.name);
          setSlug(e.slug);
          setSummary(e.summary);
          setDescription(e.description);
          setVenue(e.venue);
          // format to datetime-local
          setStartsAt(e.starts_at ? new Date(e.starts_at).toISOString().slice(0, 16) : "");
          setEndsAt(e.ends_at ? new Date(e.ends_at).toISOString().slice(0, 16) : "");
          setCapacity(e.capacity ? String(e.capacity) : "");
          setWalkInsEnabled(e.walk_ins_enabled);
          setStatus(e.status);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          summary,
          description,
          venue,
          starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
          ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
          capacity: capacity ? parseInt(capacity, 10) : null,
          walk_ins_enabled: walkInsEnabled,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update event");

      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/events/${eventId}`), 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to archive / delete this event?")) return;

    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.push("/dashboard/events");
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-gray-500">Loading event configuration...</div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link
            href={`/dashboard/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#09172B] hover:text-[#C69A45] transition font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Event
          </Link>
          <h1 className="font-serif text-3xl font-bold text-[#09172B]">Edit Event</h1>
        </div>

        <button
          onClick={handleDelete}
          className="px-3.5 py-2 text-xs font-semibold uppercase text-red-600 hover:bg-red-50 rounded border border-red-200 transition flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Archive Event
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Event updated successfully! Redirecting...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#EFE8DC] p-6 sm:p-8 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
            Event Title *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-[#EFE8DC] rounded-lg text-sm text-[#09172B] focus:outline-none focus:border-[#09172B]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
            Event Lifecycle Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-[#EFE8DC] rounded-lg text-sm text-[#09172B] bg-white focus:outline-none focus:border-[#09172B]"
          >
            <option value="draft">Draft (Unlisted)</option>
            <option value="published">Published (Open for Registration)</option>
            <option value="registration_closed">Registration Closed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
            Short Summary *
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
            required
            className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
            Full Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            required
            className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 border border-[#EFE8DC] rounded-lg text-sm text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              Maximum Capacity (Seats)
            </label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-3.5 py-2.5 border border-[#EFE8DC] rounded-lg text-sm text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
              Starts At
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
              Ends At
            </label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              className="w-full px-3.5 py-2 border border-[#EFE8DC] rounded-lg text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
            />
          </div>
        </div>

        <div>
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

        <div className="pt-4 border-t border-[#EFE8DC] flex justify-end gap-3">
          <Link
            href={`/dashboard/events/${eventId}`}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider rounded transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#09172B] hover:bg-[#263346] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-2 shadow"
          >
            {saving ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Save className="w-4 h-4 text-[#E4BC70]" />
                Update Event
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
