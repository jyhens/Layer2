// components/Header.tsx
import React from "react";
import type { User } from "../types";
import { Role } from "../types";

type HeaderProps = {
  users: User[];
  currentUser?: User | null;
  onUserChange: (id: string | null) => void;
};

const roleStyles: Record<Role, string> = {
  Employee: "bg-blue-100 text-blue-800",
  Approver: "bg-amber-100 text-amber-800",
  Admin: "bg-rose-100 text-rose-800",
};

const Header: React.FC<HeaderProps> = ({ users, currentUser, onUserChange }) => {
  // Ensure we always have a defined role for styling/index access
  const role: Role = currentUser?.role ?? Role.Employee;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="text-xl font-semibold">Leave Planner</div>
      </div>

      <div className="flex items-center gap-4">
        {/* Current user select */}
        <div className="flex flex-col">
          <label htmlFor="currentUser" className="text-xs text-gray-500">
            Aktueller Nutzer
          </label>
          <select
            id="currentUser"
            className="min-w-[220px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={currentUser?.id ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              onUserChange(id);
            }}
          >
            <option value="" disabled>
              -- Nutzer wählen --
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}{user.jobTitle ? ` (${user.jobTitle})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Role badge */}
        {currentUser && (
          <div className="mt-auto">
            <span
              className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-sm font-medium ${roleStyles[role]}`}
              title={currentUser.role}
            >
              {currentUser.role}
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
