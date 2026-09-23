import * as XLSX from "xlsx";

export interface CancellationRow {
  id: string;
  customerName: string;
  caseNumber: string;
  workOrderNumber: string;
  workshop: string;
  branch: string;
  caseRegistrationDate: string;
  cancellationReason: string;
}

export interface TransferRow {
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

export interface MultiSheetValidationResult {
  success: boolean;
  fileName?: string;
  error?: string;
  isDualSheet?: boolean;
  detectedSheets?: string[];
  cancellationRows?: CancellationRow[];
  transferRows?: TransferRow[];
  activeModeRows?: any[];
  missingColumns?: string[];
  detectedMode?: "cancellation" | "transfer" | "both";
  summaryText?: string;
}

export const CANCELLATION_COLUMNS = [
  "Customer Name",
  "Case Number",
  "Work Order Number",
  "Workshop",
  "Branch",
  "Case Registration Date",
  "Cancellation Reason"
] as const;

export const TRANSFER_COLUMNS = [
  "Customer Name",
  "Case Number",
  "Work Order Number",
  "Workshop",
  "Branch",
  "Case Registration Date",
  "Workshop to Assign",
  "Transfer Reason"
] as const;

export const SAMPLE_CANCELLATION_DATA = [
  {
    "Customer Name": "Elena Vance",
    "Case Number": "CAS-99214",
    "Work Order Number": "WO-77821",
    "Workshop": "Apex Auto Hub - Main",
    "Branch": "North Austin",
    "Case Registration Date": "2026-08-14",
    "Cancellation Reason": "Customer requested trade-in valuation instead"
  },
  {
    "Customer Name": "Marcus Sterling",
    "Case Number": "CAS-99218",
    "Work Order Number": "WO-77840",
    "Workshop": "Metro Central Garage",
    "Branch": "Downtown Core",
    "Case Registration Date": "2026-08-20",
    "Cancellation Reason": "Parts backordered beyond client schedule"
  },
  {
    "Customer Name": "Ananya Sharma",
    "Case Number": "CAS-99230",
    "Work Order Number": "WO-77865",
    "Workshop": "Westfield Fleet Center",
    "Branch": "East Bay Hub",
    "Case Registration Date": "2026-08-28",
    "Cancellation Reason": "Customer settled claim directly with insurer"
  }
];

export const SAMPLE_TRANSFER_DATA = [
  {
    "Customer Name": "Sophia Lin",
    "Case Number": "CAS-88102",
    "Work Order Number": "WO-66512",
    "Workshop": "Northside Precision Bodyworks",
    "Branch": "West Bellevue",
    "Case Registration Date": "2026-08-18",
    "Workshop to Assign": "Westfield Fleet Center",
    "Transfer Reason": "Specialized hydraulic calibration equipment required"
  },
  {
    "Customer Name": "David K. Ross",
    "Case Number": "CAS-88155",
    "Work Order Number": "WO-66598",
    "Workshop": "East River Mobility Hub",
    "Branch": "Queens District",
    "Case Registration Date": "2026-08-25",
    "Workshop to Assign": "Apex Auto Hub - Main",
    "Transfer Reason": "Customer relocated residence closer to Apex hub"
  },
  {
    "Customer Name": "Rajesh Nair",
    "Case Number": "CAS-88172",
    "Work Order Number": "WO-66630",
    "Workshop": "South Bay Service Facility",
    "Branch": "San Jose Centre",
    "Case Registration Date": "2026-08-29",
    "Workshop to Assign": "Northside Precision Bodyworks",
    "Transfer Reason": "Heavy chassis structural realignment required"
  }
];

function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Generates and triggers download of official Dual-Subsheet Master Excel workbook (.xlsx)
 * Contains both "Cancellation Cases" and "Transfer Cases" subsheets in one workbook!
 */
export function downloadUnifiedMasterExcelTemplate() {
  const wb = XLSX.utils.book_new();

  // 1. Cancellation Sheet
  const wsCancel = XLSX.utils.json_to_sheet(SAMPLE_CANCELLATION_DATA);
  wsCancel["!cols"] = [
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Case Number
    { wch: 18 }, // Work Order Number
    { wch: 28 }, // Workshop
    { wch: 18 }, // Branch
    { wch: 22 }, // Case Registration Date
    { wch: 45 }  // Cancellation Reason
  ];
  XLSX.utils.book_append_sheet(wb, wsCancel, "Cancellation Cases");

  // 2. Transfer Sheet
  const wsTransfer = XLSX.utils.json_to_sheet(SAMPLE_TRANSFER_DATA);
  wsTransfer["!cols"] = [
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Case Number
    { wch: 18 }, // Work Order Number
    { wch: 28 }, // Workshop
    { wch: 18 }, // Branch
    { wch: 22 }, // Case Registration Date
    { wch: 28 }, // Workshop to Assign
    { wch: 45 }  // Transfer Reason
  ];
  XLSX.utils.book_append_sheet(wb, wsTransfer, "Transfer Cases");

  XLSX.writeFile(wb, "Philips_Master_Cases_Template.xlsx");
}

/**
 * Generates and triggers download of official single-mode Excel template (.xlsx)
 */
export function downloadExcelTemplate(mode: "cancellation" | "transfer" | "master") {
  if (mode === "master") {
    downloadUnifiedMasterExcelTemplate();
    return;
  }

  const isCancellation = mode === "cancellation";
  const data = isCancellation ? SAMPLE_CANCELLATION_DATA : SAMPLE_TRANSFER_DATA;
  const fileName = isCancellation
    ? "Philips_Cancellation_Cases_Template.xlsx"
    : "Philips_Transfer_Cases_Template.xlsx";
  const sheetName = isCancellation ? "Cancellation Cases" : "Transfer Cases";

  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = isCancellation
    ? [
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
        { wch: 45 }
      ]
    : [
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
        { wch: 28 },
        { wch: 18 },
        { wch: 22 },
        { wch: 28 },
        { wch: 45 }
      ];

  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  XLSX.writeFile(wb, fileName);
}

/**
 * Exports uploaded/submitted cases archive to Excel (.xlsx)
 */
export function exportUploadedCasesToExcel(
  records: any[],
  mode: "cancellation" | "transfer"
) {
  if (!records || records.length === 0) return;

  const isCancellation = mode === "cancellation";
  const mapped = records.map((r) => {
    if (isCancellation) {
      return {
        "Customer Name": r.customerName || "",
        "Case Number": r.caseNumber || "",
        "Work Order Number": r.workOrderNumber || "",
        "Workshop": r.workshop || "",
        "Branch": r.branch || "",
        "Case Registration Date": r.caseRegistrationDate || "",
        "Cancellation Reason": r.cancellationReason || "",
        "Submitted At": r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
        "Submitted By": r.submittedBy || "",
        "CRM Status": r.crmStatus || r.status || "Pending",
        "Token ID": r.tokenId || "—",
        "CRM Remarks": r.crmRemarks || "Awaiting CRM team review",
        "CRM Updated By": r.crmUpdatedBy || "-",
        "CRM Updated At": r.crmUpdatedAt ? new Date(r.crmUpdatedAt).toLocaleString() : "-"
      };
    } else {
      return {
        "Customer Name": r.customerName || "",
        "Case Number": r.caseNumber || "",
        "Work Order Number": r.workOrderNumber || "",
        "Workshop": r.workshop || "",
        "Branch": r.branch || "",
        "Case Registration Date": r.caseRegistrationDate || "",
        "Workshop to Assign": r.workshopToAssign || "",
        "Transfer Reason": r.transferReason || "",
        "Submitted At": r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "",
        "Submitted By": r.submittedBy || "",
        "CRM Status": r.crmStatus || r.status || "Pending",
        "Token ID": r.tokenId || "—",
        "CRM Remarks": r.crmRemarks || "Awaiting CRM team review",
        "CRM Updated By": r.crmUpdatedBy || "-",
        "CRM Updated At": r.crmUpdatedAt ? new Date(r.crmUpdatedAt).toLocaleString() : "-"
      };
    }
  });

  const ws = XLSX.utils.json_to_sheet(mapped);
  const wb = XLSX.utils.book_new();
  const sheetName = isCancellation ? "Uploaded Cancellations" : "Uploaded Transfers";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const fileName = `Philips_Uploaded_${isCancellation ? "Cancellation" : "Transfer"}_Cases_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Helper to parse a single worksheet into typed cancellation or transfer rows
 */
function parseSheet(
  worksheet: XLSX.WorkSheet,
  expectedMode: "cancellation" | "transfer"
): { rows: any[]; error?: string; missingCols?: string[] } {
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false
  }) as (string | number)[][];

  if (!rawRows || rawRows.length < 2) {
    return { rows: [], error: "No data rows found beneath headers." };
  }

  let headerRowIndex = 0;
  while (
    headerRowIndex < rawRows.length &&
    (!rawRows[headerRowIndex] ||
      rawRows[headerRowIndex].length === 0 ||
      !rawRows[headerRowIndex].some((c) => String(c).trim() !== ""))
  ) {
    headerRowIndex++;
  }

  if (headerRowIndex >= rawRows.length) {
    return { rows: [], error: "No valid header row found." };
  }

  const fileHeaders = (rawRows[headerRowIndex] || []).map((h) => String(h || "").trim());
  const normalizedFileHeaders = fileHeaders.map(normalizeHeader);

  const requiredColumns = expectedMode === "cancellation" ? CANCELLATION_COLUMNS : TRANSFER_COLUMNS;
  const missingColumns: string[] = [];
  const headerIndexMap: Record<string, number> = {};

  for (const reqCol of requiredColumns) {
    const normReq = normalizeHeader(reqCol);
    const idx = normalizedFileHeaders.findIndex((h) => h === normReq);
    if (idx === -1) {
      missingColumns.push(reqCol);
    } else {
      headerIndexMap[reqCol] = idx;
    }
  }

  if (missingColumns.length > 0) {
    return { rows: [], missingCols: missingColumns };
  }

  const parsedRows: any[] = [];
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const rowData = rawRows[r];
    if (!rowData || !rowData.some((cell) => String(cell || "").trim() !== "")) {
      continue;
    }

    const customerName = String(rowData[headerIndexMap["Customer Name"]] || "").trim();
    const caseNumber = String(rowData[headerIndexMap["Case Number"]] || "").trim();
    const workOrderNumber = String(rowData[headerIndexMap["Work Order Number"]] || "").trim();
    const workshop = String(rowData[headerIndexMap["Workshop"]] || "").trim();
    const branch = String(rowData[headerIndexMap["Branch"]] || "").trim();
    let caseRegistrationDate = String(rowData[headerIndexMap["Case Registration Date"]] || "").trim();

    if (caseRegistrationDate) {
      const parsedDate = new Date(caseRegistrationDate);
      if (!isNaN(parsedDate.getTime())) {
        caseRegistrationDate = parsedDate.toISOString().split("T")[0];
      }
    }
    if (!caseRegistrationDate) {
      caseRegistrationDate = new Date().toISOString().split("T")[0];
    }

    if (expectedMode === "cancellation") {
      const cancellationReason = String(rowData[headerIndexMap["Cancellation Reason"]] || "").trim();
      if (!customerName && !caseNumber && !workOrderNumber) continue;
      parsedRows.push({
        id: `imported-can-${Date.now()}-${r}`,
        customerName: customerName || "",
        caseNumber: caseNumber || "",
        workOrderNumber: workOrderNumber || "",
        workshop: workshop || "",
        branch: branch || "",
        caseRegistrationDate,
        cancellationReason: cancellationReason || ""
      });
    } else {
      const workshopToAssign = String(rowData[headerIndexMap["Workshop to Assign"]] || "").trim();
      const transferReason = String(rowData[headerIndexMap["Transfer Reason"]] || "").trim();
      if (!customerName && !caseNumber && !workOrderNumber) continue;
      parsedRows.push({
        id: `imported-tra-${Date.now()}-${r}`,
        customerName: customerName || "",
        caseNumber: caseNumber || "",
        workOrderNumber: workOrderNumber || "",
        workshop: workshop || "",
        branch: branch || "",
        caseRegistrationDate,
        workshopToAssign: workshopToAssign || "",
        transferReason: transferReason || ""
      });
    }
  }

  return { rows: parsedRows };
}

/**
 * Validates and parses uploaded Excel / CSV files against strict schema.
 * Automatically checks for dual subsheets ('Cancellation Cases' & 'Transfer Cases')
 * or single active sheet.
 */
export async function parseAndValidateExcelFile(
  file: File,
  activeFormMode: "cancellation" | "transfer"
): Promise<MultiSheetValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({
        success: false,
        fileName: file.name,
        error: "Failed to read the file. Please ensure it is a valid .xlsx, .xls, or .csv document."
      });
    };

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return resolve({
            success: false,
            fileName: file.name,
            error: "The uploaded workbook has no readable sheets."
          });
        }

        const sheetNames = workbook.SheetNames;

        // Try detecting dual subsheets by name
        let cancelSheetName = sheetNames.find((s) => /cancel/i.test(s));
        let transferSheetName = sheetNames.find((s) => /transfer/i.test(s));

        // If sheet names are generic (e.g. Sheet1, Sheet2), test their columns
        if (!cancelSheetName || !transferSheetName) {
          for (const sName of sheetNames) {
            const ws = workbook.Sheets[sName];
            const checkCancel = parseSheet(ws, "cancellation");
            if (!cancelSheetName && checkCancel.rows.length > 0 && !checkCancel.missingCols) {
              cancelSheetName = sName;
            }
            const checkTransfer = parseSheet(ws, "transfer");
            if (!transferSheetName && checkTransfer.rows.length > 0 && !checkTransfer.missingCols) {
              transferSheetName = sName;
            }
          }
        }

        const hasBothSubsheets = Boolean(
          cancelSheetName &&
          transferSheetName &&
          cancelSheetName !== transferSheetName
        );

        // CASE 1: DUAL SUBSHEETS FOUND
        if (hasBothSubsheets && cancelSheetName && transferSheetName) {
          const cancelParsed = parseSheet(workbook.Sheets[cancelSheetName], "cancellation");
          const transferParsed = parseSheet(workbook.Sheets[transferSheetName], "transfer");

          if (cancelParsed.missingCols && cancelParsed.missingCols.length > 0) {
            return resolve({
              success: false,
              fileName: file.name,
              error: `Format Rejection in '${cancelSheetName}' subsheet: Missing column(s): ${cancelParsed.missingCols.join(", ")}`,
              missingColumns: cancelParsed.missingCols
            });
          }

          if (transferParsed.missingCols && transferParsed.missingCols.length > 0) {
            return resolve({
              success: false,
              fileName: file.name,
              error: `Format Rejection in '${transferSheetName}' subsheet: Missing column(s): ${transferParsed.missingCols.join(", ")}`,
              missingColumns: transferParsed.missingCols
            });
          }

          return resolve({
            success: true,
            fileName: file.name,
            isDualSheet: true,
            detectedSheets: [cancelSheetName, transferSheetName],
            cancellationRows: cancelParsed.rows,
            transferRows: transferParsed.rows,
            activeModeRows: activeFormMode === "cancellation" ? cancelParsed.rows : transferParsed.rows,
            detectedMode: "both",
            summaryText: `Found 2 subsheets: "${cancelSheetName}" (${cancelParsed.rows.length} rows) & "${transferSheetName}" (${transferParsed.rows.length} rows).`
          });
        }

        // CASE 2: SINGLE SHEET WORKBOOK OR ACTIVE MODE PARSE
        const targetSheetName =
          activeFormMode === "cancellation"
            ? cancelSheetName || sheetNames[0]
            : transferSheetName || sheetNames[0];

        const targetWorksheet = workbook.Sheets[targetSheetName];
        const parsed = parseSheet(targetWorksheet, activeFormMode);

        if (parsed.missingCols && parsed.missingCols.length > 0) {
          // Check if opposite template was uploaded
          const oppositeMode = activeFormMode === "cancellation" ? "transfer" : "cancellation";
          const oppositeParsed = parseSheet(targetWorksheet, oppositeMode);

          if (!oppositeParsed.missingCols) {
            return resolve({
              success: false,
              fileName: file.name,
              error: `Format Rejection: You uploaded a ${oppositeMode === "cancellation" ? "Cancellation" : "Transfer"} Cases sheet while in ${activeFormMode === "cancellation" ? "Cancellation" : "Transfer"} mode. You can switch tabs or use the Master template with both subsheets.`
            });
          }

          return resolve({
            success: false,
            fileName: file.name,
            missingColumns: parsed.missingCols,
            error: `Format Rejection: Subsheet '${targetSheetName}' does not match official schema. Missing column(s): ${parsed.missingCols.map((c) => `"${c}"`).join(", ")}.`
          });
        }

        if (parsed.rows.length === 0) {
          return resolve({
            success: false,
            fileName: file.name,
            error: `Format Rejection: No valid case rows found in '${targetSheetName}'.`
          });
        }

        resolve({
          success: true,
          fileName: file.name,
          isDualSheet: false,
          detectedSheets: [targetSheetName],
          activeModeRows: parsed.rows,
          cancellationRows: activeFormMode === "cancellation" ? parsed.rows : [],
          transferRows: activeFormMode === "transfer" ? parsed.rows : [],
          detectedMode: activeFormMode,
          summaryText: `Parsed ${parsed.rows.length} case records from subsheet "${targetSheetName}".`
        });
      } catch (err: any) {
        resolve({
          success: false,
          fileName: file.name,
          error: `Error reading Excel file: ${err?.message || "Invalid file format"}`
        });
      }
    };

    reader.readAsArrayBuffer(file);
  });
}
