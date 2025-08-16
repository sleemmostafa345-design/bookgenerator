import React from 'react';
import { ExerciseSet } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { Trash2, Pin } from 'lucide-react';

interface ExerciseSetViewProps {
    set: ExerciseSet;
    onDelete: (setId: string) => void;
}

const ExerciseSetView: React.FC<ExerciseSetViewProps> = ({ set, onDelete }) => {
    return (
        <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                {set.focusedIdea ? (
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center">
                        <Pin size={16} className="mr-2" />
                        Focused on: {set.focusedIdea}
                    </p>
                ) : <div />}
                <button onClick={() => onDelete(set.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400">
                    <Trash2 size={18} />
                </button>
            </div>
            {set.exercises.map((ex, index) => (
                <div key={index} className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div className="font-bold mb-2">Exercise {index + 1}:</div>
                    <MarkdownRenderer content={ex.problem} />
                    <div className="mt-4 space-y-3">
                        {ex.parts.map((part, partIndex) => (
                            <div key={partIndex} className="bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm">
                                <div className="font-semibold text-gray-800 dark:text-gray-200">
                                    Part {String.fromCharCode(97 + partIndex)}: <MarkdownRenderer content={part.part} inline />
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <p className="font-semibold text-green-700 dark:text-green-400">Solution:</p>
                                    <MarkdownRenderer content={part.solution} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ExerciseSetView;