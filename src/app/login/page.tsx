"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SesaLogo } from "@/components/branding/SesaLogo";
import {
  Lock,
  User,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Please enter your admin / volunteer username.");
      return;
    }

    if (!password) {
      setError("Please enter your account password.");
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Invalid username or password.");
      }

      // Redirect to dashboard (with immediate access to the 3 core functions)
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#08162a] px-4 py-8 relative overflow-hidden text-[#fbf5eb]">
      {/* Decorative background glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#1f4b78]/25 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#b18345]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="relative z-10 max-w-xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/10">
        <Link href="/" className="inline-block">
          <SesaLogo size={44} showText={true} textColor="light" />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Public Portal
        </Link>
      </header>

      {/* Main Login Card */}
      <div className="max-w-xl w-full mx-auto relative z-10 my-6 space-y-6">
        {/* Prominent High-Visibility Warning Banner: Admin Only */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#b18345]/20 via-[#b18345]/10 to-[#102137] border-2 border-[#b18345] rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#b18345] text-[#08162a] rounded-lg">
              <ShieldAlert className="w-5 h-5 font-bold" />
            </span>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-[#e0bd7d] block">
                Restricted Terminal Access
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                Authorized SESA Admins & Volunteers Only
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            This management terminal is strictly for designated SESA faculty coordinators, event organizers, and venue desk volunteers. <strong>Students attending events or paying fees do not need an account and should NOT log in here.</strong>
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="text-[11px] text-slate-400 font-medium">Are you a student?</span>
            <Link
              href="/pay-fee"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#b18345] hover:bg-[#8b6535] text-[#08162a] font-bold text-[11px] transition shadow"
            >
              Pay Association Fee (₹1,000) &rarr;
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-[11px] transition"
            >
              Explore Events
            </Link>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-[#102137]/95 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-5">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Sign In to SESA Terminal
            </h1>
            <p className="text-xs text-slate-300">
              Enter your assigned staff username and password to proceed.
            </p>
          </div>

          {error && (
            <div className="p-3.5 bg-red-950/80 border border-red-500/50 rounded-lg text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin / Volunteer Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white text-sm focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confidential Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  ref={passwordInputRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-[#08162a] border border-[#34445A] focus:border-[#b18345] rounded-lg text-white text-sm focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#b18345] hover:bg-[#8b6535] disabled:opacity-50 text-[#08162a] font-bold text-xs uppercase tracking-wider rounded-lg transition shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-[#08162a] border-t-transparent rounded-full" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Authenticate & Enter Terminal
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-[#e0bd7d] transition">
            &larr; Back to Public SESA Portal
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center text-xs text-slate-500 py-3 border-t border-white/5">
        Department Of Software Engineering
      </footer>
    </div>
  );
}
