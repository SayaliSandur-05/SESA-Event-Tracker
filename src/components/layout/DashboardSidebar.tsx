"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SesaLogo } from "@/components/branding/SesaLogo";
import { SessionUser } from "@/lib/auth";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  ShieldAlert,
  UserCog,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";

export function DashboardSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
        } else {
          setCurrentUser(data.user);
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const isSuperAdmin = currentUser?.role === "super_admin";

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Events Manager", href: "/dashboard/events", icon: Calendar },
    { name: "Membership & CSV", href: "/dashboard/memberships", icon: Users },
    { name: "Venue Desk", href: "/desk", icon: CheckSquare },
    { name: "Audit Trail", href: "/dashboard/audit", icon: ShieldAlert },
    ...(isSuperAdmin ? [{ name: "User Roles", href: "/dashboard/users", icon: UserCog }] : []),
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex bg-[#F8F1E6]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#09172B] border-r border-[#1E2C3F] text-white flex-shrink-0">
        <div className="p-5 border-b border-[#1E2C3F]">
          <Link href="/">
            <SesaLogo size={38} showText={true} textColor="light" />
          </Link>
        </div>

        {/* User Card */}
        {currentUser && (
          <div className="px-5 py-4 border-b border-[#1E2C3F] bg-[#050E1B]">
            <p className="text-xs font-semibold text-[#F8F1E6] truncate">
              {currentUser.full_name}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#E4BC70]/10 text-[#E4BC70] border border-[#E4BC70]/30 font-semibold">
                {currentUser.role.replace("_", " ")}
              </span>
              <button
                onClick={handleLogout}
                title="Log out"
                className="text-gray-400 hover:text-white transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  active
                    ? "bg-[#263346] text-[#E4BC70] border-l-4 border-[#E4BC70]"
                    : "text-[#AEB9C9] hover:bg-[#263346]/50 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 opacity-80" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-[#1E2C3F] text-xs text-[#AEB9C9]">
          <Link
            href="/"
            className="flex items-center gap-2 hover:text-[#E4BC70] transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public Website
          </Link>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="lg:hidden bg-[#09172B] border-b border-[#263346] p-4 flex items-center justify-between text-white">
          <SesaLogo size={32} showText={true} textColor="light" />
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="p-1.5 text-gray-300 hover:text-white"
          >
            {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="lg:hidden bg-[#09172B] border-b border-[#263346] px-4 py-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={`block px-3 py-2 rounded text-xs font-semibold uppercase ${
                  isActive(item.href) ? "bg-[#263346] text-[#E4BC70]" : "text-[#AEB9C9]"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-xs text-red-400 font-semibold uppercase"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
