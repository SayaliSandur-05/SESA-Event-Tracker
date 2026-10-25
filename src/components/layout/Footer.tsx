import React from "react";
import Link from "next/link";
import { Mail, MapPin, ExternalLink, ShieldCheck, Code } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-[#08162a] text-slate-300 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand Information */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sesa-logo.svg"
                alt="SESA Logo"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
              <div>
                <span className="block font-display text-xl tracking-[0.08em] text-[#fbf5eb]">
                  SESA
                </span>
                <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Software Engineering Student Association
                </span>
              </div>
            </Link>

            <p className="text-sm text-slate-400 max-w-md leading-relaxed pt-1">
              SESA is the student-led association of the Department Of Software Engineering at
              MIT Academy of Engineering, Pune. Fostering software craftsmanship, systems design,
              and leadership.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#e0bd7d] bg-[#b18345]/15 px-3 py-1 rounded-full border border-[#b18345]/30 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                MITAOE Department Association
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e0bd7d]">
              Portals & Services
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/events" className="hover:text-[#fbf5eb] transition">
                  Upcoming Events
                </Link>
              </li>
              <li>
                <Link href="/my-registration" className="hover:text-[#fbf5eb] transition">
                  Registration Verification
                </Link>
              </li>
              <li>
                <Link href="/desk" className="hover:text-[#fbf5eb] transition">
                  Entrance Attendance Desk
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#fbf5eb] transition">
                  Staff & Organizer Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Department Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e0bd7d]">
              Campus Location
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#e0bd7d] shrink-0 mt-0.5" />
                <span>
                  Department Of Software Engineering, MIT Academy of Engineering, Alandi (D.), Pune
                  - 412105
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#e0bd7d] shrink-0" />
                <a href="mailto:sesa.softengg@mitaoe.ac.in" className="hover:text-white transition">
                  sesa.softengg@mitaoe.ac.in
                </a>
              </li>
              <li className="pt-2">
                <a
                  href="https://mitaoe.ac.in"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#e0bd7d] hover:underline"
                >
                  mitaoe.ac.in <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} SESA MITAOE. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>Department Of Software Engineering</span>
            <span>•</span>
            <span className="text-[#e0bd7d]">Timezone: Asia/Kolkata</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
