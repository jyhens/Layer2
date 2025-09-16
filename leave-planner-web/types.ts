// types.ts

export enum Role {
  Employee = "Employee",
  Approver = "Approver",
  Admin = "Admin",
}

export enum LeaveStatus {
  Requested = "Requested",
  Approved = "Approved",
  Rejected = "Rejected",
}

// --- Basic entities from API ---

export interface Customer {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  startDate: string;          // YYYY-MM-DD (DateOnly)
  endDate?: string | null;    // <-- Backend kann null/fehlen
}

export interface ProjectAssignment {
  projectId: string;
  employeeId: string;
}

export interface User {
  id: string;
  name: string;
  jobTitle?: string | null;   // <-- Backend kann null/fehlen
  role?: Role;                // <-- Backend liefert evtl. (noch) keine Role
}

// --- Conflict hints exactly like backend ---

export type ConflictEmployee = {
  employeeId: string;
  employeeName: string;
};

export type ProjectConflict = {
  projectId: string;
  projectName: string;
  employees: ConflictEmployee[]; // <-- Backend liefert nur IDs+Namen, keinen Status
};

// --- Leaves (client-side convenience fields bleiben optional) ---

export interface Leave {
  id: string;
  employeeId: string;
  date: string;               // YYYY-MM-DD (DateOnly)
  status: LeaveStatus;

  // Client-seitige optionale Zusatzinfos:
  employee?: User;
  conflicts?: ProjectConflict[];

  // Decision-Felder kommen nur bei approve/reject zurück:
  decisionById?: string;
  decisionAt?: string;        // ISO string
  comment?: string;
}

// --- UI helper ---

export type ToastMessage = {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
};
