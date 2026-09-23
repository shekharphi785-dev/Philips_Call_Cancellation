import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  Hash,
  Calendar,
  FileText,
  Save,
  Loader2,
  Lock,
  Edit3,
  Sparkles,
  ArrowRightLeft,
  XCircle,
  Tag,
  Copy,
  Check
} from "lucide-react";

export type CrmStatus =
  | "Approved"
  | "Rejected"
  | "Pending"
  | "Transferred"
  | "Submitted"
  | "Under Review"
  | "Approved - SAP Cancelled"
  | "Rejected / Ineligible"
  | "Info Required"
  | "Duplicate / Closed";

export const normalizeCrmStatus = (s?: string): "Approved" | "Rejected" | "Pending" | "Transferred" => {
  if (!s) return "Pending";
  if (s === "Approved" || s.toLowerCase().includes("approved")) return "Approved";
  if (s === "Rejected" || s.toLowerCase().includes("reject")) return "Rejected";
  if (s === "Transferred" || s.toLowerCase().includes("transfer")) return "Transferred";
  return "Pending";
};

/**
 * Automated unique Token ID generator for Approved cases:
 * - Cancellation token starts with 1 (e.g. 100001, 100002, ...)
 * - Transfer token starts with 2 (e.g. 200001, 200002, ...)
 */
export function generateApprovalTokenId(
  mode: "cancellation" | "transfer",
  existingCases: Array<{ tokenId?: string; mode?: string }>
): string {
  if (mode === "cancellation") {
    const numbers = existingCases
      .filter((c) => c.tokenId && String(c.tokenId).startsWith("1"))
      .map((c) => parseInt(String(c.tokenId), 10))
      .filter((n) => !isNaN(n) && n >= 100000 && n < 200000);
    const max = numbers.length > 0 ? Math.max(...numbers) : 100000;
    return String(max + 1);
  } else {
    const numbers = existingCases
      .filter((c) => c.tokenId && String(c.tokenId).startsWith("2"))
      .map((c) => parseInt(String(c.tokenId), 10))
      .filter((n) => !isNaN(n) && n >= 200000 && n < 300000);
    const max = numbers.length > 0 ? Math.max(...numbers) : 200000;
    return String(max + 1);
  }
}

export interface SharedCaseRecord {
  id: string;
  mode: "cancellation" | "transfer";
  customerName: string;
  caseNumber: string;
  workOrderNumber: string;
  workshop: string;
  branch: string;
  caseRegistrationDate: string;
  cancellationReason?: string;
  transferReason?: string;
  workshopToAssign?: string;
  submittedAt: string;
  submittedBy: string;
  submitterEmail: string;
  batchId: string;
  crmStatus: CrmStatus;
  crmRemarks: string;
  crmUpdatedBy?: string;
  crmUpdatedAt?: string;
  tokenId?: string;
}

interface CrmRemarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: SharedCaseRecord | null;
  canEdit: boolean;
  currentUserEmail: string;
  currentUserName: string;
  onSaveRemarks: (
    caseId: string,
    newStatus: CrmStatus,
    newRemarks: string
  ) => Promise<boolean>;
}

export const CrmRemarksModal: React.FC<CrmRemarksModalProps> = ({
  isOpen,
  onClose,
  caseItem,
  canEdit,
  currentUserEmail,
  currentUserName,
  onSaveRemarks
}) => {
  if (!isOpen || !caseItem) return null;

  const [status, setStatus] = useState<CrmStatus>(
    normalizeCrmStatus(caseItem.crmStatus)
  );
  const [remarks, setRemarks] = useState(caseItem.crmRemarks || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSaving(true);
    const success = await onSaveRemarks(caseItem.id, status, remarks);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  const isCancellation = caseItem.mode === "cancellation";

  const getStatusBadgeClass = (s: CrmStatus | string) => {
    switch (s) {
      case "Approved":
      case "Approved - SAP Cancelled":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "Rejected":
      case "Rejected / Ineligible":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "Transferred":
        return "bg-sky-500/20 text-sky-300 border-sky-500/30";
      case "Pending":
      case "Submitted":
      case "Under Review":
      case "Info Required":
      default:
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        id="crm-remarks-modal"
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isCancellation
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-400"
              }`}
            >
              {isCancellation ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <ArrowRightLeft className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  {canEdit ? "Update CRM Review & Remarks" : "Case Details & CRM Status"}
                </h2>
                <span
                  className={`px-2 py-0.5 text-[10px] font-semibold border rounded-full ${getStatusBadgeClass(
                    caseItem.crmStatus
                  )}`}
                >
                  {caseItem.crmStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Case No: <span className="text-slate-200 font-mono font-medium">{caseItem.caseNumber}</span> | Work Order: <span className="text-slate-200 font-mono font-medium">{caseItem.workOrderNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Case Meta Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Customer Name
              </span>
              <span className="text-slate-200 font-medium">{caseItem.customerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Branch / Workshop
              </span>
              <span className="text-slate-200 font-medium truncate block" title={`${caseItem.branch || "-"} (${caseItem.workshop})`}>
                {caseItem.branch || "-"} ({caseItem.workshop})
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Registration Date
              </span>
              <span className="text-slate-200 font-medium">
                {caseItem.caseRegistrationDate}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                Approval Token ID
              </span>
              {caseItem.crmStatus === "Approved" && caseItem.tokenId ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300 font-mono font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  <Tag className="w-3 h-3 text-emerald-400" />
                  {caseItem.tokenId}
                </span>
              ) : (
                <span className="text-slate-500 italic text-xs">
                  — (Only on Approval)
                </span>
              )}
            </div>

            {isCancellation ? (
              <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                  FSM Stated Cancellation Reason
                </span>
                <p className="text-slate-300 italic mt-0.5">
                  "{caseItem.cancellationReason || "No reason specified"}"
                </p>
              </div>
            ) : (
              <>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Workshop to Assign
                  </span>
                  <span className="text-blue-300 font-medium">
                    {caseItem.workshopToAssign || "-"}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3 pt-2 border-t border-slate-800/80 sm:border-t-0 sm:pt-0">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    FSM Stated Transfer Reason
                  </span>
                  <p className="text-slate-300 italic mt-0.5">
                    "{caseItem.transferReason || "No reason specified"}"
                  </p>
                </div>
              </>
            )}

            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>
                Submitted by: <strong className="text-slate-300">{caseItem.submittedBy}</strong> ({caseItem.submitterEmail || "FSM"})
              </span>
              <span>
                {new Date(caseItem.submittedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* CRM Editor Section or Read-Only Viewer */}
          {canEdit ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>CRM Review Status</span>
                  <span className="text-[11px] text-blue-400 font-normal">
                    Select current operational state
                  </span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CrmStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending">Pending</option>
                  <option value="Transferred">Transferred</option>
                </select>

                {/* Token ID Status preview banner */}
                {status === "Approved" ? (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-emerald-300 font-medium">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      <span>Automated Token ID:</span>
                      <span className="font-mono font-bold bg-emerald-950/90 text-emerald-200 px-2.5 py-0.5 rounded border border-emerald-500/30">
                        {caseItem.tokenId || (isCancellation ? "Auto: Starts with 1 (e.g. 100001)" : "Auto: Starts with 2 (e.g. 200001)")}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400/80 font-medium">
                      {caseItem.tokenId ? "Active" : "Generated on Save"}
                    </span>
                  </div>
                ) : caseItem.tokenId ? (
                  <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center gap-2 text-xs text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>
                      Token ID <strong className="font-mono">{caseItem.tokenId}</strong> is only for Approved cases and will be removed upon saving.
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500 italic">
                    Token ID is automatically generated only when the case is set to Approved.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
                  <span>CRM Remarks / Resolution Notes</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    FSM will view this note on their portal
                  </span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Verified with customer. Notification closed in SAP by CRM team."
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {/* Quick Template buttons */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] text-slate-400 font-medium mr-1">
                  Quick Remarks:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("Approved");
                    setRemarks(
                      `Approved & verified in SAP. Processed by ${currentUserName}.`
                    );
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 transition-colors cursor-pointer"
                >
                  + Approved
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("Rejected");
                    setRemarks(
                      `Rejected per operational review. Not eligible for cancellation/transfer. Reviewed by ${currentUserName}.`
                    );
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-rose-300 transition-colors cursor-pointer"
                >
                  + Rejected
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("Pending");
                    setRemarks(
                      "Pending technical verification with engineering and workshop."
                    );
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 transition-colors cursor-pointer"
                >
                  + Pending
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("Transferred");
                    setRemarks(
                      `Transferred to assigned workshop. Work order routed in SAP by ${currentUserName}.`
                    );
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 transition-colors cursor-pointer"
                >
                  + Transferred
                </button>
              </div>

              {/* Submit button */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-blue-900/30"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Publish CRM Remarks</span>
                </button>
              </div>
            </form>
          ) : (
            /* Read Only View for FSM */
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Current CRM Status:
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold border rounded-full ${getStatusBadgeClass(
                        caseItem.crmStatus
                      )}`}
                    >
                      {caseItem.crmStatus}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Read-Only for FSM
                  </span>
                </div>

                {/* Token ID for Approved Cases */}
                {caseItem.crmStatus === "Approved" && caseItem.tokenId && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-slate-300 font-medium">Automated Approval Token ID:</span>
                      <span className="text-sm font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                        {caseItem.tokenId}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      Approved & Authorized
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                    CRM Remarks & Resolution Notes:
                  </span>
                  <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-lg text-xs text-slate-200 leading-relaxed">
                    {caseItem.crmRemarks || "Awaiting review from CRM team."}
                  </div>
                </div>

                {caseItem.crmUpdatedBy && (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <span>
                      Updated By:{" "}
                      <strong className="text-slate-300">
                        {caseItem.crmUpdatedBy}
                      </strong>
                    </span>
                    <span>
                      {caseItem.crmUpdatedAt
                        ? new Date(caseItem.crmUpdatedAt).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                <p>
                  As an FSM field engineer, submitted cases are locked from edits. CRM team review updates appear here live as they process your cancellation or transfer in SAP.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
