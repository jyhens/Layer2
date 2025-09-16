// components/RequestLeaveTab.tsx
import React, { useState, useMemo, useEffect } from "react";
import type { User, Leave, ProjectConflict } from "../types";
import { Role, LeaveStatus } from "../types";
import { AlertTriangleIcon, CalendarIcon } from "./Icons";

interface RequestLeaveTabProps {
  currentUser: User | null;
  users: User[];
  leaves: Leave[];
  onCreateLeave: (userId: string, date: string) => Promise<Leave | null>;
  // must return backend-shaped conflicts:
  // { projectId, projectName, employees: [{ employeeId, employeeName }] }
  onCheckConflicts: (userId: string, date: string) => ProjectConflict[];
}

const RequestLeaveTab: React.FC<RequestLeaveTabProps> = ({
  currentUser,
  users,
  leaves,
  onCreateLeave,
  onCheckConflicts,
}) => {
  const today = new Date().toISOString().split("T")[0];

  // Default: current user + today's date
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    currentUser?.id
  );
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep selected user in sync with currentUser
  useEffect(() => {
    if (currentUser) setSelectedUserId(currentUser.id);
  }, [currentUser]);

  const canSelectUser =
    currentUser?.role === Role.Approver || currentUser?.role === Role.Admin;

  // Build conflict details (weekend hint, duplicate request, and project conflicts)
  const conflictDetails = useMemo(() => {
    if (!selectedUserId || !selectedDate)
      return { conflicts: [] as ProjectConflict[], hints: [] as string[] };

    const hints: string[] = [];

    // Weekend hint
    const day = new Date(`${selectedDate}T00:00:00`).getDay(); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) {
      hints.push("Hinweis: Der ausgewählte Tag ist ein Wochenende.");
    }

    // Existing request for same user/date
    const existing = leaves.find(
      (l) => l.employeeId === selectedUserId && l.date === selectedDate
    );
    if (existing) {
      hints.push(
        `Konflikt: Für diesen Mitarbeiter existiert bereits ein Antrag (${existing.status}).`
      );
    }

    // Backend conflict hints (employees in same projects who are absent/requested)
    const conflicts = onCheckConflicts(selectedUserId, selectedDate);

    return { conflicts, hints };
  }, [selectedUserId, selectedDate, leaves, onCheckConflicts]);

  const hasHardConflict = conflictDetails.hints.some((h) =>
    h.startsWith("Konflikt")
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId && selectedDate && !hasHardConflict) {
      setIsSubmitting(true);
      try {
        await onCreateLeave(selectedUserId, selectedDate);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Render backend-shaped conflicts; infer each employee's status from `leaves`
  const renderConflictDetails = (
    conflicts: ProjectConflict[],
    date: string
  ) => {
    if (!conflicts || conflicts.length === 0) {
      return <span className="text-slate-400">-</span>;
    }

    return (
      <div className="space-y-1 max-w-xs">
        {conflicts.map((c) => {
          let approved = 0;
          let requested = 0;
          const approvedNames: string[] = [];
          const requestedNames: string[] = [];

          const rows = c.employees.map((emp) => {
            const found = leaves.find(
              (l) => l.employeeId === emp.employeeId && l.date === date
            );
            const st = found?.status;

            if (st === LeaveStatus.Approved) {
              approved++;
              approvedNames.push(emp.employeeName);
            } else if (st === LeaveStatus.Requested) {
              requested++;
              requestedNames.push(emp.employeeName);
            }

            const statusLabel =
              st === LeaveStatus.Approved
                ? " (genehmigt)"
                : st === LeaveStatus.Requested
                ? " (angefragt)"
                : "";

            return (
              <li key={emp.employeeId}>
                {emp.employeeName}
                {statusLabel}
              </li>
            );
          });

          const tooltip: string[] = [];
          if (approved > 0) tooltip.push(`Genehmigt: ${approvedNames.join(", ")}`);
          if (requested > 0) tooltip.push(`Angefragt: ${requestedNames.join(", ")}`);

          return (
            <div key={c.projectId} title={tooltip.join(" | ")}>
              <div className="flex items-center text-xs">
                <span className="font-semibold truncate pr-2">
                  {c.projectName}:
                </span>
                <div className="flex items-center flex-wrap gap-1">
                  {approved > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                      {approved} genehmigt
                    </span>
                  )}
                  {requested > 0 && (
                    <span className="px-1.5 py-0.5 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                      {requested} angefragt
                    </span>
                  )}
                </div>
              </div>
              <ul className="list-['-_'] list-inside ml-4 mt-1 text-xs">{rows}</ul>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
      <h2 className="text-xl font-bold text-text-primary mb-4">
        Urlaub beantragen
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employee select */}
          <div>
            <label
              htmlFor="employee-select"
              className="block text-sm font-medium text-slate-700"
            >
              Mitarbeiter
            </label>
            <select
              id="employee-select"
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={!canSelectUser}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {canSelectUser ? (
                users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))
              ) : (
                <option value={currentUser?.id}>{currentUser?.name}</option>
              )}
            </select>
          </div>

          {/* Date input */}
          <div>
            <label
              htmlFor="leave-date"
              className="block text-sm font-medium text-slate-700"
            >
              Datum
            </label>
            <div className="relative mt-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="leave-date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 pl-10 bg-white"
              />
            </div>
          </div>
        </div>

        {(conflictDetails.hints.length > 0 ||
          conflictDetails.conflicts.length > 0) && (
          <div className="bg-amber-50 border-l-4 border-warning p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangleIcon className="h-5 w-5 text-warning" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Mögliche Konflikte & Hinweise
                </p>
                <ul className="list-none text-sm text-amber-700 space-y-2">
                  {conflictDetails.hints.map((hint, index) => (
                    <li key={`hint-${index}`} className="list-disc list-inside">
                      {hint}
                    </li>
                  ))}
                  {conflictDetails.conflicts.map((conflict) => (
                    <li key={conflict.projectId}>
                      <span className="font-semibold">
                        Projekt "{conflict.projectName}":
                      </span>
                      {renderConflictDetails(
                        [conflict],
                        selectedDate || today
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <p className="text-sm text-slate-500 italic">
          Hinweis: Beim Beantragen werden nur bereits{" "}
          <b>genehmigte</b> Abwesenheiten anderer im selben Projekt als
          Konflikt berücksichtigt.
        </p>

        <div>
          <button
            type="submit"
            disabled={!selectedUserId || hasHardConflict || isSubmitting}
            className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Wird beantragt..." : "Request Leave"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RequestLeaveTab;
