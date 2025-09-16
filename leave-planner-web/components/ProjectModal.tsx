import React, { useState, useEffect } from 'react';
import type { Project, Customer } from '../types';

interface ProjectModalProps {
    project: Partial<Project> | null;
    customers: Customer[];
    onClose: () => void;
    onSave: (project: Project) => void;
    onCreate: (projectData: Omit<Project, 'id'>) => void;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ project, customers, onClose, onSave, onCreate }) => {
    const [name, setName] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    useEffect(() => {
        setName(project?.name || '');
        setCustomerId(project?.customerId || (customers.length > 0 ? customers[0].id : ''));
        setStartDate(project?.startDate || '');
        setEndDate(project?.endDate || '');
    }, [project, customers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !customerId || !startDate || !endDate) {
            alert("All fields are required.");
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert("Start date cannot be after end date.");
            return;
        }

        const projectData = { name, customerId, startDate, endDate };

        if (project?.id) {
            onSave({ ...projectData, id: project.id });
        } else {
            onCreate(projectData);
        }
        onClose();
    };

    if (!project) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h3 className="text-lg font-medium leading-6 text-gray-900">{project?.id ? 'Edit Project' : 'Add New Project'}</h3>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Project Name</label>
                                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2" required />
                            </div>
                             <div>
                                <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Customer</label>
                                <select id="customer" value={customerId} onChange={e => setCustomerId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-white" required>
                                    <option value="" disabled>Select a customer</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div></div>
                            <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                                <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-white" required />
                            </div>
                             <div>
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                                <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-white" required />
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">Save</button>
                        <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectModal;