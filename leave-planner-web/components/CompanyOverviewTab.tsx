import React, { useState, useMemo } from 'react';
import type { User, Leave, Customer, Project, ProjectAssignment } from '../types';
import { BriefcaseIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardListIcon } from './Icons';

interface CompanyOverviewTabProps {
    projects: Project[];
    customers: Customer[];
    users: User[];
    projectAssignments: ProjectAssignment[];
    leaves: Leave[]; // Should be pre-filtered to approved leaves
}

const CompanyOverviewTab: React.FC<CompanyOverviewTabProps> = ({ projects, customers, users, projectAssignments, leaves }) => {
    const [viewDate, setViewDate] = useState(new Date('2025-09-01T12:00:00Z')); // Default to Sep 2025 for seed data

    const handlePrevMonth = () => {
        setViewDate(current => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(current => new Date(current.getFullYear(), current.getMonth() + 1, 1));
    };

    const processedData = useMemo(() => {
        const customerMap = new Map(customers.map(c => [c.id, c.name]));
        const userMap = new Map(users.map(u => [u.id, u]));

        return projects.map(project => {
            const assignments = projectAssignments.filter(pa => pa.projectId === project.id);
            const assignedEmployeeIds = new Set(assignments.map(a => a.employeeId));
            const assignedEmployees = Array.from(assignedEmployeeIds).map(id => userMap.get(id)).filter((u): u is User => !!u);

            const projectLeaves = leaves.filter(l => assignedEmployeeIds.has(l.employeeId));
            const leavesByDay = new Map<number, User[]>();

            projectLeaves.forEach(leave => {
                const leaveDate = new Date(leave.date + 'T12:00:00Z');
                if (leaveDate.getFullYear() === viewDate.getFullYear() && leaveDate.getMonth() === viewDate.getMonth()) {
                    const dayOfMonth = leaveDate.getDate();
                    if (!leavesByDay.has(dayOfMonth)) {
                        leavesByDay.set(dayOfMonth, []);
                    }
                    const employee = userMap.get(leave.employeeId);
                    if (employee) {
                       leavesByDay.get(dayOfMonth)?.push(employee);
                    }
                }
            });

            return {
                ...project,
                customerName: customerMap.get(project.customerId) || 'Unknown',
                assignedEmployees,
                leavesByDay,
            };
        });
    }, [projects, customers, users, projectAssignments, leaves, viewDate]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon, ...

    const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const leadingEmptyDays = Array.from({ length: (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1) }); // Adjust for week starting on Monday


    return (
        <div className="space-y-8">
            <div className="bg-surface p-4 sm:p-6 rounded-xl shadow-sm border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-text-primary">Company Overview</h2>
                    <p className="text-sm text-slate-500">Project assignments and approved leaves across the company.</p>
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={handlePrevMonth} className="p-2 rounded-md hover:bg-slate-100"><ChevronLeftIcon className="w-5 h-5" /></button>
                     <span className="font-semibold text-center w-32">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                     <button onClick={handleNextMonth} className="p-2 rounded-md hover:bg-slate-100"><ChevronRightIcon className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {processedData.map(project => (
                    <div key={project.id} className="bg-surface p-4 sm:p-6 rounded-xl shadow-sm border border-border">
                        <div className="flex items-start gap-4">
                             <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
                                <BriefcaseIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">{project.name}</h3>
                                <p className="text-sm text-slate-500">{project.customerName} | {project.startDate} to {project.endDate}</p>
                            </div>
                        </div>

                        <div className="mt-6">
                            <h4 className="font-semibold text-sm text-slate-600 mb-2 flex items-center gap-2"><ClipboardListIcon className="w-5 h-5"/> Team Members ({project.assignedEmployees.length})</h4>
                            <div className="flex flex-wrap gap-2">
                                {project.assignedEmployees.map(emp => (
                                    <span key={emp.id} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">{emp.name}</span>
                                ))}
                                {project.assignedEmployees.length === 0 && <p className="text-xs text-slate-400">No employees assigned.</p>}
                            </div>
                        </div>

                        <div className="mt-6">
                             <h4 className="font-semibold text-sm text-slate-600 mb-2 flex items-center gap-2"><CalendarIcon className="w-5 h-5" /> Approved Leaves for {viewDate.toLocaleString('default', { month: 'long' })}</h4>
                             <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mt-4 border-t pt-2">
                                 <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
                             </div>
                             <div className="grid grid-cols-7 gap-1 mt-1">
                                 {leadingEmptyDays.map((_, index) => <div key={`empty-${index}`} />)}
                                 {calendarDays.map(day => {
                                     const leavesForDay = project.leavesByDay.get(day);
                                     const hasLeaves = leavesForDay && leavesForDay.length > 0;
                                     return (
                                         <div key={day} className={`p-1 rounded-md aspect-square flex flex-col items-center justify-center ${hasLeaves ? 'bg-amber-100' : 'bg-slate-50'}`}>
                                             <span className={`font-semibold ${hasLeaves ? 'text-amber-800' : 'text-slate-700'}`}>{day}</span>
                                             {hasLeaves && (
                                                <div className="text-[10px] text-amber-700 leading-tight truncate w-full" title={leavesForDay.map(u => u.name).join(', ')}>
                                                    {leavesForDay.map(u => u.name.split(' ')[0]).join(', ')}
                                                </div>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CompanyOverviewTab;