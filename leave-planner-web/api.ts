import axios from "axios";
import type { User, Leave, Customer, Project, ProjectAssignment } from "./types";
import { Role, LeaveStatus } from "./types";

/** Base URL from .env (Vite) */
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:5268";

/** Axios client */
export const api = axios.create({ baseURL: API_BASE });

/** Keep current user id for X-Employee-Id header */
let currentUserId: string | null = localStorage.getItem("currentUserId") || null;

api.interceptors.request.use((config) => {
  if (currentUserId) {
    (config.headers as any) = {
      ...(config.headers as Record<string, any>),
      "X-Employee-Id": currentUserId,
    };
  }
  return config;
});

export function setCurrentUser(id: string | null) {
  currentUserId = id;
  if (id) localStorage.setItem("currentUserId", id);
  else localStorage.removeItem("currentUserId");
}

/* ---------- mappers ---------- */

// Backend-Enum: 0=Employee, 1=Approver, 2=Admin (numerisch)
function mapRole(n?: number): Role {
  if (n === 2) return Role.Admin;
  if (n === 1) return Role.Approver;
  return Role.Employee;
}

// Backend-Enum: 0=Request, 1=Approved, 2=Rejected, (optional 3=Cancelled)
function mapStatus(n: number): LeaveStatus {
  if (n === 1) return LeaveStatus.Approved;
  if (n === 2) return LeaveStatus.Rejected;
  return LeaveStatus.Requested;
}

/* ---------- conflict hint types (API-Rückgabe) ---------- */
export type ConflictEmployee = { employeeId: string; employeeName: string };
export type ConflictHint = { projectId: string; projectName: string; employees: ConflictEmployee[] };
export type LeaveWithConflicts = { leave: Leave; conflictHints: ConflictHint[] };

/* ---------- API calls ---------- */

// Employees
export async function listEmployees(): Promise<User[]> {
  const res = await api.get<Array<{ id: string; name: string; jobTitle?: string | null; role?: number }>>(
    "/api/employees"
  );
  return res.data.map((e) => ({
    id: e.id,
    name: e.name,
    jobTitle: e.jobTitle ?? null,
    role: mapRole(e.role),
  }));
}

export async function getEmployee(id: string): Promise<User> {
  const res = await api.get<{ id: string; name: string; jobTitle?: string | null; role?: number }>(
    `/api/employees/${id}`
  );
  const e = res.data;
  return { id: e.id, name: e.name, jobTitle: e.jobTitle ?? null, role: mapRole(e.role) };
}

// Customers
export async function listCustomers(): Promise<Customer[]> {
  const res = await api.get<Array<{ id: string; name: string }>>("/api/customers");
  return res.data.map((c) => ({ id: c.id, name: c.name }));
}

// Projects
export async function listProjects(): Promise<Project[]> {
  // Backend kann { customerId } direkt liefern; optional zusätzlich { customer: { id, name } }
  const res = await api.get<
    Array<{
      id: string;
      name: string;
      customerId?: string;
      customer?: { id: string; name: string } | null;
      startDate: string;
      endDate?: string | null;
    }>
  >("/api/projects");

  return res.data.map((p) => ({
    id: p.id,
    name: p.name,
    customerId: p.customerId ?? p.customer?.id ?? "",
    startDate: p.startDate,
    endDate: p.endDate ?? null,
  }));
}

export async function getProject(id: string): Promise<Project> {
  const res = await api.get<{ id: string; name: string; customerId: string; startDate: string; endDate?: string | null }>(
    `/api/projects/${id}`
  );
  const p = res.data;
  return { id: p.id, name: p.name, customerId: p.customerId, startDate: p.startDate, endDate: p.endDate ?? null };
}

export async function listAssignments(projectId: string): Promise<ProjectAssignment[]> {
  const res = await api.get<Array<{ employeeId: string; employeeName: string }>>(
    `/api/projects/${projectId}/assignments`
  );
  return res.data.map((a) => ({ projectId, employeeId: a.employeeId }));
}

// Leaves
export async function listLeaves(params: { employeeId?: string; date?: string } = {}): Promise<Leave[]> {
  const res = await api.get<Array<{ id: string; employeeId: string; date: string; status: number }>>(
    "/api/leaves",
    { params }
  );
  return res.data.map((l) => ({
    id: l.id,
    employeeId: l.employeeId,
    date: l.date,
    status: mapStatus(l.status),
  }));
}

export async function createLeave(employeeId: string, date: string): Promise<LeaveWithConflicts> {
  const res = await api.post<{
    leave: { id: string; employeeId: string; date: string; status: number };
    conflictHints: ConflictHint[];
  }>("/api/leaves", { employeeId, date });

  const l = res.data.leave;
  return {
    leave: { id: l.id, employeeId: l.employeeId, date: l.date, status: mapStatus(l.status) },
    conflictHints: res.data.conflictHints,
  };
}

export async function approveLeave(id: string): Promise<LeaveWithConflicts> {
  const res = await api.post<{
    leave: { id: string; employeeId: string; date: string; status: number };
    conflictHints: ConflictHint[];
  }>(`/api/leaves/${id}/approve`);

  const l = res.data.leave;
  return {
    leave: { id: l.id, employeeId: l.employeeId, date: l.date, status: mapStatus(l.status) },
    conflictHints: res.data.conflictHints,
  };
}

export async function rejectLeave(id: string, comment?: string): Promise<Leave> {
  // Backend akzeptiert optionalen Body-String (Kommentar)
  const res = await api.post<{ id: string; employeeId: string; date: string; status: number }>(
    `/api/leaves/${id}/reject`,
    comment ?? null,
    { headers: { "Content-Type": "application/json" } }
  );
  const l = res.data;
  return { id: l.id, employeeId: l.employeeId, date: l.date, status: mapStatus(l.status) };
}
