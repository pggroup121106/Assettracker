import fs from "fs";
import path from "path";
import os from "os";
import type { AssignmentHistoryEntry } from "../src/types/employee.js";
import { normalizeEmployeeId } from "./employeesStore.js";
import { normalizeAssetId } from "./assetDetailsStore.js";

const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === "production";
const CACHE_DIR = isServerless
  ? path.join(os.tmpdir(), "assetqr-data", "cache")
  : path.join(process.cwd(), "data", "cache");
const HISTORY_FILE = path.join(CACHE_DIR, "assignment-history.json");

function ensureFile() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function readAssignmentHistory(): AssignmentHistoryEntry[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AssignmentHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeAssignmentHistory(entries: AssignmentHistoryEntry[]) {
  ensureFile();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

function newHistoryId() {
  return `AH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendAssignmentEntry(entry: Omit<AssignmentHistoryEntry, "id">): AssignmentHistoryEntry {
  const list = readAssignmentHistory();
  const full: AssignmentHistoryEntry = { ...entry, id: newHistoryId() };
  list.push(full);
  writeAssignmentHistory(list);
  return full;
}

export function getHistoryByAssetId(assetId: string): AssignmentHistoryEntry[] {
  const aid = normalizeAssetId(assetId);
  return readAssignmentHistory()
    .filter((h) => normalizeAssetId(h.assetId) === aid)
    .sort((a, b) => String(b.assignedDate).localeCompare(String(a.assignedDate)));
}

export function getHistoryByEmployeeId(employeeId: string): AssignmentHistoryEntry[] {
  const eid = normalizeEmployeeId(employeeId);
  return readAssignmentHistory()
    .filter(
      (h) =>
        normalizeEmployeeId(h.employeeId) === eid ||
        normalizeEmployeeId(h.fromEmployeeId || "") === eid
    )
    .sort((a, b) => String(b.assignedDate).localeCompare(String(a.assignedDate)));
}

export interface AssigneeSnapshot {
  employeeId?: string;
  contactName?: string;
  contactEmail?: string;
  status?: string;
}

function hasAssignee(s: AssigneeSnapshot): boolean {
  return !!(s.employeeId?.trim() || s.contactName?.trim() || s.contactEmail?.trim());
}

function assigneeKey(s: AssigneeSnapshot): string {
  return [
    normalizeEmployeeId(s.employeeId || ""),
    String(s.contactEmail || "").trim().toLowerCase(),
    String(s.contactName || "").trim().toLowerCase(),
  ].join("|");
}

export function recordAssignmentChange(opts: {
  assetId: string;
  previous: AssigneeSnapshot;
  next: AssigneeSnapshot;
  assignedBy?: string;
  remarks?: string;
}): AssignmentHistoryEntry[] {
  const { assetId, previous, next, assignedBy, remarks } = opts;
  const created: AssignmentHistoryEntry[] = [];
  const now = new Date().toISOString().slice(0, 10);
  const prevKey = assigneeKey(previous);
  const nextKey = assigneeKey(next);

  if (prevKey === nextKey) return created;

  if (hasAssignee(previous) && hasAssignee(next) && prevKey !== nextKey) {
    created.push(
      appendAssignmentEntry({
        assetId,
        action: "Transfer",
        employeeId: next.employeeId || "",
        employeeName: next.contactName || next.contactEmail || "Unknown",
        assignedDate: now,
        assignedBy,
        remarks: remarks || `From ${previous.contactName || previous.employeeId || "previous assignee"}`,
        fromEmployeeId: previous.employeeId,
        fromEmployeeName: previous.contactName,
      })
    );
    return created;
  }

  if (hasAssignee(previous) && !hasAssignee(next)) {
    created.push(
      appendAssignmentEntry({
        assetId,
        action: "Return",
        employeeId: previous.employeeId || "",
        employeeName: previous.contactName || previous.contactEmail || "Unknown",
        assignedDate: now,
        returnedDate: now,
        assignedBy,
        remarks: remarks || "Asset returned / unassigned",
      })
    );
    return created;
  }

  if (!hasAssignee(previous) && hasAssignee(next)) {
    created.push(
      appendAssignmentEntry({
        assetId,
        action: "Assign",
        employeeId: next.employeeId || "",
        employeeName: next.contactName || next.contactEmail || "Unknown",
        assignedDate: now,
        assignedBy,
        remarks,
      })
    );
  }

  return created;
}

export async function fetchHistoryFromGas(
  proxyToGas: (payload: Record<string, unknown>) => Promise<unknown>
): Promise<AssignmentHistoryEntry[]> {
  try {
    const result = (await proxyToGas({ action: "get_assignment_history" })) as {
      history?: AssignmentHistoryEntry[];
      error?: string;
    };
    if (result?.history && Array.isArray(result.history)) {
      writeAssignmentHistory(result.history);
      return result.history;
    }
  } catch (e) {
    console.warn("fetchHistoryFromGas:", e);
  }
  return readAssignmentHistory();
}

export async function persistHistoryEntryToGas(
  entry: AssignmentHistoryEntry,
  proxyToGas: (payload: Record<string, unknown>) => Promise<unknown>
) {
  try {
    await proxyToGas({ action: "add_assignment_history", entry });
  } catch (e) {
    console.warn("persistHistoryEntryToGas:", e);
  }
}

export async function syncHistoryEntriesToGas(
  entries: AssignmentHistoryEntry[],
  proxyToGas: (payload: Record<string, unknown>) => Promise<unknown>
) {
  for (const entry of entries) {
    await persistHistoryEntryToGas(entry, proxyToGas);
  }
}
