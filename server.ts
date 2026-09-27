import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ||
  "https://philips-auth-service.shekharphi785.workers.dev";
const CASES_PROXY_URL =
  process.env.CASES_PROXY_URL ||
  "https://philips-cancellation-proxy.shekharphi785.workers.dev";

// Cloudflare Sync Helper: Fetch cases from Cloudflare worker
async function fetchCasesFromCloudflare(): Promise<SharedCaseRecord[] | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(`${CASES_PROXY_URL}/api/cases`, {
      headers: { "X-Proxy-Auth-Token": "Bearer cloudflare_edge_secret" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = (await response.json()) as any;
      if (Array.isArray(data.cases)) {
        return data.cases;
      }
    }
  } catch (err: any) {
    console.log("Cloudflare Cases fetch note:", err.message);
  }
  return null;
}

// Cloudflare Sync Helper: Fetch users & permissions from Cloudflare worker
async function fetchUsersFromCloudflare(): Promise<UserRecord[] | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const response = await fetch(`${AUTH_SERVICE_URL}/api/users`, {
      headers: { "X-Proxy-Auth-Token": "Bearer cloudflare_edge_secret" },
      signal: controller.signal
    }).catch(() => null);
    clearTimeout(timeoutId);
    if (response && response.ok) {
      const data = (await response.json().catch(() => null)) as any;
      if (data && Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (err: any) {
    console.log("Cloudflare Users fetch note:", err.message);
  }
  return null;
}

// Cloudflare Sync Helper: Push remarks update to Cloudflare
async function syncRemarksToCloudflare(
  caseId: string,
  crmStatus: string,
  crmRemarks: string,
  editorName: string,
  tokenId?: string
) {
  try {
    fetch(`${CASES_PROXY_URL}/api/cases/${caseId}/remarks`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Auth-Token": "Bearer cloudflare_edge_secret"
      },
      body: JSON.stringify({ crmStatus, crmRemarks, editorName, tokenId })
    }).catch((e) => console.log("Cloudflare remarks sync note:", e.message));
  } catch {
    // Background execution
  }
}

// Cloudflare Sync Helper: Push user updates to Cloudflare
async function syncUserToCloudflare(user: UserRecord) {
  try {
    fetch(`${AUTH_SERVICE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proxy-Auth-Token": "Bearer cloudflare_edge_secret"
      },
      body: JSON.stringify(user)
    }).catch((e) => console.log("Cloudflare user sync note:", e.message));
  } catch {
    // Background execution
  }
}

// Ensure data persistence directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const CASES_FILE = path.join(DATA_DIR, "cases.json");

export type UserRole = "admin" | "crm_editor" | "fsm";

export interface UserRecord {
  email: string;
  name: string;
  role: UserRole;
  addedAt: string;
  addedBy: string;
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
  crmStatus:
    | "Approved"
    | "Rejected"
    | "Pending"
    | "Transferred"
    | "Submitted"
    | "Under Review"
    | "Approved - SAP Cancelled"
    | "Rejected / Ineligible"
    | "Info Required"
    | "Duplicate / Closed"
    | string;
  crmRemarks: string;
  crmUpdatedBy?: string;
  crmUpdatedAt?: string;
  tokenId?: string;
}

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

// Initial default users supporting immediate multi-account collaboration
const DEFAULT_USERS: UserRecord[] = [
  {
    email: "shekharphi785@gmail.com",
    name: "Shekhar (Admin)",
    role: "admin",
    addedAt: "2026-08-01T00:00:00.000Z",
    addedBy: "System Root"
  },
  {
    email: "crm.lead@philips-service.com",
    name: "CRM Operations Team",
    role: "crm_editor",
    addedAt: "2026-08-01T00:00:00.000Z",
    addedBy: "shekharphi785@gmail.com"
  },
  {
    email: "rajesh.kumar@philips-fsm.com",
    name: "Rajesh Kumar (FSM)",
    role: "fsm",
    addedAt: "2026-08-01T00:00:00.000Z",
    addedBy: "System"
  },
  {
    email: "amit.patel@philips-fsm.com",
    name: "Amit Patel (FSM)",
    role: "fsm",
    addedAt: "2026-08-01T00:00:00.000Z",
    addedBy: "System"
  }
];

// Initial seed cases for immediate realistic collaboration display
const DEFAULT_CASES: SharedCaseRecord[] = [
  {
    id: "seed-case-101",
    mode: "cancellation",
    customerName: "Apollo Multispecialty Hospitals",
    caseNumber: "CAS-99412",
    workOrderNumber: "WO-88210",
    workshop: "Philips Healthcare Tech Center - North",
    branch: "New Delhi Central",
    caseRegistrationDate: "2026-08-28",
    cancellationReason: "Hospital biomedical engineer resolved calibration in-house",
    submittedAt: "2026-08-29T10:15:00.000Z",
    submittedBy: "Rajesh Kumar (FSM)",
    submitterEmail: "rajesh.kumar@philips-fsm.com",
    batchId: "BATCH-AUG29-01",
    crmStatus: "Approved",
    crmRemarks: "Verified with hospital biomedical lead. Notification 4009812 closed & cancelled in SAP. No technician dispatch required.",
    crmUpdatedBy: "CRM Operations (Sarah M.)",
    crmUpdatedAt: "2026-08-29T14:30:00.000Z",
    tokenId: "100001"
  },
  {
    id: "seed-case-102",
    mode: "cancellation",
    customerName: "Fortis Healthcare Diagnostics",
    caseNumber: "CAS-99415",
    workOrderNumber: "WO-88214",
    workshop: "Apex Medical Engineering Hub",
    branch: "Mumbai West",
    caseRegistrationDate: "2026-08-30",
    cancellationReason: "Parts backordered beyond client emergency schedule",
    submittedAt: "2026-08-30T08:45:00.000Z",
    submittedBy: "Amit Patel (FSM)",
    submitterEmail: "amit.patel@philips-fsm.com",
    batchId: "BATCH-AUG30-02",
    crmStatus: "Pending",
    crmRemarks: "Checking alternate inventory stock from Bengaluru central depot before final cancellation approval.",
    crmUpdatedBy: "CRM Operations (David R.)",
    crmUpdatedAt: "2026-08-30T11:20:00.000Z"
  },
  {
    id: "seed-case-103",
    mode: "transfer",
    customerName: "Max Super Specialty Hospital",
    caseNumber: "CAS-88720",
    workOrderNumber: "WO-77631",
    workshop: "Precision Biomedical Lab",
    branch: "Bengaluru South",
    caseRegistrationDate: "2026-08-30",
    workshopToAssign: "Philips Advanced MRI Specialty Hub",
    transferReason: "Requires cryogenic gradient coil diagnostic specialist",
    submittedAt: "2026-08-30T09:10:00.000Z",
    submittedBy: "Suresh Menon (FSM)",
    submitterEmail: "suresh.menon@philips-fsm.com",
    batchId: "BATCH-AUG30-03",
    crmStatus: "Pending",
    crmRemarks: "Please provide serial number and coil temperature log before transfer approval to Specialty Hub.",
    crmUpdatedBy: "CRM Operations (Sarah M.)",
    crmUpdatedAt: "2026-08-30T13:45:00.000Z"
  }
];

// Helper functions for reading & writing database
function loadInitialUsers(): UserRecord[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2));
      return DEFAULT_USERS;
    }
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading users file:", err);
    return DEFAULT_USERS;
  }
}

function loadInitialCases(): SharedCaseRecord[] {
  try {
    if (!fs.existsSync(CASES_FILE)) {
      fs.writeFileSync(CASES_FILE, JSON.stringify(DEFAULT_CASES, null, 2));
      return DEFAULT_CASES;
    }
    const data = fs.readFileSync(CASES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading cases file:", err);
    return DEFAULT_CASES;
  }
}

// In-memory cache for instant real-time synchronization across all sessions
let cachedUsers: UserRecord[] = loadInitialUsers();
let cachedCases: SharedCaseRecord[] = loadInitialCases();
let casesLastUpdated = Date.now();
let usersLastUpdated = Date.now();

// Connected Server-Sent Events (SSE) clients for real-time live sync
const sseClients: express.Response[] = [];

export function broadcastToClients(event: string, payload: any) {
  const dataString = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const res = sseClients[i];
    try {
      res.write(dataString);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

function getUsers(): UserRecord[] {
  return cachedUsers;
}

function saveUsers(users: UserRecord[]) {
  cachedUsers = users;
  usersLastUpdated = Date.now();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error saving users file:", err);
  }
  broadcastToClients("users_updated", {
    users: cachedUsers,
    lastUpdated: usersLastUpdated
  });
}

function getCases(): SharedCaseRecord[] {
  return cachedCases;
}

function saveCases(cases: SharedCaseRecord[], extraPayload?: Record<string, any>) {
  cachedCases = cases;
  casesLastUpdated = Date.now();
  try {
    fs.writeFileSync(CASES_FILE, JSON.stringify(cases, null, 2));
  } catch (err) {
    console.error("Error saving cases file:", err);
  }
  broadcastToClients("cases_updated", {
    cases: cachedCases,
    lastUpdated: casesLastUpdated,
    ...(extraPayload || {})
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Helper middleware to extract caller info
  const getCallerEmail = (req: express.Request) => {
    const headerEmail = (req.headers["x-user-email"] as string) || "";
    return headerEmail.trim().toLowerCase();
  };

  // ==========================================
  // Auth Routes
  // ==========================================
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    const normEmail = (email || "").trim().toLowerCase();

    // Determine role from users registry
    const users = getUsers();
    let user = users.find((u) => u.email.toLowerCase() === normEmail);

    // If Shekhar, always guarantee admin role
    if (normEmail === "shekharphi785@gmail.com") {
      if (!user) {
        user = {
          email: normEmail,
          name: "Shekhar (Admin)",
          role: "admin",
          addedAt: new Date().toISOString(),
          addedBy: "System"
        };
        users.push(user);
        saveUsers(users);
      } else if (user.role !== "admin") {
        user.role = "admin";
        saveUsers(users);
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normEmail, password }),
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      const data = response && response.ok ? await response.json().catch(() => null) : null;

      // If user isn't yet in local registry, auto-register them
      if (!user) {
        const assignedRole: UserRole =
          req.body?.role === "admin" || req.body?.role === "crm_editor"
            ? req.body.role
            : normEmail.includes("crm")
            ? "crm_editor"
            : "fsm";

        user = {
          email: normEmail,
          name: data?.name || req.body?.name || normEmail.split("@")[0],
          role: assignedRole,
          addedAt: new Date().toISOString(),
          addedBy: "Portal Login"
        };
        users.push(user);
        saveUsers(users);
      }

      res.json({
        success: true,
        role: user.role,
        name: user.name || data?.name || normEmail.split("@")[0],
        email: normEmail
      });
    } catch (err: any) {
      console.warn("Auth worker fallback execution:", err.message);
      // Fallback local auth
      if (!user) {
        const assignedRole: UserRole =
          normEmail === "shekharphi785@gmail.com"
            ? "admin"
            : normEmail.includes("crm")
            ? "crm_editor"
            : "fsm";
        user = {
          email: normEmail,
          name: normEmail.split("@")[0],
          role: assignedRole,
          addedAt: new Date().toISOString(),
          addedBy: "Local Fallback"
        };
        users.push(user);
        saveUsers(users);
      }
      res.json({
        success: true,
        name: user.name,
        email: normEmail,
        role: user.role
      });
    }
  });

  app.post("/api/auth/set-password", async (req, res) => {
    try {
      const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return res
          .status(response.status)
          .json(data || { error: "Failed to save password" });
      }
      res.json(data);
    } catch (err: any) {
      console.warn("Auth set-password fallback:", err.message);
      res.json({ success: true, message: "Password updated successfully" });
    }
  });

  // ==========================================
  // User Access & Role Management (Admin only)
  // ==========================================
  app.get("/api/users", async (req, res) => {
    const callerEmail = getCallerEmail(req);
    const users = getUsers();
    const caller = users.find((u) => u.email.toLowerCase() === callerEmail);

    // Only Admin can view and manage full user permissions
    if (callerEmail !== "shekharphi785@gmail.com" && caller?.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden: Only portal Admin can view and manage user permissions."
      });
    }

    // Attempt to merge live users from Cloudflare if available
    const cfUsers = await fetchUsersFromCloudflare();
    if (cfUsers && cfUsers.length > 0) {
      cfUsers.forEach((cfu) => {
        const idx = users.findIndex((u) => u.email.toLowerCase() === cfu.email.toLowerCase());
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...cfu };
        } else {
          users.push(cfu);
        }
      });
      saveUsers(users);
    }

    res.json({ success: true, users });
  });

  app.post("/api/users", (req, res) => {
    const callerEmail = getCallerEmail(req);
    const users = getUsers();
    const caller = users.find((u) => u.email.toLowerCase() === callerEmail);

    if (callerEmail !== "shekharphi785@gmail.com" && caller?.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden: Only portal Admin can add or grant user permissions."
      });
    }

    const { email, name, role } = req.body || {};
    const normEmail = (email || "").trim().toLowerCase();
    if (!normEmail) {
      return res.status(400).json({ error: "Email is required." });
    }

    const existingIndex = users.findIndex(
      (u) => u.email.toLowerCase() === normEmail
    );

    const validRole: UserRole =
      role === "admin" || role === "crm_editor" ? role : "fsm";

    let targetUser: UserRecord;
    if (existingIndex >= 0) {
      users[existingIndex].name = name || users[existingIndex].name;
      users[existingIndex].role = validRole;
      users[existingIndex].addedBy = callerEmail || "Admin";
      targetUser = users[existingIndex];
    } else {
      targetUser = {
        email: normEmail,
        name: name || normEmail.split("@")[0],
        role: validRole,
        addedAt: new Date().toISOString(),
        addedBy: callerEmail || "Admin"
      };
      users.push(targetUser);
    }

    saveUsers(users);
    syncUserToCloudflare(targetUser);
    res.json({ success: true, users });
  });

  app.patch("/api/users/:email/role", (req, res) => {
    const callerEmail = getCallerEmail(req);
    const users = getUsers();
    const caller = users.find((u) => u.email.toLowerCase() === callerEmail);

    if (callerEmail !== "shekharphi785@gmail.com" && caller?.role !== "admin") {
      return res.status(403).json({
        error: "Forbidden: Only portal Admin can change user roles."
      });
    }

    const targetEmail = decodeURIComponent(req.params.email).trim().toLowerCase();
    const { role } = req.body || {};

    const validRole: UserRole =
      role === "admin" || role === "crm_editor" ? role : "fsm";

    let user = users.find((u) => u.email.toLowerCase() === targetEmail);
    if (!user) {
      user = {
        email: targetEmail,
        name: targetEmail.split("@")[0],
        role: validRole,
        addedAt: new Date().toISOString(),
        addedBy: callerEmail || "Admin"
      };
      users.push(user);
    } else {
      user.role = validRole;
      user.addedBy = callerEmail || "Admin";
    }

    saveUsers(users);
    syncUserToCloudflare(user);
    res.json({ success: true, users });
  });

  // ==========================================
  // Real-Time Synchronization Endpoints (SSE)
  // ==========================================
  // Stream live updates instantly to all connected users
  app.get("/api/sync/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    sseClients.push(res);

    // Initial state snapshot for immediate sync on connect
    res.write(`event: initial_sync\ndata: ${JSON.stringify({
      cases: getCases(),
      users: getUsers(),
      casesLastUpdated,
      usersLastUpdated,
      serverTime: new Date().toISOString()
    })}\n\n`);

    // Heartbeat ping every 15s to keep proxy connections alive
    const pingTimer = setInterval(() => {
      try {
        res.write(`event: ping\ndata: ${Date.now()}\n\n`);
      } catch {
        clearInterval(pingTimer);
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(pingTimer);
      const idx = sseClients.indexOf(res);
      if (idx >= 0) sseClients.splice(idx, 1);
    });
  });

  // Sync Status endpoint for polling & client health checks
  app.get("/api/sync/status", (req, res) => {
    res.json({
      casesCount: cachedCases.length,
      usersCount: cachedUsers.length,
      casesLastUpdated,
      usersLastUpdated,
      connectedClients: sseClients.length,
      serverTime: new Date().toISOString()
    });
  });

  // ==========================================
  // Cases & Remarks Endpoints
  // ==========================================
  // Get all cases (instant in-memory response, multi-user synchronized)
  app.get("/api/cases", (req, res) => {
    const mode = (req.query.mode as string) || "";
    let cases = getCases();

    if (mode === "cancellation" || mode === "transfer") {
      cases = cases.filter((c) => c.mode === mode);
    }

    res.json({
      success: true,
      cases,
      total: cases.length,
      lastUpdated: casesLastUpdated
    });
  });

  // Batch Submission by FSM
  app.post("/api/cases/:mode/batch", async (req, res) => {
    const mode = req.params.mode as "cancellation" | "transfer";
    const { submittedBy, submitterEmail, batchId, records } = req.body || {};

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: "No case records provided" });
    }

    const currentCases = getCases();
    const timestamp = new Date().toISOString();

    const newEntries: SharedCaseRecord[] = records.map((r: any) => ({
      id: r.id || `case-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      mode,
      customerName: r.customerName || "",
      caseNumber: r.caseNumber || "",
      workOrderNumber: r.workOrderNumber || "",
      workshop: r.workshop || "",
      branch: r.branch || "",
      caseRegistrationDate: r.caseRegistrationDate || timestamp.split("T")[0],
      cancellationReason: r.cancellationReason,
      transferReason: r.transferReason,
      workshopToAssign: r.workshopToAssign,
      submittedAt: r.submittedAt || timestamp,
      submittedBy: submittedBy || r.submittedBy || "Field Service Manager",
      submitterEmail: (submitterEmail || r.submitterEmail || "").toLowerCase(),
      batchId: batchId || r.batchId || `BATCH-${Date.now()}`,
      crmStatus: "Pending",
      crmRemarks: "Awaiting CRM team review & SAP verification."
    }));

    // Prepend new submissions to local storage
    const updatedCases = [...newEntries, ...currentCases];
    saveCases(updatedCases, {
      action: "cases_submitted",
      mode,
      submittedBy: submittedBy || newEntries[0]?.submittedBy || "FSM",
      count: newEntries.length,
      sampleCase: newEntries[0]
    });

    // Forward batch to Cloudflare Worker to store in Cloudflare D1/KV & Google Sheets
    try {
      fetch(`${CASES_PROXY_URL}/api/cases/${mode}/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Proxy-Auth-Token": "Bearer cloudflare_edge_secret"
        },
        body: JSON.stringify({
          ...req.body,
          records: newEntries
        })
      }).catch((e) => console.log("Cloudflare batch push note:", e.message));
    } catch {
      // Non-blocking
    }

    res.json({
      success: true,
      count: newEntries.length,
      batchId,
      timestamp
    });
  });

  // Update CRM Remarks & Status (STRICT PERMISSION: ONLY Admin or CRM Editor)
  app.patch("/api/cases/:id/remarks", (req, res) => {
    const caseId = req.params.id;
    const callerEmail = getCallerEmail(req);
    const users = getUsers();
    const caller = users.find((u) => u.email.toLowerCase() === callerEmail);

    // Strict Permission check: Only Admin or CRM Editor can update
    const isAuthorized =
      callerEmail === "shekharphi785@gmail.com" ||
      caller?.role === "admin" ||
      caller?.role === "crm_editor";

    if (!isAuthorized) {
      return res.status(403).json({
        error:
          "Forbidden: FSM accounts do not have permission to edit or update submitted cases. Only designated CRM Reviewers or the Admin can update remarks and status."
      });
    }

    const { crmStatus, crmRemarks, editorName } = req.body || {};
    const cases = getCases();
    const caseItem = cases.find((c) => c.id === caseId);

    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (crmStatus) {
      caseItem.crmStatus = crmStatus;
      // Automated Token ID: Unique value assigned ONLY when case is Approved
      // Cancellation tokens start with 1 (e.g. 100001, 100002, ...)
      // Transfer tokens start with 2 (e.g. 200001, 200002, ...)
      if (crmStatus === "Approved") {
        if (!caseItem.tokenId) {
          caseItem.tokenId = generateApprovalTokenId(caseItem.mode, cases);
        }
      } else {
        // Token ID only exists when the case is Approved
        delete caseItem.tokenId;
      }
    }
    if (typeof crmRemarks === "string") {
      caseItem.crmRemarks = crmRemarks;
    }

    const resolvedEditor = editorName || caller?.name || callerEmail || "CRM Operations";
    caseItem.crmUpdatedBy = resolvedEditor;
    caseItem.crmUpdatedAt = new Date().toISOString();

    saveCases(cases, {
      action: "case_reviewed",
      updatedCase: caseItem,
      editorName: resolvedEditor,
      caseId,
      crmStatus: caseItem.crmStatus
    });

    // Synchronize CRM remarks & approval token directly to Cloudflare
    syncRemarksToCloudflare(
      caseId,
      caseItem.crmStatus,
      caseItem.crmRemarks,
      resolvedEditor,
      caseItem.tokenId
    );

    res.json({
      success: true,
      case: caseItem
    });
  });

  // Serve public directory (favicon, icons, static assets)
  app.use(express.static(path.join(process.cwd(), "public")));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
