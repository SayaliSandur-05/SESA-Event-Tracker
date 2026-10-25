
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, LayoutDashboard } from "lucide-react";

type StaffUser = {
  name?: string;
  full_name?: string;
  email?: string;
  role?: string;
};

export function AdminNavbar() {
  const router = useRouter();

  const [user, setUser] = useState<StaffUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  const displayName =
    user?.full_name || user?.name || user?.email || "Staff Member";

  const displayRole = user?.role
    ? user.role.replaceAll("_", " ")
    : "Staff";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08162a] text-white shadow-lg">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Admin Branding */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2"
        >
          <ShieldCheck className="h-6 w-6 text-[#E4BC70]" />
          <span className="font-semibold tracking-wide">
            SESA <span className="text-[#E4BC70]">Admin</span>
          </span>
        </Link>

        {/* Dashboard, Staff Details and Logout */}
        <div className="flex items-center gap-2 sm:gap-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>

          <div className="hidden text-right sm:block">
            <p className="max-w-36 truncate text-sm font-semibold sm:max-w-none">
              {displayName}
            </p>
            <p className="text-xs capitalize text-slate-400">
              {displayRole}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            <span>{loggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
