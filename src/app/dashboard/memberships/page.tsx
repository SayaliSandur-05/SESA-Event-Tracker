"use client";

import React, { useState, useEffect, useRef } from "react";
import { Membership } from "@/lib/types";
import { formatDateIST } from "@/lib/utils";
import {
  Users,
  Search,
  Upload,
  Download,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  X,
  RefreshCw,
  Filter,
  ShieldCheck,
  Edit,
  Radio,
  CreditCard,
  QrCode,
  DollarSign,
} from "lucide-react";

export default function MembershipManagementPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState(false);

  // Add / Edit Member Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Membership | null>(null);
  const [formPrn, setFormPrn] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formBranch, setFormBranch] = useState("Department Of Software Engineering");
  const [formYear, setFormYear] = useState("Third Year (TY)");
  const [formStatus, setFormStatus] = useState<"paid" | "pending" | "unpaid">("paid");
  const [formFeeAmount, setFormFeeAmount] = useState<number>(1000);
  const [formPaymentMode, setFormPaymentMode] = useState<string>("UPI QR Code");
  const [formNotes, setFormNotes] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  // Excel / CSV Import Modal & Workflow State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<"select" | "preview" | "summary">("select");
  const [importing, setImporting] = useState(false);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicatePrns: string[];
    sampleRows: any[];
  } | null>(null);
  const [importSummary, setImportSummary] = useState<{
    totalProcessed: number;
    inserted: number;
    updated: number;
    skipped: number;
    duplicatePrns?: string[];
    errors: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMemberships = async (silent = false) => {
    if (!silent) setLoading(true);
    setSyncing(true);
    try {
      const res = await fetch(`/api/memberships?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      const data = await res.json();
      if (data.memberships) {
        setMemberships(data.memberships);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error("Failed to load memberships:", err);
    } finally {
      if (!silent) setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadMemberships();
  }, [search, statusFilter]);

  // Live Auto-Sync across multiple devices every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadMemberships(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [search, statusFilter]);

  // Check for duplicate PRN in local store
  const cleanCurrentPrn = formPrn.trim().toUpperCase();
  const duplicateMember = cleanCurrentPrn
    ? memberships.find(
        (m) => m.prn.toUpperCase() === cleanCurrentPrn && (!editingMember || m.id !== editingMember.id)
      )
    : null;

  // Open modal for new member (Late Entry)
  const handleAddNew = () => {
    setEditingMember(null);
    setFormPrn("");
    setFormName("");
    setFormEmail("");
    setFormContact("");
    setFormBranch("Department Of Software Engineering");
    setFormYear("Third Year (TY)");
    setFormStatus("paid");
    setFormFeeAmount(1000);
    setFormPaymentMode("UPI QR Code");
    setFormNotes("Verified ₹1,000 late entry fee at venue desk");
    setModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (m: Membership) => {
    setEditingMember(m);
    setFormPrn(m.prn);
    setFormName(m.full_name);
    setFormEmail(m.email || "");
    setFormContact(m.contact || "");
    setFormBranch(m.branch || "Department Of Software Engineering");
    setFormYear(m.academic_year || "Third Year (TY)");
    setFormStatus(m.payment_status);
    setFormFeeAmount(m.fee_amount || 1000);
    setFormPaymentMode(m.payment_mode || "UPI QR Code");
    setFormNotes(m.verification_notes || "");
    setModalOpen(true);
  };

  
  // Quick verify & mark paid button
  const handleQuickVerifyPaid = async (m: Membership) => {
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prn: m.prn,
          full_name: m.full_name,
          payment_status: "paid",
          fee_amount: 1000,
          payment_mode: "Desk Verified",
          transaction_ref: "",
          notes: "₹1,000 verified by authorized volunteer",
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        console.error("Quick verify failed:", result.error ?? result);
        alert(result.error ?? "Unable to mark membership as paid.");
        return;
      }

      // Reload membership data from the server
      await loadMemberships(true);
    } catch (err) {
      console.error("Quick verify failed:", err);
      alert("Something went wrong while verifying payment.");
    }
  };


  // Submit manual member
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMember(true);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prn: formPrn.trim().toUpperCase(),
          full_name: formName.trim(),
          email: formEmail.trim() || undefined,
          contact: formContact.trim() || undefined,
          branch: formBranch,
          academic_year: formYear,
          payment_status: formStatus,
          fee_amount: Number(formFeeAmount) || 1000,
          payment_mode: formPaymentMode,
          verification_notes: formNotes,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Save failed");
      }
      setModalOpen(false);
      loadMemberships(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingMember(false);
    }
  };

  // File upload change -> Read Excel (.xlsx, .xls) or CSV
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isSpreadsheet = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || lowerName.endsWith(".csv");
    if (!isSpreadsheet) {
      alert("Please upload a valid .xlsx, .xls, or .csv spreadsheet file");
      return;
    }

    setCsvFile(file);
    await runPreview(file);
  };

  // Run Preview Validation on Excel/CSV
  const runPreview = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "preview");

      const res = await fetch("/api/memberships/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview validation failed");

      setPreviewData(data.preview);
      setImportStep("preview");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  // Confirm and Execute Safe Import
  const handleConfirmImport = async () => {
    if (!csvFile) return;
    setImporting(true);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("mode", "execute");

      const res = await fetch("/api/memberships/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportSummary(data.summary);
      setImportStep("summary");
      loadMemberships(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setImporting(false);
    }
  };

  // Reset modal
  const handleCloseCsvModal = () => {
    setCsvModalOpen(false);
    setCsvFile(null);
    setPreviewData(null);
    setImportSummary(null);
    setImportStep("select");
  };

  const paidCount = memberships.filter((m) => m.payment_status === "paid").length;
  const pendingCount = memberships.filter((m) => m.payment_status === "pending").length;

  return (
    <div className="p-6 lg:p-10 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Core Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EFE8DC] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#34445A]">
              SESA Central Membership Database
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync Active
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#09172B]">
            Membership Roster & Excel Scanner
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Central source of truth for ₹1,000 verified SESA members. Allows venue late-entries and bulk .xlsx/.csv spreadsheet uploads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadMemberships(false)}
            disabled={syncing}
            title="Refresh list now"
            className="p-2 bg-white hover:bg-gray-50 border border-[#EFE8DC] rounded text-gray-600 hover:text-[#09172B] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin text-[#C69A45]" : ""}`} />
          </button>

          <button
            onClick={() => {
              setImportStep("select");
              setCsvModalOpen(true);
            }}
            className="px-4 py-2 bg-[#F8F1E6] hover:bg-[#EFE8DC] text-[#09172B] border border-[#EFE8DC] rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#C69A45]" />
            Upload Excel / CSV
          </button>

          <a
            href="/api/memberships/export"
            download
            className="px-4 py-2 bg-[#09172B] hover:bg-[#263346] text-white rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#E4BC70]" />
            Export Roster
          </a>

          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-[#E4BC70] hover:bg-[#D4A95B] text-[#09172B] rounded text-xs font-semibold uppercase tracking-wider transition flex items-center gap-1.5 shadow-sm cursor-pointer font-bold"
          >
            <PlusCircle className="w-4 h-4" />
            Register Late ₹1,000 Entry
          </button>
        </div>
      </div>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
              Verified Paid Members
            </span>
            <p className="font-serif text-2xl font-bold text-emerald-800 mt-0.5">
              {paidCount} Students
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">₹1,000 annual fee confirmed</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
              Pending Verification
            </span>
            <p className="font-serif text-2xl font-bold text-amber-700 mt-0.5">
              {pendingCount} Students
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">Awaiting desk or receipt sign-off</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EFE8DC] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">
              Multi-Device Status
            </span>
            <p className="font-serif text-lg font-bold text-[#09172B] mt-0.5">
              Simultaneous Access
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Last synced: {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-[#EFE8DC] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Instant search by PRN (e.g. MIT2024001) or name..."
            className="w-full pl-9 pr-4 py-1.5 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          {[
            { id: "all", label: "All Members" },
            { id: "paid", label: "Paid & Verified (₹1,000)" },
            { id: "pending", label: "Pending" },
            { id: "unpaid", label: "Unpaid" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-[#09172B] text-white"
                  : "bg-[#F8F1E6] text-gray-600 hover:bg-[#EFE8DC]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Membership Roster Table */}
      <div className="bg-white rounded-xl border border-[#EFE8DC] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading memberships from Supabase...</div>
        ) : memberships.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 space-y-2">
            <Users className="w-8 h-8 text-gray-300 mx-auto" />
            <p>No membership records found matching filter.</p>
            <p className="text-[11px] text-gray-400">
              Use &apos;Register Late ₹1,000 Entry&apos; or upload your Excel spreadsheet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F1E6] text-[#09172B] uppercase tracking-wider text-[10px] font-semibold border-b border-[#EFE8DC]">
                <tr>
                  <th className="px-4 py-3">Sr.</th>
                  <th className="px-4 py-3">College PRN</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Fee & Mode</th>
                  <th className="px-4 py-3">Payment Status</th>
                  <th className="px-4 py-3">Verified By</th>
                  <th className="px-4 py-3">Notes / Ref</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]">
                {memberships.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-gray-50/80 transition">
                    <td className="px-4 py-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#09172B]">
                      {m.prn}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 block">{m.full_name}</span>
                      <span className="text-[10px] text-gray-400">{m.email || "No email"} • {m.academic_year || "TY"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-emerald-800 block">
                        ₹{m.fee_amount || 1000}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {m.payment_mode || "UPI/Online"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.payment_status === "paid" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid & Verified
                        </span>
                      ) : m.payment_status === "pending" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" />
                          Pending Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {m.verified_by ? (
                        <div>
                          <span className="font-medium text-gray-900 block">{m.verified_by}</span>
                          <span className="text-[10px] text-gray-400">
                            {m.verified_at ? formatDateIST(m.verified_at) : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={m.verification_notes}>
                      {m.verification_notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.payment_status !== "paid" && (
                          <button
                            onClick={() => handleQuickVerifyPaid(m)}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold uppercase transition cursor-pointer"
                            title="Verify ₹1,000 Payment"
                          >
                            Mark Paid
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(m)}
                          className="p-1 text-gray-400 hover:text-[#09172B] transition cursor-pointer"
                          title="Edit Student Info"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal (Venue Late-Entry Registration) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#EFE8DC] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE8DC] pb-3">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#09172B]">
                  {editingMember ? "Edit Member Record" : "Venue Late-Entry Registration"}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {editingMember
                    ? "Update student details or payment status."
                    : "Register students paying their ₹1,000 SESA annual membership fee directly at the venue."}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duplicate PRN Warning */}
            {duplicateMember && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Student Already Exists:</strong> {duplicateMember.full_name} ({duplicateMember.prn}) is currently recorded as{" "}
                  <span className="uppercase font-bold">{duplicateMember.payment_status}</span>.
                  Saving will update their ₹1,000 fee verification safely without duplicate entries.
                </div>
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  College PRN *
                </label>
                <input
                  type="text"
                  value={formPrn}
                  onChange={(e) => setFormPrn(e.target.value.toUpperCase())}
                  placeholder="e.g. MIT2024050"
                  required
                  disabled={!!editingMember}
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-sm text-[#09172B] font-mono uppercase focus:outline-none focus:border-[#09172B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Priya Deshpande"
                  required
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="student@mitaoe.ac.in"
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Contact / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    placeholder="9820011221"
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Academic Year
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] bg-white focus:outline-none focus:border-[#09172B]"
                  >
                    <option value="First Year (FY)">First Year (FY)</option>
                    <option value="Second Year (SY)">Second Year (SY)</option>
                    <option value="Third Year (TY)">Third Year (TY)</option>
                    <option value="Final Year (B.Tech)">Final Year (B.Tech)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] bg-white focus:outline-none focus:border-[#09172B]"
                  >
                    <option value="paid">Paid & Verified</option>
                    <option value="pending">Pending Verification</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Fee Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formFeeAmount}
                    onChange={(e) => setFormFeeAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] font-mono focus:outline-none focus:border-[#09172B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formPaymentMode}
                    onChange={(e) => setFormPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] bg-white focus:outline-none focus:border-[#09172B]"
                  >
                    <option value="UPI QR Code">UPI / QR Code</option>
                    <option value="Cash at Desk">Cash at Venue Desk</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Online Portal">Official Website Portal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#09172B] uppercase mb-1">
                  Verification Notes / UTR / Reference
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. UPI Ref 7291048123 or Venue Cash Receipt"
                  className="w-full px-3 py-2 border border-[#EFE8DC] rounded text-xs text-[#09172B] focus:outline-none focus:border-[#09172B]"
                />
              </div>

              <div className="pt-3 border-t border-[#EFE8DC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold uppercase rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMember}
                  className="px-5 py-2 bg-[#E4BC70] hover:bg-[#D4A95B] text-[#09172B] text-xs font-bold uppercase rounded cursor-pointer shadow flex items-center gap-1.5"
                >
                  {savingMember ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save & Verify ₹{formFeeAmount}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spreadsheet (Excel / CSV) Import Wizard Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-[#EFE8DC] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE8DC] pb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-[#09172B]" />
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#09172B]">
                    Upload Paid Members Sheet
                  </h3>
                  <p className="text-xs text-gray-500">
                    Supports native Excel (.xlsx, .xls) and CSV spreadsheets.
                  </p>
                </div>
              </div>
              <button onClick={handleCloseCsvModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Select File */}
            {importStep === "select" && (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                  <strong>Safe Upsert Guarantee:</strong> Uploading new sheets will safely add newly paid members (defaulting to ₹1,000 fee).
                  It will <em>never</em> remove or demote existing verified paid students.
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#AEB9C9] hover:border-[#09172B] rounded-xl p-8 text-center cursor-pointer transition bg-[#F8F1E6]/40 group"
                >
                  <FileSpreadsheet className="w-12 h-12 text-[#C69A45] mx-auto mb-2 group-hover:scale-105 transition-transform" />
                  <p className="text-sm font-semibold text-[#09172B]">
                    Click or drag & drop .xlsx, .xls, or .csv file to scan
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Auto-detects columns: PRN, Full Name, Payment Status, Email, Contact, Fee Amount
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div className="p-3 bg-[#F8F1E6] rounded-lg text-[11px] text-[#34445A] space-y-1">
                  <p className="font-semibold text-[#09172B]">Supported Header Variations:</p>
                  <p className="font-mono text-gray-600">
                    prn / college_prn / roll_no, name / full_name, status / payment_status, fee / fee_amount (₹1,000)
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Validation Preview */}
            {importStep === "preview" && previewData && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-[10px] uppercase text-gray-500 font-semibold">Total Rows</p>
                    <p className="font-serif text-xl font-bold text-[#09172B]">
                      {previewData.totalRows}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-[10px] uppercase text-emerald-700 font-semibold">Valid Rows</p>
                    <p className="font-serif text-xl font-bold text-emerald-800">
                      {previewData.validRows}
                    </p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-[10px] uppercase text-red-700 font-semibold">Invalid Rows</p>
                    <p className="font-serif text-xl font-bold text-red-800">
                      {previewData.invalidRows}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-[10px] uppercase text-amber-700 font-semibold">Duplicates</p>
                    <p className="font-serif text-xl font-bold text-amber-800">
                      {previewData.duplicatePrns.length}
                    </p>
                  </div>
                </div>

                {previewData.duplicatePrns.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    <strong>Duplicate PRNs in file:</strong> {previewData.duplicatePrns.join(", ")}.
                    Safe upsert will normalize and update each student record once.
                  </div>
                )}

                {/* Sample Rows Table */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase text-gray-500">
                    Scanned Sample Preview (First 5 Rows)
                  </span>
                  <div className="overflow-x-auto border border-[#EFE8DC] rounded-lg">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#F8F1E6] text-[#09172B] font-semibold">
                        <tr>
                          <th className="p-2">PRN</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Fee</th>
                          <th className="p-2">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EFE8DC]">
                        {previewData.sampleRows.slice(0, 5).map((row, i) => (
                          <tr key={i} className={row.isValid ? "" : "bg-red-50"}>
                            <td className="p-2 font-mono font-bold">{row.prn || "—"}</td>
                            <td className="p-2">{row.full_name || "—"}</td>
                            <td className="p-2 uppercase font-semibold text-emerald-700">
                              {row.payment_status}
                            </td>
                            <td className="p-2 font-mono">₹{row.fee_amount || 1000}</td>
                            <td className="p-2 text-gray-500">{row.email || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#EFE8DC] flex justify-between items-center">
                  <button
                    onClick={() => setImportStep("select")}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold uppercase rounded cursor-pointer"
                  >
                    &larr; Choose Different File
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={importing || previewData.validRows === 0}
                    className="px-6 py-2.5 bg-[#09172B] hover:bg-[#263346] disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded transition shadow flex items-center gap-2 cursor-pointer"
                  >
                    {importing ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-[#E4BC70]" />
                        Execute Safe Upsert ({previewData.validRows} Records)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Summary Report */}
            {importStep === "summary" && importSummary && (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <h4 className="font-serif text-2xl font-bold text-[#09172B]">
                  Spreadsheet Successfully Synchronized
                </h4>

                <div className="bg-[#F8F1E6] p-4 rounded-xl border border-[#EFE8DC] grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-gray-500 block">Total Scanned</span>
                    <strong className="text-sm font-bold text-[#09172B]">
                      {importSummary.totalProcessed}
                    </strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block">New Additions</span>
                    <strong className="text-sm font-bold text-emerald-800">
                      {importSummary.inserted}
                    </strong>
                  </div>
                  <div>
                    <span className="text-blue-700 block">Updated</span>
                    <strong className="text-sm font-bold text-blue-800">
                      {importSummary.updated}
                    </strong>
                  </div>
                  <div>
                    <span className="text-amber-700 block">Skipped/Preserved</span>
                    <strong className="text-sm font-bold text-amber-800">
                      {importSummary.skipped}
                    </strong>
                  </div>
                </div>

                {importSummary.errors.length > 0 && (
                  <div className="text-left text-xs bg-red-50 p-3 rounded border border-red-200 text-red-700 max-h-32 overflow-y-auto space-y-1">
                    <p className="font-semibold">Skipped Records Log:</p>
                    {importSummary.errors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleCloseCsvModal}
                    className="w-full py-2.5 bg-[#09172B] hover:bg-[#263346] text-white text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer"
                  >
                    Done & View Live Roster
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
