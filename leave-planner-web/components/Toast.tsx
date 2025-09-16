
import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon } from './Icons';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'warning';
    onClose: () => void;
}

const toastStyles = {
    success: {
        bg: 'bg-green-50',
        iconColor: 'text-success',
        textColor: 'text-green-800',
        Icon: CheckCircleIcon,
    },
    error: {
        bg: 'bg-red-50',
        iconColor: 'text-danger',
        textColor: 'text-red-800',
        Icon: XCircleIcon,
    },
    warning: {
        bg: 'bg-yellow-50',
        iconColor: 'text-warning',
        textColor: 'text-yellow-800',
        Icon: AlertTriangleIcon,
    },
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => {
            clearTimeout(timer);
        };
    }, [onClose]);

    const { bg, iconColor, textColor, Icon } = toastStyles[type];

    return (
        <div className={`max-w-sm w-full ${bg} shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}>
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className={`text-sm font-medium ${textColor}`}>
                            {message}
                        </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            type="button"
                            className="inline-flex rounded-md bg-transparent text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            onClick={onClose}
                        >
                            <span className="sr-only">Close</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Toast;
