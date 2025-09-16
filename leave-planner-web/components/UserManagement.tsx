// components/UserManagement.tsx
import React, { useState } from "react";
import type { User } from "../types";
import { Role } from "../types";
import { PencilIcon, TrashIcon } from "./Icons";

interface UserManagementProps {
  currentUser: User | null;
  users: User[];
  // keep the signature; backend may ignore role on create, that's fine
  onCreateUser: (name: string, role: Role, jobTitle?: string | null) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

const roleStyles: Record<Role, string> = {
  [Role.Employee]: "bg-blue-100 text-blue-800",
  [Role.Approver]: "bg-green-100 text-green-800",
  [Role.Admin]: "bg-purple-100 text-purple-800",
};

const UserModal: React.FC<{
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (user: User) => void;
  onCreate: (name: string, role: Role, jobTitle?: string | null) => void;
}> = ({ user, onClose, onSave, onCreate }) => {
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? Role.Employee);
  const [jobTitle, setJobTitle] = useState(user?.jobTitle ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedJob = jobTitle.trim();
    if (!trimmedName) {
      alert("Name cannot be empty.");
      return;
    }

    // jobTitle is optional/null in backend
    const safeJob: string | null = trimmedJob.length ? trimmedJob : null;

    if (user?.id) {
      onSave({
        id: user.id,
        name: trimmedName,
        role,
        jobTitle: safeJob ?? undefined, // User type may allow undefined; backend will treat as null/unchanged
      } as User);
    } else {
      onCreate(trimmedName, role, safeJob);
    }
    onClose();
  };

  if (!user) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {user?.id ? "Edit User" : "Add New User"}
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-white"
                >
                  {Object.values(Role).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {/* Tipp: Falls dein Backend Role nicht ändert, diesen Select disabled setzen
                    und einen Hinweis anzeigen. */}
              </div>

              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                  Job Title (optional)
                </label>
                <input
                  type="text"
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2"
                  placeholder="e.g., Developer"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);

  const handleEdit = (user: User) => setEditingUser(user);
  const handleAddNew = () => setEditingUser({});

  const handleDelete = (userId: string, userName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete ${userName}? This action cannot be undone.`
      )
    ) {
      onDeleteUser(userId);
    }
  };

  return (
    <div>
      {editingUser && (
        <UserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={onUpdateUser}
          onCreate={onCreateUser}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-text-primary">Users</h2>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Add User
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job Title
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUser?.id;
              const r: Role = user.role ?? Role.Employee; // safe default
              return (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleStyles[r]}`}
                    >
                      {r}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.jobTitle ?? "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-primary hover:text-blue-700"
                        aria-label={`Edit ${user.name}`}
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={isCurrentUser}
                        className="text-danger hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                        title={
                          isCurrentUser
                            ? "You cannot delete yourself"
                            : `Delete ${user.name}`
                        }
                        aria-label={
                          isCurrentUser
                            ? "Cannot delete yourself"
                            : `Delete ${user.name}`
                        }
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
