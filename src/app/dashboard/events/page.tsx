"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { EventItem } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import {
  Calendar,
  PlusCircle,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  Edit3,
  BarChart2,
  Filter,
} from "lucide-react";

export default function DashboardEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadEvents = () => {
    fetch("/api/events?all=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
      })
      .catch((err) => console.error("Failed to load events:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filter === "all") return true;
    return e.status === filter;
  });

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DC] pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-[#34445A]">
            Event Administration
          </span>
          <h1 className="font-serif text-3xl font-bold text-[#09172B]">Events Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Configure lifecycle, attendance tracking, and export rosters.
          </p>
        </div>

        <Link
          href="/dashboard/events/new"
          className="px-4 py-2.5 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4 text-[#E4BC70]" />
          Create New Event
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {[
          { id: "all", label: "All Events" },
          { id: "published", label: "Published" },
          { id: "draft", label: "Drafts" },
          { id: "registration_closed", label: "Closed" },
          { id: "completed", label: "Completed" },
          { id: "archived", label: "Archived" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              filter === tab.id
                ? "bg-[#09172B] text-white"
                : "bg-white text-gray-600 hover:bg-[#EFE8DC] border border-[#EFE8DC]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events Table / Card List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white p-6 rounded-xl border border-[#EFE8DC] animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EFE8DC] p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-[#09172B]">No Events Found</h3>
          <p className="text-xs text-gray-500">Create a new event to begin managing registrations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl border border-[#EFE8DC] p-6 shadow-sm hover:shadow transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                      event.status === "published"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : event.status === "draft"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : event.status === "completed"
                        ? "bg-blue-50 text-blue-800 border border-blue-200"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {event.status.replace("_", " ")}
                  </span>
                  {event.walk_ins_enabled && (
                    <span className="text-[10px] font-medium bg-[#F8F1E6] text-[#34445A] px-2 py-0.5 rounded border border-[#EFE8DC]">
                      Walk-ins On
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 font-mono">slug: /{event.slug}</span>
                </div>

                <h3 className="font-serif text-xl font-bold text-[#09172B]">
                  {event.name}
                </h3>

                <p className="text-xs text-gray-600 line-clamp-2 max-w-3xl leading-relaxed">
                  {event.summary}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#C69A45]" />
                    {formatDateIST(event.starts_at)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#C69A45]" />
                    {event.venue}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#C69A45]" />
                    Capacity: {event.capacity ? `${event.capacity} seats` : "Unlimited"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                <Link
                  href={`/dashboard/events/${event.id}`}
                  className="px-3.5 py-2 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5 shadow-sm"
                >
                  <BarChart2 className="w-3.5 h-3.5 text-[#E4BC70]" />
                  Reports & Attendees
                </Link>
                <Link
                  href={`/dashboard/events/${event.id}/edit`}
                  className="px-3.5 py-2 bg-[#F8F1E6] hover:bg-[#EFE8DC] text-[#09172B] border border-[#EFE8DC] text-xs font-semibold uppercase tracking-wider rounded transition flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
