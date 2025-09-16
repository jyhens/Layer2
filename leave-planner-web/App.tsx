// App.tsx
import React, { useState, useCallback, useMemo, useEffect } from "react";
import type {
  User,
  Leave,
  ToastMessage,
  ProjectConflict,
  Project,
  Customer,
  ProjectAssignment,
} from "./types";
import { Role, LeaveStatus } from "./types";

import Header from "./components/Header";
import RequestLeaveTab from "./components/RequestLeaveTab";
import ManageLeavesTab from "./components/ManageLeavesTab";
import AdminTab from "./components/AdminTab";
import Toast from "./components/Toast";
import CompanyOverviewTab from "./components/CompanyOverviewTab";

import {
  api,
  listEmployees,
  listCustomers,
  listProjects,
  listAssignments,
  listLeaves,
  createLeave as apiCreateLeave,
  approveLeave as apiApproveLeave,
  rejectLeave as apiRejectLeave,
  setCurrentUser as setApiCurrentUser,
} from "./api";

const App: React.FC = () => {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<ProjectAssignment[]>([]);

  const [activeTab, setActiveTab] = useState<"overview" | "request" | "manage" | "admin">(
    "overview"
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addToast = useCallback(
    (message: string, type: "success" | "error" | "warning" = "success") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );

  // ---------- LOADers ----------
  const loadEmployees = useCallback(async () => {
    const emps = await listEmployees();
    setUsers(emps);
    return emps;
  }, []);

  const loadCustomers = useCallback(async () => {
    const cs = await listCustomers();
    setCustomers(cs);
    return cs;
  }, []);

  const loadProjectsAndAssignments = useCallback(async () => {
    const ps = await listProjects();
    setProjects(ps);

    const allAssignments: ProjectAssignment[] = [];
    for (const p of ps) {
      const a = await listAssignments(p.id);
      allAssignments.push(...a);
    }
    setProjectAssignments(allAssignments);
    return { ps, allAssignments };
  }, []);

  const loadLeaves = useCallback(async () => {
    const ls = await listLeaves();
    setLeaves(ls.sort((a, b) => a.date.localeCompare(b.date)));
    return ls;
  }, []);

  const initialLoad = useCallback(async () => {
    try {
      setIsLoading(true);
      const [emps] = await Promise.all([loadEmployees(), loadCustomers()]);
      await loadProjectsAndAssignments();
      await loadLeaves();

      const savedId = localStorage.getItem("currentUserId");
      const found = emps.find((u) => u.id === savedId) ?? null;
      if (found) {
        setCurrentUserState(found);
        setApiCurrentUser(found.id);
      }
    } catch (err: any) {
      console.error(err);
      addToast("Fehler beim Laden der Daten.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [loadEmployees, loadCustomers, loadProjectsAndAssignments, loadLeaves, addToast]);

  useEffect(() => {
    initialLoad();
  }, [initialLoad]);

  useEffect(() => {
    if (currentUser?.role !== Role.Admin && activeTab === "admin") {
      setActiveTab("request");
    }
  }, [currentUser, activeTab]);

  // ---------- Current user selection (sets request header) ----------
  const handleHeaderUserChange = (id: string | null) => {
    setApiCurrentUser(id);
    const u = users.find((x) => x.id === id) ?? null;
    setCurrentUserState(u);
  };

  // ---------- Conflicts (frontend helper using API-loaded data) ----------
  const calculateConflicts = useCallback(
    (employeeId: string, date: string, includeRequested: boolean): ProjectConflict[] => {
      const requesterAssignments = projectAssignments.filter((a) => a.employeeId === employeeId);
      if (requesterAssignments.length === 0) return [];

      const dateObj = new Date(`${date}T00:00:00`);

      const activeProjectIds = projects
        .filter((p) => {
          const assigned = requesterAssignments.some((a) => a.projectId === p.id);
          if (!assigned) return false;
          const start = new Date(`${p.startDate}T00:00:00`);
          const end = p.endDate ? new Date(`${p.endDate}T00:00:00`) : null;
          return dateObj >= start && (!end || dateObj <= end);
        })
        .map((p) => p.id);

      if (activeProjectIds.length === 0) return [];

      const statuses = includeRequested
        ? [LeaveStatus.Approved, LeaveStatus.Requested]
        : [LeaveStatus.Approved];

      const results: ProjectConflict[] = [];
      for (const pid of activeProjectIds) {
        const proj = projects.find((p) => p.id === pid);
        if (!proj) continue;

        const teammates = projectAssignments
          .filter((a) => a.projectId === pid && a.employeeId !== employeeId)
          .map((a) => a.employeeId);

        if (teammates.length === 0) continue;

        const conflictingEmployeeIds = new Set(
          leaves
            .filter((l) => l.date === date && statuses.includes(l.status) && teammates.includes(l.employeeId))
            .map((l) => l.employeeId)
        );

        if (conflictingEmployeeIds.size === 0) continue;

        const employees = Array.from(conflictingEmployeeIds)
          .map((eid) => {
            const u = users.find((x) => x.id === eid);
            return u ? { employeeId: u.id, employeeName: u.name } : null;
          })
          .filter(Boolean) as { employeeId: string; employeeName: string }[];

        if (employees.length > 0) {
          results.push({
            projectId: proj.id,
            projectName: proj.name,
            employees,
          });
        }
      }
      return results;
    },
    [projectAssignments, projects, leaves, users]
  );

  // ---------- Leaves: create/approve/reject ----------
  const handleCreateLeave = useCallback(
    async (userId: string, date: string): Promise<Leave | null> => {
      try {
        const { leave, conflictHints } = await apiCreateLeave(userId, date);
        if (conflictHints.length) {
          addToast(
            `Hinweis: Konflikte in ${conflictHints
              .map((h) => `${h.projectName} (${h.employees.map((e) => e.employeeName).join(", ")})`)
              .join("; ")}`,
            "warning"
          );
        }
        await loadLeaves();
        return leave;
      } catch (err: any) {
        console.error(err);
        addToast(err?.response?.data ?? "Fehler beim Erstellen des Antrags.", "error");
        return null;
      }
    },
    [addToast, loadLeaves]
  );

  const handleApproveLeave = useCallback(
    async (leaveId: string) => {
      // ✅ Narrow role before using it in a function that expects Role
      const r = currentUser?.role;
      if (!currentUser || (r !== Role.Approver && r !== Role.Admin)) {
        addToast("Keine Berechtigung.", "error");
        return;
      }
      try {
        const { conflictHints } = await apiApproveLeave(leaveId);
        if (conflictHints.length) {
          addToast(
            `Konflikte: ${conflictHints
              .map((h) => `${h.projectName} (${h.employees.map((e) => e.employeeName).join(", ")})`)
              .join("; ")}`,
            "warning"
          );
        }
        await loadLeaves();
        addToast("Antrag genehmigt.", "success");
      } catch (err: any) {
        console.error(err);
        addToast(err?.response?.data ?? "Fehler beim Genehmigen.", "error");
      }
    },
    [currentUser, addToast, loadLeaves]
  );

  const handleRejectLeave = useCallback(
    async (leaveId: string, comment: string) => {
      // ✅ Narrow role before using it in a function that expects Role
      const r = currentUser?.role;
      if (!currentUser || (r !== Role.Approver && r !== Role.Admin)) {
        addToast("Keine Berechtigung.", "error");
        return;
      }
      try {
        await apiRejectLeave(leaveId, comment);
        await loadLeaves();
        addToast("Antrag abgelehnt.", "success");
      } catch (err: any) {
        console.error(err);
        addToast(err?.response?.data ?? "Fehler beim Ablehnen.", "error");
      }
    },
    [currentUser, addToast, loadLeaves]
  );

  // ---------- Admin actions (Employees & Projects) ----------
  const handleCreateUser = async (name: string, role: Role, jobTitle?: string | null) => {
    try {
      await api.post("/api/employees", { name, jobTitle: jobTitle ?? null });
      const emps = await loadEmployees();
      if (role !== Role.Employee) {
        addToast("Hinweis: Rollenänderung serverseitig (noch) nicht unterstützt.", "warning");
      } else {
        addToast("User created successfully", "success");
      }
      const cur = emps.find((u) => u.id === currentUser?.id) ?? null;
      setCurrentUserState(cur);
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data ?? "Fehler beim Erstellen des Users.", "error");
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      await api.put(`/api/employees/${updatedUser.id}`, {
        name: updatedUser.name,
        jobTitle: updatedUser.jobTitle ?? null,
      });
      const emps = await loadEmployees();
      if (currentUser?.id === updatedUser.id) {
        const me = emps.find((u) => u.id === updatedUser.id) ?? null;
        setCurrentUserState(me);
      }
      addToast("User updated successfully", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data ?? "Fehler beim Aktualisieren des Users.", "error");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/api/employees/${userId}`);
      await loadEmployees();
      await Promise.all([loadLeaves(), loadProjectsAndAssignments()]);
      if (currentUser?.id === userId) {
        setCurrentUserState(null);
        setApiCurrentUser(null);
      }
      addToast("User deleted successfully", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data ?? "Fehler beim Löschen des Users.", "error");
    }
  };

  const handleCreateProject = async (projectData: Omit<Project, "id">) => {
    try {
      await api.post("/api/projects", {
        name: projectData.name,
        customerId: projectData.customerId,
        startDate: projectData.startDate,
        endDate: projectData.endDate ?? null,
      });
      await loadProjectsAndAssignments();
      addToast("Project created successfully", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data ?? "Fehler beim Erstellen des Projekts.", "error");
    }
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    try {
      await api.put(`/api/projects/${updatedProject.id}`, {
        name: updatedProject.name,
        customerId: updatedProject.customerId,
        startDate: updatedProject.startDate,
        endDate: updatedProject.endDate ?? null,
      });
      await loadProjectsAndAssignments();
      addToast("Project updated successfully", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data ?? "Fehler beim Aktualisieren des Projekts.", "error");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await api.delete(`/api/projects/${projectId}`);
      await loadProjectsAndAssignments();
      addToast("Project deleted successfully", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data ?? "Fehler beim Löschen des Projekts.", "error");
    }
  };

  const handleAssignEmployee = async (projectId: string, employeeId: string) => {
    try {
      await api.post(`/api/projects/${projectId}/assignments`, { employeeId });
      await loadProjectsAndAssignments();
      addToast("Employee assigned successfully.", "success");
    } catch (err: any) {
      if (err?.response?.status === 409) {
        addToast("Employee is already assigned to this project.", "warning");
      } else {
        addToast(err?.response?.data ?? "Fehler beim Zuweisen.", "error");
      }
    }
  };

  const handleUnassignEmployee = async (projectId: string, employeeId: string) => {
    try {
      await api.delete(`/api/projects/${projectId}/assignments/${employeeId}`);
      await loadProjectsAndAssignments();
      addToast("Employee unassigned successfully.", "success");
    } catch (err: any) {
      console.error(err);
      addToast(err?.response?.data ?? "Fehler beim Entfernen der Zuweisung.", "error");
    }
  };

  const canManage = useMemo(
    () => currentUser?.role === Role.Approver || currentUser?.role === Role.Admin,
    [currentUser]
  );
  const isAdmin = useMemo(() => currentUser?.role === Role.Admin, [currentUser]);
  const appDisabled = !currentUser;

  const navTabs = [
    { id: "overview", label: "Company Overview", visible: true },
    { id: "request", label: "Request Leave", visible: true },
    { id: "manage", label: "Manage Leaves", visible: canManage },
    { id: "admin", label: "Admin Panel", visible: isAdmin },
  ] as const;

  const visibleTabs = navTabs.filter((tab) => tab.visible);

  return (
    <div className="min-h-screen bg-surface-subtle font-sans">
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts((t) => t.filter((x) => x.id !== toast.id))}
          />
        ))}
      </div>

      <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-7xl">
        <Header users={users} currentUser={currentUser ?? undefined} onUserChange={handleHeaderUserChange} />

        <main className="mt-6 relative">
          {appDisabled && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <p className="text-lg font-semibold text-slate-500">
                Bitte Nutzer wählen, um fortzufahren.
              </p>
            </div>
          )}
          <div className={appDisabled ? "opacity-50 pointer-events-none" : ""}>
            <div className="block sm:hidden mb-4">
              <div className="flex bg-slate-200 rounded-lg p-1">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                      activeTab === tab.id ? "bg-white shadow" : "text-slate-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden sm:block border-b border-border">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-6">
              {activeTab === "overview" && (
                <CompanyOverviewTab
                  projects={projects}
                  customers={customers}
                  users={users}
                  projectAssignments={projectAssignments}
                  leaves={leaves.filter((l) => l.status === LeaveStatus.Approved)}
                />
              )}
              {activeTab === "request" && (
                <RequestLeaveTab
                  currentUser={currentUser}
                  users={users}
                  leaves={leaves}
                  onCheckConflicts={(userId, date) => calculateConflicts(userId, date, false)}
                  onCreateLeave={handleCreateLeave}
                />
              )}
              {activeTab === "manage" && canManage && (
                <ManageLeavesTab
                  currentUser={currentUser}
                  leaves={leaves}
                  users={users}
                  onApproveLeave={handleApproveLeave}
                  onRejectLeave={handleRejectLeave}
                  onCheckConflictsForApproval={(userId, date) =>
                    calculateConflicts(userId, date, true)
                  }
                />
              )}
              {activeTab === "admin" && isAdmin && (
                <AdminTab
                  currentUser={currentUser}
                  users={users}
                  projects={projects}
                  customers={customers}
                  projectAssignments={projectAssignments}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onCreateProject={handleCreateProject}
                  onUpdateProject={handleUpdateProject}
                  onDeleteProject={handleDeleteProject}
                  onAssignEmployee={handleAssignEmployee}
                  onUnassignEmployee={handleUnassignEmployee}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {isLoading && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-[60] flex items-center justify-center">
          <div className="bg-white px-6 py-4 rounded-lg shadow">Loading…</div>
        </div>
      )}
    </div>
  );
};

export default App;
