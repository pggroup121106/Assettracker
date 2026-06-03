import fs from "fs";
import path from "path";
import os from "os";
import type { Employee } from "../src/types/employee.js";

const isServerless = process.env.NETLIFY || process.env.VERCEL || process.env.NODE_ENV === "production";
const CACHE_DIR = isServerless
  ? path.join(os.tmpdir(), "assetqr-data", "cache")
  : path.join(process.cwd(), "data", "cache");
const EMPLOYEES_FILE = path.join(CACHE_DIR, "employees.json");

function ensureFile() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(EMPLOYEES_FILE)) {
    fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export function normalizeEmployeeId(id: string): string {
  return String(id || "").trim().toUpperCase();
}

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function readEmployees(): Employee[] {
  ensureFile();
  try {
    const raw = fs.readFileSync(EMPLOYEES_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Employee[]) : [];
  } catch {
    return [];
  }
}

export function writeEmployees(list: Employee[]) {
  ensureFile();
  fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export function findEmployeeById(list: Employee[], employeeId: string): Employee | undefined {
  const id = normalizeEmployeeId(employeeId);
  if (!id) return undefined;
  return list.find((e) => normalizeEmployeeId(e.employeeId) === id);
}

export function findEmployeeByEmail(list: Employee[], email: string): Employee | undefined {
  const em = normalizeEmail(email);
  if (!em) return undefined;
  return list.find((e) => normalizeEmail(e.email) === em);
}

export function upsertEmployee(employee: Employee): Employee {
  const list = readEmployees();
  const id = normalizeEmployeeId(employee.employeeId);
  if (!id) throw new Error("Employee ID is required");

  const now = new Date().toISOString();
  const normalized: Employee = {
    ...employee,
    employeeId: id,
    email: normalizeEmail(employee.email),
    status: employee.status === "Inactive" ? "Inactive" : "Active",
    updatedAt: now,
    createdAt: employee.createdAt || now,
  };

  const idx = list.findIndex((e) => normalizeEmployeeId(e.employeeId) === id);
  if (idx === -1) list.push(normalized);
  else list[idx] = { ...list[idx], ...normalized, createdAt: list[idx].createdAt || now };

  writeEmployees(list);
  return normalized;
}

export function deleteEmployee(employeeId: string): boolean {
  const id = normalizeEmployeeId(employeeId);
  const list = readEmployees();
  const next = list.filter((e) => normalizeEmployeeId(e.employeeId) !== id);
  if (next.length === list.length) return false;
  writeEmployees(next);
  return true;
}

export async function fetchEmployeesFromGas(
  proxyToGas: (payload: Record<string, unknown>) => Promise<unknown>
): Promise<Employee[]> {
  try {
    const result = (await proxyToGas({ action: "list_employees" })) as {
      employees?: Employee[];
      error?: string;
    };
    if (result?.employees && Array.isArray(result.employees)) {
      writeEmployees(result.employees);
      return result.employees;
    }
  } catch (e) {
    console.warn("fetchEmployeesFromGas:", e);
  }
  return readEmployees();
}

export async function persistEmployeeToGas(
  op: "add" | "update" | "delete",
  employee: Employee,
  proxyToGas: (payload: Record<string, unknown>) => Promise<unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const action = op === "add" ? "add_employee" : op === "update" ? "update_employee" : "delete_employee";
    const result = (await proxyToGas({ action, employee })) as { success?: boolean; error?: string };
    if (result?.error) return { ok: false, error: result.error };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : "GAS failed" };
  }
}
