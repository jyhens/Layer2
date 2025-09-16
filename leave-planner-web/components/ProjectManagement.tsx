import React, { useState, useMemo } from 'react';
import type { Project, Customer, User, ProjectAssignment } from '../types';
import { PencilIcon, TrashIcon, ClipboardListIcon } from './Icons';
import ProjectModal from './ProjectModal';
import AssignmentModal from './AssignmentModal';

interface ProjectManagementProps {
    projects: Project[];
    customers: Customer[];
    users: User[];
    projectAssignments: ProjectAssignment[];
    onCreateProject: (projectData: Omit<Project, 'id'>) => Promise<void>;
    onUpdateProject: (project: Project) => Promise<void>;
    onDeleteProject: (projectId: string) => Promise<void>;
    onAssignEmployee: (projectId: string, employeeId: string) => Promise<void>;
    onUnassignEmployee: (projectId: string, employeeId: string) => Promise<void>;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ projects, customers, users, projectAssignments, onCreateProject, onUpdateProject, onDeleteProject, onAssignEmployee, onUnassignEmployee }) => {
    const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);
    const [managingAssignmentsFor, setManagingAssignmentsFor] = useState<Project | null>(null);

    const projectData = useMemo(() => {
        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        
        return projects.map(p => {
            const assignmentCount = projectAssignments.filter(pa => pa.projectId === p.id).length;

            return {
                ...p,
                customerName: customerMap.get(p.customerId) || 'Unknown Customer',
                assignedEmployeeCount: assignmentCount,
            };
        });
    }, [projects, customers, projectAssignments]);

    const handleEdit = (project: Project) => setEditingProject(project);
    const handleAddNew = () => setEditingProject({});
    const handleDelete = (projectId: string, projectName: string) => {
        if (window.confirm(`Are you sure you want to delete project "${projectName}"?`)) {
            onDeleteProject(projectId);
        }
    };

    return (
        <div>
            {editingProject && (
                <ProjectModal
                    project={editingProject}
                    customers={customers}
                    onClose={() => setEditingProject(null)}
                    onSave={onUpdateProject}
                    onCreate={onCreateProject}
                />
            )}
            {managingAssignmentsFor && (
                <AssignmentModal
                    project={managingAssignmentsFor}
                    users={users}
                    assignments={projectAssignments}
                    onClose={() => setManagingAssignmentsFor(null)}
                    onAssign={onAssignEmployee}
                    onUnassign={onUnassignEmployee}
                />
            )}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-text-primary">Projects</h2>
                <button
                    onClick={handleAddNew}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    Add Project
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {projectData.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.customerName}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.startDate} - {p.endDate}</td>
                                <td className="px-6 py-4 text-sm text-center text-gray-500">{p.assignedEmployeeCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-3">
                                        <button onClick={() => setManagingAssignmentsFor(p)} className="text-slate-500 hover:text-slate-700" aria-label={`Manage assignments for ${p.name}`} title="Manage Assignments"><ClipboardListIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleEdit(p)} className="text-primary hover:text-blue-700" aria-label={`Edit ${p.name}`} title="Edit Project"><PencilIcon className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(p.id, p.name)} className="text-danger hover:text-red-700" aria-label={`Delete ${p.name}`} title="Delete Project"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProjectManagement;