import React, { useState, useMemo } from 'react';
import type { Project, User, ProjectAssignment } from '../types';

interface AssignmentModalProps {
    project: Project;
    users: User[];
    assignments: ProjectAssignment[];
    onClose: () => void;
    onAssign: (projectId: string, employeeId: string) => Promise<void>;
    onUnassign: (projectId: string, employeeId: string) => Promise<void>;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({ project, users, assignments, onClose, onAssign, onUnassign }) => {
    const [selectedAvailableUser, setSelectedAvailableUser] = useState<string>('');
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const { assignedUsers, availableUsers } = useMemo(() => {
        const assignedIds = new Set(
            assignments.filter(a => a.projectId === project.id).map(a => a.employeeId)
        );
        const assigned = users.filter(u => assignedIds.has(u.id));
        const available = users.filter(u => !assignedIds.has(u.id));

        if (available.length > 0 && !selectedAvailableUser) {
            setSelectedAvailableUser(available[0].id);
        } else if (available.length === 0) {
            setSelectedAvailableUser('');
        }
        
        return { assignedUsers: assigned, availableUsers: available };
    }, [assignments, users, project.id]);

     React.useEffect(() => {
        if (availableUsers.length > 0) {
            setSelectedAvailableUser(availableUsers[0].id);
        } else {
            setSelectedAvailableUser('');
        }
    }, [availableUsers]);

    const handleAssign = async () => {
        if (!selectedAvailableUser) return;
        setLoading(prev => ({...prev, [`add-${selectedAvailableUser}`]: true}));
        await onAssign(project.id, selectedAvailableUser);
        setLoading(prev => ({...prev, [`add-${selectedAvailableUser}`]: false}));
    };

    const handleUnassign = async (employeeId: string) => {
        setLoading(prev => ({...prev, [`remove-${employeeId}`]: true}));
        await onUnassign(project.id, employeeId);
        setLoading(prev => ({...prev, [`remove-${employeeId}`]: false}));
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Manage Assignments</h3>
                    <p className="text-sm text-gray-500 mt-1">Project: <span className="font-semibold">{project.name}</span></p>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Assigned Users */}
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Assigned Employees ({assignedUsers.length})</h4>
                            <div className="border rounded-md h-64 overflow-y-auto">
                                {assignedUsers.length > 0 ? (
                                    <ul className="divide-y">
                                        {assignedUsers.map(user => (
                                            <li key={user.id} className="p-3 flex justify-between items-center">
                                                <div>
                                                    <p className="font-medium text-sm">{user.name}</p>
                                                    <p className="text-xs text-gray-500">{user.jobTitle}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleUnassign(user.id)}
                                                    disabled={loading[`remove-${user.id}`]}
                                                    className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                                                >
                                                    Remove
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-sm text-gray-400">No employees assigned.</div>
                                )}
                            </div>
                        </div>

                        {/* Available Users */}
                        <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Available Employees ({availableUsers.length})</h4>
                            <div className="border rounded-md p-3 bg-gray-50">
                                {availableUsers.length > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedAvailableUser}
                                            onChange={e => setSelectedAvailableUser(e.target.value)}
                                            className="flex-grow block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-white"
                                        >
                                            {availableUsers.map(user => (
                                                <option key={user.id} value={user.id}>{user.name}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={handleAssign}
                                            disabled={!selectedAvailableUser || loading[`add-${selectedAvailableUser}`]}
                                            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-blue-700 disabled:bg-slate-400"
                                        >
                                            Add
                                        </button>
                                    </div>
                                ) : (
                                     <div className="flex items-center justify-center h-full text-sm text-gray-400 py-8">All employees are assigned.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end rounded-b-lg">
                    <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:w-auto sm:text-sm">Done</button>
                </div>
            </div>
        </div>
    );
};

export default AssignmentModal;