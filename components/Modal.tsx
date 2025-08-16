import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg relative" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X size={24} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
