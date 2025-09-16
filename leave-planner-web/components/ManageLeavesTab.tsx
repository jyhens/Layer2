// components/ManageLeavesTab.tsx
import React, { useState, useMemo } from "react";
import type { User, Leave, ProjectConflict } from "../types";
import { LeaveStatus, Role } from "../types";
import { CheckCircleIcon, XCircleIcon } from "./Icons";

interface ManageLeavesTabProps {
  currentUser: User | null;
  leaves: Leave[];
  users: User[];
  onApproveLeave: (id: string) => Promise<void>;
  onRejectLeave: (id: string, comment: string) => Promise<void>;
  // Must return backend-shaped conflicts: { projectId, projectName, employees: [{ employeeId, employeeName }] }
  onCheckConflictsForApproval: (userId: string, date: string) => ProjectConflict[];
}

const statusStyles: Record<LeaveStatus, string> = {
  [LeaveStatus.Requested]: "bg-yellow-100 text-yellow-800",
  [LeaveStatus.Approved]: "bg-green-100 text-green-800",
  [LeaveStatus.Rejected]: "bg-red-100 text-red-800",
};

const ManageLeavesTab: React.FC<ManageLeavesTabProps> = ({
  currentUser,
  leaves,
  users,
  onApproveLeave,
  onRejectLeave,
  onCheckConflictsForApproval,
}) => {
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const canDecide =
    currentUser?.role === Role.Approver || currentUser?.role === Role.Admin;

  const handleApprove = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await onApproveLeave(id);
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReject = async (id: string) => {
    const comment = window.prompt("Optionaler Kommentar zur Ablehnung:", "");
    if (comment !== null) {
      setActionLoading((prev) => ({ ...prev, [id]: true }));
      try {
        await onRejectLeave(id, comment);
      } finally {
        setActionLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const requestsWithDetails = useMemo(() => {
    return leaves
      .map((req) => ({
        ...req,
        // falls Leave.employee nicht befüllt ist, hol aus users
        user: req.employee ?? users.find((u) => u.id === req.employeeId),
        conflicts: onCheckConflictsForApproval(req.employeeId, req.date),
      }))
      .filter((req) => req.user)
      .sort((a, b) => b.date.localeCompare(a.date)); // neueste zuerst
  }, [leaves, users, onCheckConflictsForApproval]);

  // Render conflicts using backend shape (employees have no status),
  // we infer status by looking up matching leaves for the same date.
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
          // Count statuses for employees in this project on that date
          let approved = 0;
          let requested = 0;
          const approvedNames: string[] = [];
          const requestedNames: string[] = [];

          for (const emp of c.employees) {
            const found = leaves.find(
              (l) => l.employeeId === emp.employeeId && l.date === date
            );
            if (found?.status === LeaveStatus.Approved) {
              approved++;
              approvedNames.push(emp.employeeName);
            } else if (found?.status === LeaveStatus.Requested) {
              requested++;
              requestedNames.push(emp.employeeName);
            }
          }

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
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-sm border border-border">
      <div className="sm:flex sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-text-primary">
          Urlaubsanträge verwalten
        </h2>
        <p className="text-sm text-slate-500 italic mt-2 sm:mt-0">
          Hinweis: Konflikte berücksichtigen genehmigte & angefragte
          Abwesenheiten.
        </p>
      </div>

      {/* Desktop Table */}
      <div className="mt-6 overflow-x-auto hidden md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mitarbeiter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Datum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Konflikte
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Aktionen</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requestsWithDetails.length > 0 ? (
              requestsWithDetails.map((req) => {
                const isOwnRequest = req.employeeId === currentUser?.id;
                const isLoading = actionLoading[req.id];
                const disableActions = !canDecide || isOwnRequest || isLoading;

                return (
                  <tr key={req.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {req.user?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {req.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[req.status]}`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {renderConflictDetails(req.conflicts || [], req.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {req.status === LeaveStatus.Requested && (
                        <div
                          className="flex items-center justify-end gap-2"
                          title={
                            !canDecide
                              ? "Nur Approver/Admin dürfen genehmigen/ablehnen."
                              : isOwnRequest
                              ? "Eigene Anträge können nicht selbst genehmigt werden."
                              : ""
                          }
                        >
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={disableActions}
                            className="text-success hover:text-green-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
                            <CheckCircleIcon className="w-6 h-6" />
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={disableActions}
                            className="text-danger hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                          >
                            <XCircleIcon className="w-6 h-6" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-500">
                  Keine Anträge gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="mt-6 md:hidden space-y-4">
        {requestsWithDetails.length > 0 ? (
          requestsWithDetails.map((req) => {
            const isOwnRequest = req.employeeId === currentUser?.id;
            const isLoading = actionLoading[req.id];
            const disableActions = !canDecide || isOwnRequest || isLoading;

            return (
              <div
                key={req.id}
                className="bg-white p-4 rounded-lg shadow border border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-text-primary">
                      {req.user?.name}
                    </p>
                    <p className="text-sm text-slate-500">{req.date}</p>
                    <span
                      className={`mt-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[req.status]}`}
                    >
                      {req.status}
                    </span>
                  </div>
                  {req.status === LeaveStatus.Requested && (
                    <div
                      className="flex items-center gap-2"
                      title={
                        !canDecide
                          ? "Nur Approver/Admin dürfen genehmigen/ablehnen."
                          : isOwnRequest
                          ? "Eigene Anträge können nicht selbst bearbeitet werden."
                          : ""
                      }
                    >
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={disableActions}
                        className="p-1 text-success disabled:text-gray-300"
                      >
                        <CheckCircleIcon className="w-7 h-7" />
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        disabled={disableActions}
                        className="p-1 text-danger disabled:text-gray-300"
                      >
                        <XCircleIcon className="w-7 h-7" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="text-sm text-gray-500">
                    <strong className="block mb-1 text-gray-700">
                      Konflikte:
                    </strong>
                    {renderConflictDetails(req.conflicts || [], req.date)}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-slate-500">
            Keine Anträge gefunden.
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageLeavesTab;
