import React, { useState, useCallback } from 'react';
import { Outline, ExerciseSet, Chapter } from '../types';
import ChapterView from './ChapterView';
import ExerciseSetView from './ExerciseSetView';
import Modal from './Modal';
import Spinner from './Spinner';
import { generateExam } from '../services/geminiService';
import { triggerMathJaxTypeset } from '../hooks/useMathJax';
import { BookOpen, FileDown, Plus, Youtube, RefreshCw } from 'lucide-react';

declare const jspdf: any;
declare const html2canvas: any;

interface OutlineViewProps {
    outline: Outline;
    setOutline: (updater: (prev: Outline | null) => Outline | null) => void;
    apiKey: string;
    language: string;
}

const OutlineView: React.FC<OutlineViewProps> = ({ outline, setOutline, apiKey, language }) => {
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [focusedIdea, setFocusedIdea] = useState('');

    const updateChapter = useCallback((chapterId: string, updater: (prevChapter: Chapter) => Chapter) => {
        setOutline(prevOutline => {
            if (!prevOutline) return null;
            return {
                ...prevOutline,
                chapters: prevOutline.chapters.map(c => c.id === chapterId ? updater(c) : c)
            }
        });
    }, [setOutline]);


    const handleGenerateExam = async (idea: string) => {
        setIsLoading(p => ({ ...p, exam: true }));
        const data = await generateExam(apiKey, outline, language as any, idea);
        if (data.exercises) {
            const newSet: ExerciseSet = { id: crypto.randomUUID(), focusedIdea: idea, exercises: data.exercises };
            setOutline(prev => prev ? ({ ...prev, examSets: [...prev.examSets, newSet] }) : null);
            triggerMathJaxTypeset();
        }
        setIsLoading(p => ({ ...p, exam: false }));
        setIsModalOpen(false);
        setFocusedIdea('');
    };
    
    const handlePrintPdf = async () => {
        setIsLoading(p => ({ ...p, pdf: true }));
        const content = document.getElementById('printable-outline');
        if (!content) {
            setIsLoading(p => ({ ...p, pdf: false }));
            return;
        }
    
        const style = document.createElement('style');
        style.id = 'print-styles';
        style.innerHTML = `
            #printable-outline pre {
                overflow-x: visible !important;
                white-space: pre-wrap !important;
                word-break: break-all !important;
            }
        `;
        document.head.appendChild(style);
    
        const detailsElements = Array.from(content.querySelectorAll('details'));
        const originalOpenState = detailsElements.map(d => d.open);
        detailsElements.forEach(d => d.open = true);
    
        await new Promise(resolve => setTimeout(resolve, 500));
    
        try {
            const canvas = await html2canvas(content, {
                scale: 2,
                useCORS: true,
                logging: false,
            });
    
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'pt', 'a4');
            
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
            let heightLeft = imgHeight;
            let position = 0;
    
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            heightLeft -= pageHeight;
    
            while (heightLeft > 0) {
                position -= pageHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save(`${outline.title.replace(/ /g, '_')}_Course.pdf`);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("An error occurred while generating the PDF. Please try again.");
        } finally {
            document.head.removeChild(style);
            detailsElements.forEach((d, i) => d.open = originalOpenState[i]);
            setIsLoading(p => ({ ...p, pdf: false }));
        }
    };

    const youTubeSearchLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(outline.title + ' course')}`;

    return (
        <div id="printable-outline">
            <div className="flex flex-wrap justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-1">{outline.title}</h1>
                    <a href={youTubeSearchLink} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center text-sm">
                        <Youtube size={16} className="mr-2" /> Find on YouTube
                    </a>
                </div>
                <button
                    onClick={handlePrintPdf}
                    disabled={isLoading.pdf}
                    className="flex items-center mt-2 sm:mt-0 px-4 py-2 text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400"
                >
                    {isLoading.pdf ? <Spinner /> : <FileDown size={16} className="mr-2" />}
                    {isLoading.pdf ? "Generating..." : "Export as PDF"}
                </button>
            </div>

            <div className="space-y-6">
                {outline.chapters.map((chapter) => (
                    <ChapterView
                        key={chapter.id}
                        chapter={chapter}
                        apiKey={apiKey}
                        language={language}
                        updateChapter={updateChapter}
                    />
                ))}
            </div>

            <div className="mt-12">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <BookOpen size={24} className="mr-3 text-indigo-500" /> Final Exam Practice
                </h2>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-lg p-6">
                    {outline.examSets.map(set => (
                        <ExerciseSetView
                            key={set.id}
                            set={set}
                            onDelete={id => setOutline(prev => prev ? ({ ...prev, examSets: prev.examSets.filter(s => s.id !== id) }) : null)}
                        />
                    ))}
                    <div className="mt-4 flex space-x-2">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus size={16} className="mr-2" /> Generate New Exam Set
                        </button>
                         <button
                            onClick={() => handleGenerateExam('')}
                            disabled={isLoading.exam}
                            className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                            title="Generate a new exam without a specific focus"
                        >
                            {isLoading.exam ? <Spinner size="h-4 w-4"/> : <RefreshCw size={16} />}
                        </button>
                    </div>
                </div>
            </div>
            
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Exam Set">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Optionally provide a specific topic to focus the exam questions on.</p>
                    <input
                        type="text"
                        value={focusedIdea}
                        onChange={(e) => setFocusedIdea(e.target.value)}
                        placeholder="e.g., Advanced Calculus Concepts"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500"
                    />
                    <button
                        onClick={() => handleGenerateExam(focusedIdea)}
                        disabled={isLoading.exam}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isLoading.exam ? <Spinner /> : 'Generate Exam'}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default OutlineView;