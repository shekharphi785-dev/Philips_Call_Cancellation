import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Layers,
  Sparkles
} from "lucide-react";
import {
  downloadUnifiedMasterExcelTemplate,
  downloadExcelTemplate,
  parseAndValidateExcelFile,
  MultiSheetValidationResult,
  CancellationRow,
  TransferRow,
  CANCELLATION_COLUMNS,
  TRANSFER_COLUMNS
} from "../utils/excelHelpers";

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  formMode: "cancellation" | "transfer";
  onApplySingleMode: (rows: any[], mode: "append" | "replace") => void;
  onApplyBothModes: (
    cancellations: CancellationRow[],
    transfers: TransferRow[],
    mode: "append" | "replace"
  ) => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  formMode,
  onApplySingleMode,
  onApplyBothModes
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<MultiSheetValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCancellation = formMode === "cancellation";
  const requiredCols = isCancellation ? CANCELLATION_COLUMNS : TRANSFER_COLUMNS;

  const handleFileProcess = async (file: File) => {
    if (!file) return;
    setIsValidating(true);
    setValidationResult(null);

    const res = await parseAndValidateExcelFile(file, formMode);
    setValidationResult(res);
    setIsValidating(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleReset = () => {
    setValidationResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApplySingle = (type: "append" | "replace") => {
    if (validationResult?.success) {
      const rows =
        validationResult.activeModeRows ||
        (formMode === "cancellation"
          ? validationResult.cancellationRows
          : validationResult.transferRows) ||
        [];
      onApplySingleMode(rows, type);
      handleReset();
      onClose();
    }
  };

  const handleApplyBoth = (type: "append" | "replace") => {
    if (
      validationResult?.success &&
      validationResult.cancellationRows &&
      validationResult.transferRows
    ) {
      onApplyBothModes(
        validationResult.cancellationRows,
        validationResult.transferRows,
        type
      );
      handleReset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="excel-upload-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <motion.div
        id="excel-upload-modal-card"
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="liquid-glass rounded-3xl border border-white/20 p-6 md:p-8 max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl liquid-glass border border-white/20 flex items-center justify-center text-emerald-400 bg-emerald-500/10">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white tracking-wide flex items-center gap-2">
                Excel Upload & Subsheet Validator
              </h3>
              <p className="text-xs text-white/60">
                Upload unified dual-subsheet workbooks or single case spreadsheets.
              </p>
            </div>
          </div>

          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-5 overflow-y-auto flex-1 space-y-5 pr-1">
          {/* Official Template Banner & Download */}
          <div className="liquid-glass rounded-2xl p-4 border border-white/15 bg-white/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-white/90">
                  Master Dual-Subsheet Template Available
                </h4>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Contains both <strong className="text-white/80">"Cancellation Cases"</strong> & <strong className="text-white/80">"Transfer Cases"</strong> subsheets in one file.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                id="download-master-template-modal-btn"
                onClick={() => downloadUnifiedMasterExcelTemplate()}
                className="liquid-glass rounded-full px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Download Master Excel Workbook with both subsheets"
              >
                <Download className="w-3.5 h-3.5 text-sky-300" />
                <span>Master Template (Dual Tabs)</span>
              </button>

              <button
                id="download-single-template-modal-btn"
                onClick={() => downloadExcelTemplate(formMode)}
                className="glass-pill px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white hover:bg-white/15 border border-white/15 cursor-pointer"
                title={`Download ${formMode} single template`}
              >
                <span>Single {isCancellation ? "Cancel" : "Transfer"}</span>
              </button>
            </div>
          </div>

          {/* Drag and Drop Zone (When no file uploaded or verifying) */}
          {!validationResult && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />

              <div
                id="excel-dropzone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? "border-emerald-400 bg-emerald-500/10 scale-[1.01]"
                    : "border-white/20 hover:border-white/40 hover:bg-white/[0.03] bg-white/[0.01]"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl liquid-glass border border-white/20 flex items-center justify-center mb-1 text-white/80">
                  {isValidating ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                  ) : (
                    <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-white">
                    {isValidating
                      ? "Verifying subsheets against Philips schemas..."
                      : "Drag & drop your Excel workbook here, or browse"}
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    Supports Master Dual-Tab Workbooks (.xlsx) and single-sheet spreadsheets
                  </p>
                </div>
              </div>

              {/* Subsheets Guidance */}
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">
                  Supported Subsheet Layout:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="liquid-glass rounded-xl p-3 border border-white/10 bg-white/[0.02]">
                    <span className="font-semibold text-red-300 flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      Tab 1: Cancellation Cases
                    </span>
                    <p className="text-[11px] text-white/50">
                      Customer Name, Case Number, Work Order Number, Workshop, Branch, Registration Date, Cancellation Reason
                    </p>
                  </div>

                  <div className="liquid-glass rounded-xl p-3 border border-white/10 bg-white/[0.02]">
                    <span className="font-semibold text-sky-300 flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      Tab 2: Transfer Cases
                    </span>
                    <p className="text-[11px] text-white/50">
                      Customer Name, Case Number, Work Order Number, Workshop, Branch, Registration Date, Workshop to Assign, Transfer Reason
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Validation Result Feedback */}
          {validationResult && (
            <AnimatePresence mode="wait">
              {validationResult.success ? (
                /* SUCCESS STATE */
                <motion.div
                  key="success-feedback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="liquid-glass rounded-2xl p-5 border border-emerald-500/30 bg-emerald-500/[0.06] flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-emerald-300">
                        {validationResult.isDualSheet
                          ? "Dual-Subsheet Master Workbook Validated!"
                          : "Single Subsheet Validated Successfully!"}
                      </h4>
                      <p className="text-xs text-white/80 mt-1">
                        File <span className="font-mono text-emerald-200">{validationResult.fileName}</span>. {validationResult.summaryText}
                      </p>
                    </div>
                  </div>

                  {/* Dual Tabs Summary Cards if dual sheet */}
                  {validationResult.isDualSheet && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="liquid-glass rounded-xl p-3 border border-red-500/30 bg-red-500/[0.05]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-red-300">Cancellation Subsheet</span>
                          <span className="font-mono text-white/80 bg-red-500/20 px-2 py-0.5 rounded-full text-[10px]">
                            {validationResult.cancellationRows?.length || 0} Cases
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 truncate">
                          Header columns verified against schema
                        </p>
                      </div>

                      <div className="liquid-glass rounded-xl p-3 border border-sky-500/30 bg-sky-500/[0.05]">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-sky-300">Transfer Subsheet</span>
                          <span className="font-mono text-white/80 bg-sky-500/20 px-2 py-0.5 rounded-full text-[10px]">
                            {validationResult.transferRows?.length || 0} Cases
                          </span>
                        </div>
                        <p className="text-[11px] text-white/60 truncate">
                          Header columns verified against schema
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                /* REJECTION ERROR STATE */
                <motion.div
                  key="rejection-feedback"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="liquid-glass rounded-2xl p-5 border border-red-500/40 bg-red-500/[0.08] flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-300">
                        File Rejected: Invalid Template Format
                      </h4>
                      <p className="text-xs text-white/80 mt-1 leading-relaxed">
                        {validationResult.error}
                      </p>
                    </div>
                  </div>

                  {validationResult.missingColumns &&
                    validationResult.missingColumns.length > 0 && (
                      <div className="liquid-glass rounded-xl p-4 border border-red-500/20 bg-red-500/[0.03]">
                        <span className="text-xs font-semibold text-red-300 block mb-2">
                          Missing Required Columns:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {validationResult.missingColumns.map((col) => (
                            <span
                              key={col}
                              className="px-2.5 py-1 rounded-full text-xs bg-red-500/20 text-red-200 border border-red-500/30"
                            >
                              ✕ {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={handleReset}
                      className="glass-pill px-4 py-2 text-xs font-medium text-white/80 hover:text-white flex items-center gap-1.5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Try Another File</span>
                    </button>

                    <button
                      onClick={() => downloadUnifiedMasterExcelTemplate()}
                      className="liquid-glass rounded-full px-4 py-2 text-xs font-semibold text-white bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Master Template (.xlsx)</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Modal Footer Actions (When Valid) */}
        {validationResult?.success && (
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <button
              onClick={handleReset}
              className="text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              Choose different file
            </button>

            <div className="flex items-center gap-2.5 flex-wrap">
              {validationResult.isDualSheet ? (
                <>
                  <button
                    id="append-both-subsheets-btn"
                    onClick={() => handleApplyBoth("append")}
                    className="liquid-glass rounded-full px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Append Both Subsheets</span>
                  </button>

                  <button
                    id="replace-both-subsheets-btn"
                    onClick={() => handleApplyBoth("replace")}
                    className="liquid-glass rounded-full px-4 py-2 text-xs font-semibold text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Replace Both Matrices</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="append-single-imported-rows-btn"
                    onClick={() => handleApplySingle("append")}
                    className="liquid-glass rounded-full px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Append to {formMode === "cancellation" ? "Cancellation" : "Transfer"} Matrix</span>
                  </button>

                  <button
                    id="replace-single-imported-rows-btn"
                    onClick={() => handleApplySingle("replace")}
                    className="liquid-glass rounded-full px-5 py-2 text-xs font-semibold text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Replace Active Matrix</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
