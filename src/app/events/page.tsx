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
  Search,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle,
} from "lucide-react";

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        if (data.events) {
          setEvents(data.events);
        }
      })
      .catch((err) => console.error("Error loading events:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.summary.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "all") return true;
    if (statusFilter === "open") return e.status === "published";
    if (statusFilter === "completed") return e.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F1E6]">
      <Navbar />

      {/* Header Banner */}
      <section className="bg-[#09172B] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-[#263346]">
        <div className="max-w-7xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-[#E4BC70]">
            SESA Academic Programs
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Departmental Events & Masterclasses
          </h1>
          <p className="text-sm text-[#AEB9C9] max-w-2xl leading-relaxed">
            Browse published technical competitions, hackathons, and software engineering workshops.
            Valid SESA membership verification is required to complete registration.
          </p>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-lg shadow-md border border-[#EFE8DC] p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event name, venue, or keywords..."
              className="w-full pl-10 pr-4 py-2 border border-[#EFE8DC] rounded text-sm text-[#09172B] focus:outline-none focus:border-[#E4BC70]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-[#34445A] hidden sm:block mr-1" />
            {[
              { id: "all", label: "All Events" },
              { id: "open", label: "Open for Registration" },
              { id: "completed", label: "Past Events" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#09172B] text-white"
                    : "bg-[#F8F1E6] text-[#34445A] hover:bg-[#EFE8DC]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Events Listing */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white p-6 rounded-lg border border-[#EFE8DC] animate-pulse space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-12 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-[#EFE8DC]">
            <Calendar className="w-12 h-12 text-[#AEB9C9] mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold text-[#09172B]">No events matching criteria</h3>
            <p className="text-xs text-[#34445A] mt-1">Try refining your search terms or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const isOpen = event.status === "published";
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-xl border border-[#EFE8DC] shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded ${
                          isOpen
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : event.status === "completed"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {isOpen ? "Registration Open" : event.status.replace("_", " ")}
                      </span>

                      {event.walk_ins_enabled && (
                        <span className="text-[10px] text-[#34445A] font-medium bg-[#F8F1E6] px-2 py-0.5 rounded border border-[#EFE8DC]">
                          Walk-ins Available
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-xl font-bold text-[#09172B] hover:text-[#C69A45] transition">
                      <Link href={`/events/${event.slug}`}>{event.name}</Link>
                    </h3>

                    <p className="text-xs text-[#34445A] line-clamp-3 leading-relaxed">
                      {event.summary}
                    </p>

                    <div className="pt-3 border-t border-[#EFE8DC] space-y-2 text-xs text-[#34445A]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#C69A45] flex-shrink-0" />
                        <span>{formatDateIST(event.starts_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#C69A45] flex-shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[#C69A45] flex-shrink-0" />
                        <span>Capacity: {event.capacity ? `${event.capacity} seats` : "Unlimited"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-3.5 bg-[#F8F1E6]/60 border-t border-[#EFE8DC]">
                    <Link
                      href={`/events/${event.slug}`}
                      className="w-full py-2.5 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-semibold uppercase tracking-wider rounded text-center block transition flex items-center justify-center gap-1.5"
                    >
                      <span>{isOpen ? "Register Now" : "View Event Overview"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
