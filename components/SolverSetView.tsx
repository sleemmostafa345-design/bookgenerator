import React from 'react';
import { SolverSet } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { Trash2 } from 'lucide-react';

interface SolverSetViewProps {
    set: SolverSet;
    onDelete: (setId: string) => void;
}

const SolverSetView: React.FC<SolverSetViewProps> = ({ set, onDelete }) => {
    return (
        <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-end items-center mb-2">
                 <button onClick={() => onDelete(set.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400">
                    <Trash2 size={18} />
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-bold mb-2">Your Input:</h4>
                    <div className="p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                        {set.userInput.type === 'image' ? (
                            <img src={set.userInput.content} alt="User exercise" className="max-w-full h-auto rounded-md" />
                        ) : (
                            <p className="whitespace-pre-wrap">{set.userInput.content}</p>
                        )}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold mb-2">AI Solution:</h4>
                     <div className="p-3 bg-white dark:bg-gray-700 rounded-md shadow-sm">
                        <MarkdownRenderer content={set.solution} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SolverSetView;
