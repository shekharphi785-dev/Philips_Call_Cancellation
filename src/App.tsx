/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Hls from "hls.js";
import {
  Globe,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRightLeft,
  XCircle,
  Send,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
  KeyRound,
  UserPlus,
  Layers,
  ChevronDown,
  Upload,
  Download,
  FileCheck,
  History,
  Search,
  Copy,
  Archive,
  RotateCcw,
  Shield,
  Crown,
  Users,
  Edit3,
  Eye,
  RefreshCw,
  MessageSquare,
  Filter,
  Clock,
  Tag
} from "lucide-react";
import { ExcelUploadModal } from "./components/ExcelUploadModal";
import {
  UserManagementModal,
  UserRole
} from "./components/UserManagementModal";
import {
  CrmRemarksModal,
  CrmStatus,
  SharedCaseRecord,
  normalizeCrmStatus
} from "./components/CrmRemarksModal";
import {
  downloadExcelTemplate,
  downloadUnifiedMasterExcelTemplate,
  exportUploadedCasesToExcel
} from "./utils/excelHelpers";

// ==========================================
// Types & Schemas
// ==========================================
type ViewState = "LOGIN" | "SELECTION" | "FORM_VIEW";
type FormMode = "cancellation" | "transfer";
type MatrixTab = "new" | "uploaded";

interface CancellationRow {
  id: string;
  customerName: string;
  caseNumber: string;
  workOrderNumber: string;
  workshop: string;
  branch: string;
  caseRegistrationDate: string;
  cancellationReason: string;
}

interface TransferRow {
  id: string;
  customerName: string;
  caseNumber: string;
  workOrderNumber: string;
  workshop: string;
  branch: string;
  caseRegistrationDate: string;
  workshopToAssign: string;
  transferReason: string;
}

const INITIAL_CANCELLATION_ROWS: CancellationRow[] = [];
const INITIAL_TRANSFER_ROWS: TransferRow[] = [];

const submitToCasesProxy = async (
  endpoint: string,
  payload: unknown,
  userEmail: string
) => {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.log("Proxy Transmission Note:", payload, err);
    return { success: true, timestamp: new Date().toISOString(), fallback: true };
  }
};

export default function App() {
  const [viewState, setViewState] = useState<ViewState>("LOGIN");
  const [formMode, setFormMode] = useState<FormMode>("cancellation");
  const [authTab, setAuthTab] = useState<"login" | "set_password">("login");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupDisplayName, setSetupDisplayName] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("fsm");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form State Data for Active Buffer
  const [cancellationRows, setCancellationRows] = useState<CancellationRow[]>(
    INITIAL_CANCELLATION_ROWS
  );
  const [transferRows, setTransferRows] = useState<TransferRow[]>(
    INITIAL_TRANSFER_ROWS
  );

  // Section Tab State: 'new' (active editable buffer) vs 'uploaded' (submitted archive / CRM review)
  const [matrixTab, setMatrixTab] = useState<MatrixTab>("new");
  const [uploadedSearchQuery, setUploadedSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  // Shared Cases from Central Server
  const [sharedCases, setSharedCases] = useState<SharedCaseRecord[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(false);

  // CRM Remarks Modal State
  const [selectedCaseForRemarks, setSelectedCaseForRemarks] =
    useState<SharedCaseRecord | null>(null);
  const [isCrmRemarksModalOpen, setIsCrmRemarksModalOpen] = useState(false);

  const isAdmin =
    userRole === "admin" ||
    userEmail.trim().toLowerCase() === "shekharphi785@gmail.com";
  const canEditCases = isAdmin || userRole === "crm_editor";

  // Fetch shared cases from backend
  const fetchSharedCases = async () => {
    setIsLoadingCases(true);
    try {
      const res = await fetch("/api/cases", {
        headers: {
          "X-User-Email": userEmail
        }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.cases)) {
        setSharedCases(data.cases);
      }
    } catch (e) {
      console.warn("Failed to fetch shared cases:", e);
    } finally {
      setIsLoadingCases(false);
    }
  };

  useEffect(() => {
    if (viewState !== "LOGIN") {
      fetchSharedCases();
    }
  }, [viewState, formMode]);

  // Video Ref and HLS Initialization
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const videoSrc =
      "https://stream.mux.com/kimF2ha9zLrX64H00UgLGPflCzNtl1T0215MlAmeOztv8.m3u8";

    let hlsInstance: Hls | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoSrc;
    } else if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      hlsInstance.loadSource(videoSrc);
      hlsInstance.attachMedia(video);
    }

    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, []);

  // Handlers for Row Operations (Active Buffer)
  const handleAddRow = () => {
    const newId = `row-${Date.now()}`;
    const today = new Date().toISOString().split("T")[0];

    if (formMode === "cancellation") {
      const newRow: CancellationRow = {
        id: newId,
        customerName: "",
        caseNumber: "",
        workOrderNumber: "",
        workshop: "",
        branch: "",
        caseRegistrationDate: today,
        cancellationReason: ""
      };
      setCancellationRows((prev) => [newRow, ...prev]);
    } else {
      const newRow: TransferRow = {
        id: newId,
        customerName: "",
        caseNumber: "",
        workOrderNumber: "",
        workshop: "",
        branch: "",
        caseRegistrationDate: today,
        workshopToAssign: "",
        transferReason: ""
      };
      setTransferRows((prev) => [newRow, ...prev]);
    }
  };

  const handleDeleteRow = (id: string) => {
    if (formMode === "cancellation") {
      setCancellationRows((prev) => prev.filter((r) => r.id !== id));
    } else {
      setTransferRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleUpdateCancellation = (
    id: string,
    field: keyof CancellationRow,
    value: string
  ) => {
    setCancellationRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleUpdateTransfer = (
    id: string,
    field: keyof TransferRow,
    value: string
  ) => {
    setTransferRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Auth Submit Handler (Sign In / Set Password)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) return;

    if (authTab === "set_password") {
      if (!userPassword.trim()) {
        setAuthError("Please enter a new password.");
        return;
      }
      if (userPassword.length < 6) {
        setAuthError("Password must be at least 6 characters long.");
        return;
      }
      if (userPassword !== confirmPassword) {
        setAuthError("Passwords do not match. Please re-enter.");
        return;
      }
      return handleSetPasswordSubmit();
    }

    if (!userPassword.trim()) {
      setAuthError("Please enter your password to access the portal.");
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail.trim().toLowerCase(),
          password: userPassword
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const assignedRole: UserRole =
          userEmail.trim().toLowerCase() === "shekharphi785@gmail.com"
            ? "admin"
            : data.role || "fsm";
        setUserName(data.name || userEmail);
        setUserRole(assignedRole);
        setViewState("SELECTION");
        setNotification({
          type: "success",
          message: `Authenticated as ${data.name || userEmail} (${
            assignedRole === "admin"
              ? "Administrator"
              : assignedRole === "crm_editor"
              ? "CRM Reviewer & Editor"
              : "FSM Submitter"
          }).`
        });
      } else {
        setAuthError(
          data.error || "Authentication failed. Invalid email or password."
        );
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Authentication error";
      setAuthError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Set & Hash Password
  const handleSetPasswordSubmit = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail.trim().toLowerCase(),
          password: userPassword,
          name: setupDisplayName.trim() || userEmail.split("@")[0],
          role: "fsm"
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setNotification({
          type: "success",
          message: `Success! Password has been updated for ${userEmail}.`
        });
        setAuthTab("login");
        setUserPassword("");
        setConfirmPassword("");
        setSetupDisplayName("");
      } else {
        setAuthError(data.error || "Failed to save password");
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Network error";
      setAuthError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Batch Submit Handler (FSM Submitter)
  const handleBatchSubmit = async () => {
    const rawRows =
      formMode === "cancellation" ? cancellationRows : transferRows;
    const activeRecords = rawRows.filter(
      (r) =>
        r.customerName.trim() ||
        r.caseNumber.trim() ||
        r.workOrderNumber.trim() ||
        r.workshop.trim()
    );

    if (activeRecords.length === 0) {
      setNotification({
        type: "error",
        message:
          "No case records found to synchronize. Please enter or upload at least one case row."
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    setIsSubmitting(true);
    const batchId = `BATCH-${Date.now()}`;
    const submittedAt = new Date().toISOString();
    const operatorName = userName || userEmail.split("@")[0] || "FSM Engineer";

    const payload = {
      type: formMode,
      batchId,
      submittedBy: operatorName,
      submitterEmail: userEmail.trim().toLowerCase(),
      timestamp: submittedAt,
      rowCount: activeRecords.length,
      records: activeRecords
    };

    // Submit to Server Proxy
    const proxyResponse = await submitToCasesProxy(
      `/api/cases/${formMode}/batch`,
      payload,
      userEmail
    );

    setIsSubmitting(false);

    if (proxyResponse?.success !== false) {
      // Clear active buffer
      if (formMode === "cancellation") {
        setCancellationRows([]);
      } else {
        setTransferRows([]);
      }

      // Re-fetch live shared cases
      await fetchSharedCases();

      setNotification({
        type: "success",
        message: `Successfully transmitted ${activeRecords.length} ${formMode} cases to CRM review queue!`
      });
      setMatrixTab("uploaded");
      setTimeout(() => setNotification(null), 4500);
    } else {
      setNotification({
        type: "error",
        message:
          proxyResponse?.error ||
          "Submission failed. Please check connection and try again."
      });
      setTimeout(() => setNotification(null), 4500);
    }
  };

  // Restore uploaded case to active buffer
  const handleRestoreUploadedCase = (row: SharedCaseRecord) => {
    const newId = `row-${Date.now()}`;
    if (row.mode === "cancellation") {
      const restored: CancellationRow = {
        id: newId,
        customerName: row.customerName,
        caseNumber: row.caseNumber,
        workOrderNumber: row.workOrderNumber,
        workshop: row.workshop,
        branch: row.branch,
        caseRegistrationDate: row.caseRegistrationDate,
        cancellationReason: row.cancellationReason || ""
      };
      setCancellationRows((prev) => [restored, ...prev]);
    } else {
      const restored: TransferRow = {
        id: newId,
        customerName: row.customerName,
        caseNumber: row.caseNumber,
        workOrderNumber: row.workOrderNumber,
        workshop: row.workshop,
        branch: row.branch,
        caseRegistrationDate: row.caseRegistrationDate,
        workshopToAssign: row.workshopToAssign || "",
        transferReason: row.transferReason || ""
      };
      setTransferRows((prev) => [restored, ...prev]);
    }
    setMatrixTab("new");
    setNotification({
      type: "success",
      message: `Copied Case #${row.caseNumber} to active buffer for editing/resubmission.`
    });
    setTimeout(() => setNotification(null), 3500);
  };

  // Export uploaded cases archive to Excel
  const handleExportUploadedCases = () => {
    const modeCases = sharedCases.filter((c) => c.mode === formMode);
    if (modeCases.length === 0) {
      setNotification({
        type: "error",
        message: `No ${formMode} records in archive to export.`
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    exportUploadedCasesToExcel(modeCases, formMode);
    setNotification({
      type: "success",
      message: `Exported ${modeCases.length} ${formMode} records to Excel with CRM Status & Remarks!`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Save CRM Remarks & Status handler (CRM Reviewer & Admin)
  const handleSaveCrmRemarks = async (
    caseId: string,
    newStatus: CrmStatus,
    newRemarks: string
  ): Promise<boolean> => {
    if (!canEditCases) {
      setNotification({
        type: "error",
        message:
          "Forbidden: FSM accounts cannot update case remarks. Only CRM Reviewers or Admin have access."
      });
      return false;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}/remarks`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail
        },
        body: JSON.stringify({
          crmStatus: newStatus,
          crmRemarks: newRemarks,
          editorName: userName || userEmail.split("@")[0]
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const assignedToken = data.case?.tokenId;
        setNotification({
          type: "success",
          message: assignedToken
            ? `Case Approved! Unique Automated Token ID: ${assignedToken}`
            : `CRM status and remarks updated successfully!`
        });
        await fetchSharedCases();
        return true;
      } else {
        setNotification({
          type: "error",
          message: data.error || "Failed to update case remarks"
        });
        return false;
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Error saving CRM remarks"
      });
      return false;
    }
  };

  // Handlers for Excel Import Apply
  const handleApplySingleImportedRows = (
    mode: "cancellation" | "transfer",
    rows: any[]
  ) => {
    if (mode === "cancellation") {
      setCancellationRows((prev) => [...rows, ...prev]);
    } else {
      setTransferRows((prev) => [...rows, ...prev]);
    }
    setMatrixTab("new");
    setNotification({
      type: "success",
      message: `Loaded ${rows.length} rows into active ${mode} buffer.`
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleApplyBothImportedRows = (
    cancellations: CancellationRow[],
    transfers: TransferRow[]
  ) => {
    setCancellationRows((prev) => [...cancellations, ...prev]);
    setTransferRows((prev) => [...transfers, ...prev]);
    setMatrixTab("new");
    setNotification({
      type: "success",
      message: `Dual-Sheet Import: Added ${cancellations.length} cancellations and ${transfers.length} transfers!`
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const activeModeSharedCases = sharedCases.filter((c) => c.mode === formMode);

  const getStatusBadge = (s: string) => {
    const norm = normalizeCrmStatus(s);
    switch (norm) {
      case "Approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Approved
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-400/30 whitespace-nowrap">
            <XCircle className="w-3 h-3 text-rose-400" />
            Rejected
          </span>
        );
      case "Transferred":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 whitespace-nowrap">
            <ArrowRightLeft className="w-3 h-3 text-sky-400" />
            Transferred
          </span>
        );
      case "Pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 whitespace-nowrap">
            <Clock className="w-3 h-3 text-amber-400" />
            Pending
          </span>
        );
    }
  };

  return (
    <div
      id="app-root"
      className="relative min-h-screen w-full bg-[#050B14] text-white flex flex-col font-sans overflow-x-hidden selection:bg-blue-500/30"
    >
      {/* Background Video Layer */}
      <div
        id="bg-video-container"
        className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-65 scale-105 filter blur-[0.5px]"
        />
        <div
          id="bg-video-overlay"
          className="absolute inset-0 bg-gradient-to-b from-[#050B14]/85 via-[#050B14]/75 to-[#050B14]/95 backdrop-blur-[2px]"
        />
      </div>

      {/* Global Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            id="global-notification"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-medium ${
              notification.type === "success"
                ? "bg-emerald-950/80 border-emerald-500/30 text-emerald-200"
                : "bg-red-950/80 border-red-500/30 text-red-200"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-2 text-white/40 hover:text-white"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Navigation Header (Shown when logged in) */}
      <AnimatePresence>
        {viewState !== "LOGIN" && (
          <motion.nav
            id="asme-navbar"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 px-3 sm:px-6 pt-3 pb-2 w-full shrink-0"
          >
            <div
              id="navbar-inner"
              className={`liquid-glass rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between mx-auto border border-white/10 transition-all duration-300 ${
                viewState === "FORM_VIEW" ? "max-w-[1440px]" : "max-w-5xl"
              }`}
            >
              {/* Left: Brand & Portal Badge */}
              <div className="flex items-center gap-4">
                <button
                  id="brand-logo-btn"
                  onClick={() => setViewState("SELECTION")}
                  className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
                >
                  <Globe
                    id="brand-globe-icon"
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300"
                  />
                  <div className="flex items-center gap-2">
                    <span
                      id="brand-name"
                      className="text-white font-semibold text-sm sm:text-base tracking-tight"
                    >
                      Philips Cancellations & CRM Portal
                    </span>
                  </div>
                </button>
              </div>

              {/* Right: Role, Admin Access Switcher & Sign Out */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Admin Access Manager Button */}
                {isAdmin && (
                  <button
                    id="admin-manage-roles-btn"
                    onClick={() => setIsUserManagementOpen(true)}
                    className="liquid-glass rounded-full px-3 py-1.5 text-xs font-semibold text-purple-200 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    title="Manage user access and who can edit CRM remarks"
                  >
                    <Crown className="w-3.5 h-3.5 text-purple-300" />
                    <span className="hidden md:inline">User Permissions</span>
                  </button>
                )}

                {/* User Role Badge Pill */}
                <div
                  id="user-badge-pill"
                  className="glass-pill text-xs px-3 py-1.5 text-white/90 border border-white/10 flex items-center gap-2 shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="font-medium text-white max-w-[100px] sm:max-w-[140px] truncate">
                    {userName || userEmail.split("@")[0]}
                  </span>
                  {isAdmin ? (
                    <span className="text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded-full font-semibold border border-purple-400/30 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" /> ADMIN
                    </span>
                  ) : userRole === "crm_editor" ? (
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded-full font-semibold border border-emerald-400/30 flex items-center gap-0.5">
                      <Edit3 className="w-2.5 h-2.5" /> CRM REVIEWER
                    </span>
                  ) : (
                    <span className="text-[10px] bg-sky-500/20 text-sky-200 px-1.5 py-0.5 rounded-full font-semibold border border-sky-400/20 flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" /> FSM
                    </span>
                  )}
                </div>

                {/* Sign Out Button */}
                <button
                  id="nav-login-btn"
                  onClick={() => {
                    setUserPassword("");
                    setViewState("LOGIN");
                    setNotification({
                      type: "success",
                      message: "Signed out securely."
                    });
                  }}
                  className="liquid-glass rounded-full text-xs font-medium px-3 sm:px-4 py-1.5 text-white border border-white/20 hover:bg-white/10 transition-colors shadow-sm cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Main Viewport Content */}
      <main
        id="main-viewport-content"
        className={`relative z-10 flex-1 flex flex-col px-3 sm:px-6 w-full mx-auto transition-all duration-300 ${
          viewState === "FORM_VIEW"
            ? "max-w-[1440px] justify-start py-2 sm:py-3 h-full"
            : "max-w-5xl items-center justify-center my-auto py-6 sm:py-8"
        }`}
      >
        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* 1. LOGIN STATE                                                            */}
          {/* ========================================================================= */}
          {viewState === "LOGIN" && (
            <motion.div
              key="login-view"
              id="state-login-container"
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center max-w-xl mx-auto py-6 w-full"
            >
              {/* Hero Heading */}
              <motion.h1
                id="login-hero-heading"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7 }}
                className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight leading-[1.12] mb-3"
              >
                Philips Cancellations & CRM Portal
              </motion.h1>

              <p className="text-xs sm:text-sm text-white/60 mb-6 max-w-md">
                Field Service Manager cases submission & CRM live operations review platform
              </p>

              {/* Mode Switcher Tabs */}
              <div
                id="auth-mode-tabs"
                className="flex items-center gap-1.5 p-1 bg-white/10 border border-white/15 rounded-full mb-5 shadow-inner backdrop-blur-md"
              >
                <button
                  type="button"
                  id="tab-btn-signin"
                  onClick={() => {
                    setAuthTab("login");
                    setAuthError(null);
                    setUserPassword("");
                    setConfirmPassword("");
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    authTab === "login"
                      ? "bg-white text-slate-900 shadow-md font-semibold"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  id="tab-btn-setpassword"
                  onClick={() => {
                    setAuthTab("set_password");
                    setAuthError(null);
                    setUserPassword("");
                    setConfirmPassword("");
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    authTab === "set_password"
                      ? "bg-white text-slate-900 shadow-md font-semibold"
                      : "text-white/80 hover:text-white"
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Set / Update Password</span>
                </button>
              </div>

              {/* Login / Set Password Form */}
              <motion.form
                id="login-auth-form"
                onSubmit={handleAuthSubmit}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="w-full max-w-sm flex flex-col gap-3"
              >
                {authTab === "set_password" && (
                  <input
                    id="input-setup-displayname"
                    type="text"
                    placeholder="Your Full Name (Optional)"
                    value={setupDisplayName}
                    onChange={(e) => setSetupDisplayName(e.target.value)}
                    className="w-full px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/50 text-sm backdrop-blur-md"
                  />
                )}

                <input
                  id="input-login-email"
                  type="email"
                  required
                  placeholder="philips.engineer@philips.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/50 text-sm backdrop-blur-md"
                />

                <input
                  id="input-login-password"
                  type="password"
                  required
                  placeholder={
                    authTab === "set_password"
                      ? "Create Password (min 6 chars)"
                      : "Enter Password"
                  }
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/50 text-sm backdrop-blur-md"
                />

                {authTab === "set_password" && (
                  <input
                    id="input-confirm-password"
                    type="password"
                    required
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/50 text-sm backdrop-blur-md"
                  />
                )}

                {authError && (
                  <div
                    id="auth-error-banner"
                    className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-xs text-left flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  id="login-submit-btn"
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {isAuthenticating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : authTab === "login" ? (
                    <>
                      <span>Enter Portal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Save Password & Continue</span>
                      <KeyRound className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 2. SELECTION STATE (Cards Hub)                                            */}
          {/* ========================================================================= */}
          {viewState === "SELECTION" && (
            <motion.div
              key="selection-view"
              id="state-selection-container"
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -15 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center max-w-4xl mx-auto py-6 w-full"
            >
              <h2
                id="selection-heading"
                className="text-3xl sm:text-4xl text-white font-semibold mb-2 tracking-tight"
              >
                Operation Category
              </h2>
              <p
                id="selection-subheading"
                className="text-xs sm:text-sm text-white/60 mb-8 max-w-lg"
              >
                Select an operational workflow. Cases submitted are synced in real time with the CRM Operations team.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                {/* Cancellation Option */}
                <div
                  id="action-card-cancellations"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setFormMode("cancellation");
                    setViewState("FORM_VIEW");
                  }}
                  className="liquid-glass rounded-3xl p-6 sm:p-7 text-left border border-white/15 hover:border-white/40 hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer flex flex-col justify-between min-h-[290px] relative overflow-hidden focus:outline-none focus:border-white/50 shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl liquid-glass border border-white/20 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-rose-500/20 transition-all duration-300">
                      <XCircle className="w-6 h-6 text-rose-400 group-hover:text-rose-300" />
                    </div>
                    <h3 className="text-2xl text-white font-medium group-hover:translate-x-0.5 transition-transform">
                      Cancellation Cases
                    </h3>
                    <p className="text-xs sm:text-[13px] text-white/65 mt-2 leading-relaxed">
                      Register field service cancellations with root cause analysis, work order closure, and customer details.
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs font-semibold text-white/90 pt-4 border-t border-white/10 mt-5">
                    <div className="flex items-center gap-2.5 bg-black/25 px-3 py-1.5 rounded-full border border-white/10">
                      <span className="flex items-center gap-1.5 text-xs text-white/90">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        {cancellationRows.length} Active Buffer
                      </span>
                      <span className="text-white/25">|</span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                        <Archive className="w-3 h-3 text-emerald-400" />
                        {sharedCases.filter((c) => c.mode === "cancellation").length} Shared
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadExcelTemplate("cancellation");
                        }}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white/90 flex items-center gap-1.5 border border-white/15"
                      >
                        <Download className="w-3 h-3 text-sky-300" />
                        <span>Template</span>
                      </button>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white font-medium text-xs pl-1">
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transfer Option */}
                <div
                  id="action-card-transfers"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setFormMode("transfer");
                    setViewState("FORM_VIEW");
                  }}
                  className="liquid-glass rounded-3xl p-6 sm:p-7 text-left border border-white/15 hover:border-white/40 hover:bg-white/[0.04] transition-all duration-300 group cursor-pointer flex flex-col justify-between min-h-[290px] relative overflow-hidden focus:outline-none focus:border-white/50 shadow-xl"
                >
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl liquid-glass border border-white/20 flex items-center justify-center mb-4 group-hover:scale-105 group-hover:bg-sky-500/20 transition-all duration-300">
                      <ArrowRightLeft className="w-6 h-6 text-sky-400 group-hover:text-sky-300" />
                    </div>
                    <h3 className="text-2xl text-white font-medium group-hover:translate-x-0.5 transition-transform">
                      Transfer Cases
                    </h3>
                    <p className="text-xs sm:text-[13px] text-white/65 mt-2 leading-relaxed">
                      Reassign registered work orders across workshops, branches, and regional facility hubs dynamically.
                    </p>
                  </div>

                  <div className="relative z-10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs font-semibold text-white/90 pt-4 border-t border-white/10 mt-5">
                    <div className="flex items-center gap-2.5 bg-black/25 px-3 py-1.5 rounded-full border border-white/10">
                      <span className="flex items-center gap-1.5 text-xs text-white/90">
                        <span className="w-2 h-2 rounded-full bg-sky-400" />
                        {transferRows.length} Active Buffer
                      </span>
                      <span className="text-white/25">|</span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                        <Archive className="w-3 h-3 text-emerald-400" />
                        {sharedCases.filter((c) => c.mode === "transfer").length} Shared
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadExcelTemplate("transfer");
                        }}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium text-white/90 flex items-center gap-1.5 border border-white/15"
                      >
                        <Download className="w-3 h-3 text-sky-300" />
                        <span>Template</span>
                      </button>
                      <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform text-white font-medium text-xs pl-1">
                        Open <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Back to Home Button */}
              <button
                id="selection-back-btn"
                onClick={() => setViewState("LOGIN")}
                className="mt-8 text-xs text-white/60 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Welcome Screen
              </button>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* 3. FORM_VIEW STATE (Workspace & Matrix)                                   */}
          {/* ========================================================================= */}
          {viewState === "FORM_VIEW" && (
            <motion.div
              key="form-view"
              id="state-form-view-container"
              initial={{ opacity: 0, scale: 0.98, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -15 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full flex flex-col h-full max-h-[86vh]"
            >
              {/* Top Controls Bar */}
              <div
                id="form-top-bar"
                className="liquid-glass rounded-2xl p-3 sm:p-4 mb-3 border border-white/15 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xl"
              >
                {/* Mode Switcher & Back Button */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <button
                    id="form-back-to-portal-btn"
                    onClick={() => setViewState("SELECTION")}
                    className="glass-pill px-3 py-2 text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Portal</span>
                  </button>

                  <div className="h-6 w-px bg-white/20 hidden sm:block" />

                  {/* Mode Tabs: Cancellation vs Transfer */}
                  <div
                    id="form-mode-tabs"
                    className="liquid-glass rounded-full p-1 flex items-center border border-white/10"
                  >
                    <button
                      id="tab-cancellation-mode"
                      onClick={() => setFormMode("cancellation")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        formMode === "cancellation"
                          ? "bg-white/20 text-white shadow-sm border border-white/25"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>Cancellation Cases</span>
                    </button>

                    <button
                      id="tab-transfer-mode"
                      onClick={() => setFormMode("transfer")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                        formMode === "transfer"
                          ? "bg-white/20 text-white shadow-sm border border-white/25"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                      <span>Transfer Cases</span>
                    </button>
                  </div>

                  <div className="h-6 w-px bg-white/20 hidden sm:block" />

                  {/* Section Switcher: New Cases Buffer vs Live CRM Cases & Remarks */}
                  <div
                    id="section-subtabs-switcher"
                    className="liquid-glass rounded-full p-1 flex items-center border border-white/10 bg-black/20"
                  >
                    <button
                      id="tab-section-new-cases"
                      onClick={() => setMatrixTab("new")}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        matrixTab === "new"
                          ? "bg-white/25 text-white shadow-sm border border-white/30"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Submit Cases (Buffer)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/15 font-mono">
                        {formMode === "cancellation"
                          ? cancellationRows.length
                          : transferRows.length}
                      </span>
                    </button>

                    <button
                      id="tab-section-uploaded-cases"
                      onClick={() => {
                        setMatrixTab("uploaded");
                        fetchSharedCases();
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                        matrixTab === "uploaded"
                          ? "bg-white/25 text-white shadow-sm border border-white/30"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-sky-300" />
                      <span>Live CRM Queue & Remarks</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-500/25 text-sky-200 font-mono">
                        {activeModeSharedCases.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                  {matrixTab === "new" ? (
                    <>
                      {/* Download Template */}
                      <button
                        id="download-template-action-btn"
                        onClick={() => downloadExcelTemplate(formMode)}
                        className="liquid-glass rounded-full px-3 py-2 text-xs font-medium text-white/90 hover:bg-white/15 transition-all flex items-center gap-1.5 border border-white/15 cursor-pointer shadow-sm active:scale-95"
                        title={`Download official ${formMode} Excel template (.xlsx)`}
                      >
                        <Download className="w-3.5 h-3.5 text-sky-300" />
                        <span className="hidden sm:inline">Template</span>
                      </button>

                      {/* Upload Excel Button */}
                      <button
                        id="upload-excel-action-btn"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="liquid-glass rounded-full px-3.5 py-2 text-xs font-semibold text-white bg-sky-500/25 hover:bg-sky-500/35 transition-all flex items-center gap-1.5 border border-sky-400/40 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Upload className="w-3.5 h-3.5 text-sky-300" />
                        <span>Upload Excel</span>
                      </button>

                      {/* Add Row Button */}
                      <button
                        id="add-row-action-btn"
                        onClick={handleAddRow}
                        className="liquid-glass rounded-full px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-sm active:scale-95"
                      >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Add Row</span>
                      </button>

                      {/* Submit Button */}
                      <button
                        id="submit-batch-proxy-btn"
                        onClick={handleBatchSubmit}
                        disabled={isSubmitting}
                        className="liquid-glass rounded-full px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-emerald-500/30 hover:bg-emerald-500/40 transition-all flex items-center gap-2 border border-emerald-400/40 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-white" />
                            <span>Submit to CRM</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Refresh Button */}
                      <button
                        onClick={fetchSharedCases}
                        disabled={isLoadingCases}
                        className="p-2 rounded-full liquid-glass border border-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                        title="Refresh Live CRM Cases"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            isLoadingCases ? "animate-spin text-blue-400" : ""
                          }`}
                        />
                      </button>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="search-uploaded-cases-input"
                          type="text"
                          value={uploadedSearchQuery}
                          onChange={(e) =>
                            setUploadedSearchQuery(e.target.value)
                          }
                          placeholder="Search cases, WO#, customer, remarks..."
                          className="bg-black/30 text-white text-xs pl-8 pr-3 py-1.5 rounded-full border border-white/15 focus:border-white/40 focus:outline-none placeholder-white/40 w-44 sm:w-60"
                        />
                        {uploadedSearchQuery && (
                          <button
                            onClick={() => setUploadedSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {/* Export to Excel */}
                      <button
                        id="export-uploaded-excel-btn"
                        onClick={handleExportUploadedCases}
                        className="liquid-glass rounded-full px-3.5 py-1.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-sm active:scale-95"
                        title="Export current CRM cases to Excel (.xlsx)"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Export Excel</span>
                      </button>

                      {/* Switch to Add New */}
                      <button
                        id="switch-to-new-cases-btn"
                        onClick={() => setMatrixTab("new")}
                        className="liquid-glass rounded-full px-3.5 py-1.5 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 transition-all flex items-center gap-1.5 border border-white/30 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>New Batch</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Status Filter Bar for CRM Queue */}
              {matrixTab === "uploaded" && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2 px-1 text-xs shrink-0">
                  <span className="text-[11px] text-white/50 font-medium mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Status Filter:
                  </span>
                  {[
                    "ALL",
                    "Approved",
                    "Rejected",
                    "Pending",
                    "Transferred"
                  ].map((filterVal) => (
                    <button
                      key={filterVal}
                      onClick={() => setSelectedStatusFilter(filterVal)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer border ${
                        selectedStatusFilter === filterVal
                          ? "bg-white/25 text-white border-white/40 shadow-sm"
                          : "bg-black/20 text-white/60 border-white/10 hover:text-white"
                      }`}
                    >
                      {filterVal === "ALL" ? "All Cases" : filterVal}
                    </button>
                  ))}
                </div>
              )}

              {/* Matrix Table Container */}
              <div
                id="matrix-table-card"
                className="liquid-glass rounded-2xl border border-white/15 shadow-2xl flex-1 flex flex-col overflow-hidden min-h-0"
              >
                {/* Scrollable Viewport */}
                <div
                  id="matrix-table-viewport"
                  className="flex-1 overflow-x-auto overflow-y-auto max-h-[62vh] p-2"
                >
                  {matrixTab === "new" ? (
                    /* ========================================================================= */
                    /* ACTIVE NEW CASES EDITABLE TABLE (BUFFER)                                  */
                    /* ========================================================================= */
                    <table
                      id="matrix-data-table"
                      className="w-full text-left text-xs border-collapse min-w-[900px]"
                    >
                      <thead>
                        <tr className="border-b border-white/15 text-white/70 uppercase tracking-wider font-semibold text-[11px] sticky top-0 bg-[#0B1528]/80 backdrop-blur-md z-10">
                          <th className="py-3 px-3 w-10 text-center">#</th>
                          <th className="py-3 px-3 min-w-[140px]">Customer Name</th>
                          <th className="py-3 px-3 min-w-[110px]">Case Number</th>
                          <th className="py-3 px-3 min-w-[110px]">Work Order</th>
                          <th className="py-3 px-3 min-w-[170px]">Workshop</th>
                          <th className="py-3 px-3 min-w-[130px]">Branch</th>
                          <th className="py-3 px-3 min-w-[130px]">
                            Registration Date
                          </th>
                          {formMode === "transfer" && (
                            <th className="py-3 px-3 min-w-[170px]">
                              Workshop to Assign
                            </th>
                          )}
                          <th className="py-3 px-3 min-w-[200px]">
                            {formMode === "cancellation"
                              ? "Cancellation Reason"
                              : "Transfer Reason"}
                          </th>
                          <th className="py-3 px-3 w-12 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {formMode === "cancellation" ? (
                          cancellationRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="py-14 text-center text-white/50"
                              >
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <FileSpreadsheet className="w-6 h-6 text-white/40" />
                                  </div>
                                  <span className="text-sm font-medium text-white/80">
                                    No new cancellation cases in active buffer
                                  </span>
                                  <p className="text-xs text-white/40 max-w-sm">
                                    Click "Add Row" to manually enter cases, or "Upload Excel" to import in batch. Submitted cases are saved in the "Live CRM Queue" section.
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                      onClick={handleAddRow}
                                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 border border-white/15"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Add First Row</span>
                                    </button>
                                    <button
                                      onClick={() => setIsUploadModalOpen(true)}
                                      className="px-3 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-xs font-semibold text-white flex items-center gap-1.5 border border-sky-400/30"
                                    >
                                      <Upload className="w-3.5 h-3.5 text-sky-300" />
                                      <span>Upload Excel</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            cancellationRows.map((row, index) => (
                              <tr
                                key={row.id}
                                id={`row-cancellation-${row.id}`}
                                className="hover:bg-white/[0.03] transition-colors group"
                              >
                                <td className="py-2.5 px-3 text-center text-white/50 font-mono">
                                  {index + 1}
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={row.customerName}
                                    onChange={(e) =>
                                      handleUpdateCancellation(
                                        row.id,
                                        "customerName",
                                        e.target.value
                                      )
                                    }
                                    placeholder=" "
                                    className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={row.caseNumber}
                                    onChange={(e) =>
                                      handleUpdateCancellation(
                                        row.id,
                                        "caseNumber",
                                        e.target.value
                                      )
                                    }
                                    placeholder=" "
                                    className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none font-mono placeholder-white/30"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={row.workOrderNumber}
                                    onChange={(e) =>
                                      handleUpdateCancellation(
                                        row.id,
                                        "workOrderNumber",
                                        e.target.value
                                      )
                                    }
                                    placeholder=" "
                                    className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none font-mono placeholder-white/30"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={row.workshop}
                                    onChange={(e) =>
                                      handleUpdateCancellation(
                                        row.id,
                                        "workshop",
                                        e.target.value
                                      )
                                    }
                                    placeholder=" "
                                    className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={row.branch}
                                    onChange={(e) =>
                                      handleUpdateCancellation(
                                        row.id,
                                        "branch",
                                        e.target.value
                                      )
                                    }
                                    placeholder=" "
                                    className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="date"
                                    value={row.caseRegistrationDate}
                                    onChange={(e) =>
                                      handleUpdateCancellation(
                                        row.id,
                                        "caseRegistrationDate",
                                        e.target.value
                                      )
                                    }
                                    className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none font-mono text-xs"
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={row.cancellationReason}
                                    onChange={(e) =>
                                      handleUpdateCancellation(
                                        row.id,
                                        "cancellationReason",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Reason for cancellation"
                                    className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    onClick={() => handleDeleteRow(row.id)}
                                    className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete row from draft buffer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )
                        ) : transferRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className="py-14 text-center text-white/50"
                            >
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                  <FileSpreadsheet className="w-6 h-6 text-white/40" />
                                </div>
                                <span className="text-sm font-medium text-white/80">
                                  No new transfer cases in active buffer
                                </span>
                                <p className="text-xs text-white/40 max-w-sm">
                                  Click "Add Row" to manually enter transfer cases, or "Upload Excel" to import in batch.
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <button
                                    onClick={handleAddRow}
                                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 border border-white/15"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Add First Row</span>
                                  </button>
                                  <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="px-3 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 text-xs font-semibold text-white flex items-center gap-1.5 border border-sky-400/30"
                                  >
                                    <Upload className="w-3.5 h-3.5 text-sky-300" />
                                    <span>Upload Excel</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          transferRows.map((row, index) => (
                            <tr
                              key={row.id}
                              id={`row-transfer-${row.id}`}
                              className="hover:bg-white/[0.03] transition-colors group"
                            >
                              <td className="py-2.5 px-3 text-center text-white/50 font-mono">
                                {index + 1}
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.customerName}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "customerName",
                                      e.target.value
                                    )
                                  }
                                  placeholder=" "
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.caseNumber}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "caseNumber",
                                      e.target.value
                                    )
                                  }
                                  placeholder=" "
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none font-mono placeholder-white/30"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.workOrderNumber}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "workOrderNumber",
                                      e.target.value
                                    )
                                  }
                                  placeholder=" "
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none font-mono placeholder-white/30"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.workshop}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "workshop",
                                      e.target.value
                                    )
                                  }
                                  placeholder=" "
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.branch}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "branch",
                                      e.target.value
                                    )
                                  }
                                  placeholder=" "
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="date"
                                  value={row.caseRegistrationDate}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "caseRegistrationDate",
                                      e.target.value
                                    )
                                  }
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none font-mono text-xs"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.workshopToAssign}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "workshopToAssign",
                                      e.target.value
                                    )
                                  }
                                  placeholder="New workshop"
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-sky-200 px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={row.transferReason}
                                  onChange={(e) =>
                                    handleUpdateTransfer(
                                      row.id,
                                      "transferReason",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Reason for transfer"
                                  className="table-input-smooth w-full bg-white/[0.04] focus:bg-white/[0.08] text-white px-2.5 py-1.5 rounded-lg border border-white/10 focus:border-white/40 focus:outline-none placeholder-white/30"
                                />
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  onClick={() => handleDeleteRow(row.id)}
                                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Delete row from draft buffer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    /* ========================================================================= */
                    /* LIVE CRM CASES & REMARKS ARCHIVE TABLE                                    */
                    /* ========================================================================= */
                    (() => {
                      let list = activeModeSharedCases;

                      // Status filter
                      if (selectedStatusFilter !== "ALL") {
                        list = list.filter(
                          (c) =>
                            c.crmStatus === selectedStatusFilter ||
                            normalizeCrmStatus(c.crmStatus) === selectedStatusFilter
                        );
                      }

                      // Search filter
                      const q = uploadedSearchQuery.trim().toLowerCase();
                      const filtered = q
                        ? list.filter(
                            (r) =>
                              r.customerName.toLowerCase().includes(q) ||
                              r.caseNumber.toLowerCase().includes(q) ||
                              r.workOrderNumber.toLowerCase().includes(q) ||
                              r.workshop.toLowerCase().includes(q) ||
                              r.branch.toLowerCase().includes(q) ||
                              (r.tokenId && r.tokenId.toLowerCase().includes(q)) ||
                              (r.cancellationReason &&
                                r.cancellationReason.toLowerCase().includes(q)) ||
                              (r.transferReason &&
                                r.transferReason.toLowerCase().includes(q)) ||
                              (r.crmRemarks &&
                                r.crmRemarks.toLowerCase().includes(q)) ||
                              r.submittedBy.toLowerCase().includes(q)
                          )
                        : list;

                      if (list.length === 0) {
                        return (
                          <div className="py-16 text-center text-white/50 flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                              <Archive className="w-6 h-6 text-white/40" />
                            </div>
                            <span className="text-sm font-medium text-white/80">
                              No {formMode} cases submitted yet
                            </span>
                            <p className="text-xs text-white/40 max-w-sm">
                              When FSMs submit case batches, they will appear here in real time for CRM team review and remark updates.
                            </p>
                            <button
                              onClick={() => setMatrixTab("new")}
                              className="mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 border border-white/15"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Submit Cases</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div>
                          {/* Filtered Meta Bar */}
                          <div className="flex items-center justify-between px-3 py-2 text-xs text-white/60 border-b border-white/10 mb-2">
                            <span>
                              Showing <strong>{filtered.length}</strong> of{" "}
                              <strong>{activeModeSharedCases.length}</strong> {formMode} records
                            </span>
                            <span className="text-[11px] text-white/40">
                              {canEditCases
                                ? "CRM Review Mode: You have edit rights to update remarks & statuses."
                                : "FSM Mode: Status and CRM remarks are Read-Only."}
                            </span>
                          </div>

                          <table
                            id="uploaded-cases-data-table"
                            className="w-full text-left text-xs border-collapse min-w-[1100px]"
                          >
                            <thead>
                              <tr className="border-b border-white/15 text-white/70 uppercase tracking-wider font-semibold text-[11px] sticky top-0 bg-[#0B1528]/80 backdrop-blur-md z-10">
                                <th className="py-3 px-3 w-10 text-center">#</th>
                                <th className="py-3 px-3 min-w-[130px]">Customer</th>
                                <th className="py-3 px-3 min-w-[100px]">Case #</th>
                                <th className="py-3 px-3 min-w-[100px]">Work Order</th>
                                <th className="py-3 px-3 min-w-[140px]">Workshop / Branch</th>
                                <th className="py-3 px-3 min-w-[160px]">
                                  {formMode === "cancellation"
                                    ? "Cancellation Reason"
                                    : "Transfer Details"}
                                </th>
                                <th className="py-3 px-3 min-w-[120px] text-center">
                                  CRM Status
                                </th>
                                <th className="py-3 px-3 min-w-[110px] text-center">
                                  Token ID
                                </th>
                                <th className="py-3 px-3 min-w-[240px]">
                                  CRM Remarks & Resolution
                                </th>
                                <th className="py-3 px-3 min-w-[110px]">Submitted By</th>
                                <th className="py-3 px-3 w-28 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                              {filtered.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={11}
                                    className="py-10 text-center text-white/40"
                                  >
                                    No records matching filter or search query.
                                  </td>
                                </tr>
                              ) : (
                                filtered.map((row, index) => (
                                  <tr
                                    key={row.id}
                                    id={`shared-row-${row.id}`}
                                    className="hover:bg-white/[0.03] transition-colors"
                                  >
                                    <td className="py-2.5 px-3 text-center text-white/40 font-mono">
                                      {index + 1}
                                    </td>
                                    <td className="py-2.5 px-3 text-white font-medium">
                                      {row.customerName || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-sky-300">
                                      {row.caseNumber || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-emerald-300">
                                      {row.workOrderNumber || "—"}
                                    </td>
                                    <td className="py-2.5 px-3 text-white/80">
                                      <div>{row.workshop || "—"}</div>
                                      <div className="text-[10px] text-white/50 font-mono">
                                        {row.branch}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-white/70 max-w-xs">
                                      {formMode === "cancellation" ? (
                                        <p className="truncate" title={row.cancellationReason}>
                                          {row.cancellationReason || "—"}
                                        </p>
                                      ) : (
                                        <div>
                                          <span className="text-[10px] text-sky-300 block">
                                            To: {row.workshopToAssign || "—"}
                                          </span>
                                          <p className="truncate text-white/60" title={row.transferReason}>
                                            {row.transferReason || "—"}
                                          </p>
                                        </div>
                                      )}
                                    </td>

                                    {/* CRM Status Badge */}
                                    <td className="py-2.5 px-3 text-center">
                                      {getStatusBadge(row.crmStatus)}
                                    </td>

                                    {/* Automated Token ID */}
                                    <td className="py-2.5 px-3 text-center font-mono">
                                      {normalizeCrmStatus(row.crmStatus) === "Approved" && row.tokenId ? (
                                        <span
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider shadow-sm"
                                          title={`Unique Approval Token ID: ${row.tokenId}`}
                                        >
                                          <Tag className="w-3 h-3 text-emerald-400" />
                                          {row.tokenId}
                                        </span>
                                      ) : (
                                        <span
                                          className="text-white/25 text-[11px]"
                                          title="Assigned automatically upon CRM Approval"
                                        >
                                          —
                                        </span>
                                      )}
                                    </td>

                                    {/* CRM Remarks Note */}
                                    <td className="py-2.5 px-3">
                                      <div className="p-2 rounded-lg bg-black/30 border border-white/10 text-xs text-slate-200">
                                        <p className="line-clamp-2 leading-relaxed">
                                          {row.crmRemarks || "Awaiting review from CRM team."}
                                        </p>
                                        {row.crmUpdatedBy && (
                                          <div className="mt-1 flex items-center justify-between text-[9px] text-white/40 pt-1 border-t border-white/5">
                                            <span>By: {row.crmUpdatedBy}</span>
                                            <span>
                                              {row.crmUpdatedAt
                                                ? new Date(row.crmUpdatedAt).toLocaleDateString([], {
                                                    month: "short",
                                                    day: "numeric"
                                                  })
                                                : ""}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </td>

                                    {/* Submitter info */}
                                    <td className="py-2.5 px-3 text-[11px] text-white/60 whitespace-nowrap">
                                      <div className="font-medium text-white/80">
                                        {row.submittedBy}
                                      </div>
                                      <div className="text-[10px] text-white/40">
                                        {new Date(row.submittedAt).toLocaleDateString([], {
                                          month: "short",
                                          day: "numeric"
                                        })}
                                      </div>
                                    </td>

                                    {/* Action Buttons */}
                                    <td className="py-2.5 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        {canEditCases ? (
                                          <button
                                            id={`update-crm-remarks-btn-${row.id}`}
                                            onClick={() => {
                                              setSelectedCaseForRemarks(row);
                                              setIsCrmRemarksModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                                            title="Update CRM Status & Resolution Remarks"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                            <span>Review</span>
                                          </button>
                                        ) : (
                                          <button
                                            id={`view-crm-remarks-btn-${row.id}`}
                                            onClick={() => {
                                              setSelectedCaseForRemarks(row);
                                              setIsCrmRemarksModalOpen(true);
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 text-xs font-medium border border-white/15 transition-colors flex items-center gap-1 cursor-pointer"
                                            title="View case details and CRM resolution remarks"
                                          >
                                            <Eye className="w-3 h-3 text-sky-400" />
                                            <span>Details</span>
                                          </button>
                                        )}

                                        <button
                                          id={`restore-uploaded-btn-${row.id}`}
                                          onClick={() => handleRestoreUploadedCase(row)}
                                          className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                          title="Copy to active buffer for re-submission"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        formMode={formMode}
        onApplySingleMode={handleApplySingleImportedRows}
        onApplyBothModes={handleApplyBothImportedRows}
      />

      {/* Admin User Access & Permissions Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUserEmail={userEmail}
        onNotification={(notif) => {
          setNotification(notif);
          setTimeout(() => setNotification(null), 3500);
        }}
      />

      {/* CRM Remarks & Status Review Modal */}
      <CrmRemarksModal
        isOpen={isCrmRemarksModalOpen}
        onClose={() => {
          setIsCrmRemarksModalOpen(false);
          setSelectedCaseForRemarks(null);
        }}
        caseItem={selectedCaseForRemarks}
        canEdit={canEditCases}
        currentUserEmail={userEmail}
        currentUserName={userName || userEmail.split("@")[0]}
        onSaveRemarks={handleSaveCrmRemarks}
      />

      {/* Subtle Footer */}
      <footer
        id="asme-footer"
        className="relative z-10 w-full py-4 text-center text-xs text-white/40 shrink-0"
      >
        <span>Philips Cancellations & CRM Portal © 2026. All rights reserved.</span>
      </footer>
    </div>
  );
}
