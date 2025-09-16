import React, { useState } from 'react';
import type { User, Project, Customer, ProjectAssignment } from '../types';
import { Role } from '../types';
import UserManagement from './UserManagement';
import ProjectManagement from './ProjectManagement';

interface AdminTabProps {
    currentUser: User | null;
    users: User[];
    projects: Project[];
    customers: Customer[];
    projectAssignments: ProjectAssignment[];
    onCreateUser: (name: string, role: Role, jobTitle: string) => Promise<void>;
    onUpdateUser: (user: User) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    onCreateProject: (projectData: Omit<Project, 'id'>) => Promise<void>;
    onUpdateProject: (project: Project) => Promise<void>;
    onDeleteProject: (projectId: string) => Promise<void>;
    onAssignEmployee: (projectId: string, employeeId: string) => Promise<void>;
    onUnassignEmployee: (projectId: string, employeeId: string) => Promise<void>;
}


const AdminTab: React.FC<AdminTabProps> = (props) => {
    const [activeSubTab, setActiveSubTab] = useState<'users' | 'projects'>('users');

    return (
        <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-sm border border-border">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveSubTab('users')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeSubTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveSubTab('projects')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeSubTab === 'projects' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        Project Management
                    </button>
                </nav>
            </div>
            <div className="mt-6">
                {activeSubTab === 'users' && (
                    <UserManagement
                        currentUser={props.currentUser}
                        users={props.users}
                        onCreateUser={props.onCreateUser}
                        onUpdateUser={props.onUpdateUser}
                        onDeleteUser={props.onDeleteUser}
                    />
                )}
                {activeSubTab === 'projects' && (
                   <ProjectManagement
                        projects={props.projects}
                        customers={props.customers}
                        users={props.users}
                        projectAssignments={props.projectAssignments}
                        onCreateProject={props.onCreateProject}
                        onUpdateProject={props.onUpdateProject}
                        onDeleteProject={props.onDeleteProject}
                        onAssignEmployee={props.onAssignEmployee}
                        onUnassignEmployee={props.onUnassignEmployee}
                   />
                )}
            </div>
        </div>
    );
};

export default AdminTab;