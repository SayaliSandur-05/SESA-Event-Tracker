
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser } from "@/lib/auth";
import { LogOut, Menu, X, Lock, UserRound } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setAuthLoaded(false);

    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unable to fetch current user");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCurrentUser(data.user ?? null);
          setAuthLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
          setAuthLoaded(true);
        }
      });

    const onScroll = () => setScrolled(window.scrollY > 20);

    window.addEventListener("scroll", onScroll);

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      setCurrentUser(null);
      setMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Events", href: "/events" },
    { label: "Pay Association Fee", href: "/pay-fee" },
    { label: "My Registration", href: "/my-registration" },
  ];

  const isStaff =
    !!currentUser &&
    ["super_admin", "organizer", "volunteer"].includes(
      currentUser.role
    );

  const roleLabel = currentUser
    ? ({
        super_admin: "Admin",
        organizer: "Organizer",
        volunteer: "Volunteer",
      } as Record<string, string>)[currentUser.role] ??
      currentUser.role
    : "";

  const displayName = currentUser?.username || roleLabel;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header
      className={`sticky inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#08162a]/95 backdrop-blur-md shadow-lg"
          : "border-b border-white/5 bg-[#08162a]/95 backdrop-blur-md shadow-lg"
      }`}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        {/* SESA Brand */}
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="SESA home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sesa-logo.svg"
            alt="SESA Logo"
            width={48}
            height={48}
            className="h-11 w-11 object-contain transition-transform duration-300 group-hover:scale-105"
          />

          <span className="hidden sm:block">
            <span className="block font-display text-xl tracking-[0.08em] text-[#fbf5eb]">
              SESA
            </span>
            <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Software Engineering Student Association
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "text-[#fbf5eb]"
                    : "text-slate-300 hover:text-[#fbf5eb]"
                }`}
              >
                {link.label}

                {active && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-[#b18345]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Account Actions */}
        <div className="hidden items-center gap-3 md:flex">
          {isStaff && (
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full border border-[#b18345]/40 px-4 py-2 text-sm font-semibold text-[#e0bd7d] transition hover:bg-white/5"
            >
              Dashboard
            </Link>
          )}

          {!authLoaded ? null : currentUser ? (
            <>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm text-slate-200">
                <UserRound className="h-4 w-4 text-[#e0bd7d]" />
                <span className="font-semibold">{displayName}</span>
                <span className="text-xs text-slate-400">
                  ({roleLabel})
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10"
                title={`Sign out (${currentUser.username})`}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:border-white/25 hover:text-white"
            >
              <Lock className="h-3.5 w-3.5 text-[#e0bd7d]" />
              Admin / Volunteer Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="space-y-2 border-b border-white/10 bg-[#08162a] px-5 pb-6 pt-3 md:hidden">
          {isStaff && (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-lg border border-[#b18345]/30 px-3 py-2 text-sm font-semibold text-[#e0bd7d] hover:bg-[#102137]"
            >
              Back to Dashboard
            </Link>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(link.href)
                  ? "bg-[#102137] font-semibold text-[#e0bd7d]"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="space-y-3 border-t border-white/10 pt-3">
            {!authLoaded ? null : currentUser ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-3 text-slate-200">
                  <UserRound className="h-5 w-5 text-[#e0bd7d]" />
                  <div>
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-slate-400">{roleLabel}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/30 px-3 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-400/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg border border-white/20 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-white"
              >
                <Lock className="mr-2 inline h-3.5 w-3.5 text-[#e0bd7d]" />
                Admin / Volunteer Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
