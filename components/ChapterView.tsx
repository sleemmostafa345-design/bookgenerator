import React, { useState, useRef, useCallback } from 'react';
import { Chapter, Section, ExerciseSet, SolverSet } from '../types';
import SectionView from './SectionView';
import ExerciseSetView from './ExerciseSetView';
import SolverSetView from './SolverSetView';
import Modal from './Modal';
import Spinner from './Spinner';
import { generateChapterExercises, solveWithAI, extractTopicsFromText } from '../services/geminiService';
import { extractTextFromPdf } from '../utils/pdf';
import { triggerMathJaxTypeset } from '../hooks/useMathJax';
import { ChevronDown, ChevronUp, Youtube, Plus, BookText, Bot, Upload, FileText, RefreshCw } from 'lucide-react';

interface ChapterViewProps {
    chapter: Chapter;
    apiKey: string;
    language: string;
    updateChapter: (chapterId: string, updater: (prevChapter: Chapter) => Chapter) => void;
}

const ChapterView: React.FC<ChapterViewProps> = ({ chapter, apiKey, language, updateChapter }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
    const [modal, setModal] = useState<string | null>(null);
    const [focusedIdea, setFocusedIdea] = useState('');
    const [solverText, setSolverText] = useState('');
    const [solverImage, setSolverImage] = useState<string | null>(null);
    const [extractedTopics, setExtractedTopics] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const updateSection = useCallback((sectionId: string, updater: (prevSection: Section) => Section) => {
        updateChapter(chapter.id, prevChapter => ({
            ...prevChapter,
            sections: prevChapter.sections.map(s => s.id === sectionId ? updater(s) : s)
        }));
    }, [chapter.id, updateChapter]);

    const handleAction = async (action: string, generator: () => Promise<any>, updater: (data: any) => Partial<Chapter>) => {
        setIsLoading(prev => ({...prev, [action]: true }));
        const result = await generator();
        if (result) {
            updateChapter(chapter.id, prevChapter => ({ ...prevChapter, ...updater(result) }));
            triggerMathJaxTypeset();
        }
        setIsLoading(prev => ({...prev, [action]: false }));
        setModal(null);
        setFocusedIdea('');
    };

    const handleGenerateExercises = (idea: string) => handleAction(
        'exercises',
        () => generateChapterExercises(apiKey, chapter, language as any, idea),
        (data) => ({
            exerciseSets: [...chapter.exerciseSets, { id: crypto.randomUUID(), focusedIdea: idea, exercises: data.exercises }]
        })
    );

    const handleSolverSubmit = () => handleAction(
        'solver',
        () => solveWithAI(apiKey, language as any, solverText, solverImage?.split(',')[1]),
        (solution) => ({
            solverSets: [...chapter.solverSets, {
                id: crypto.randomUUID(),
                userInput: { type: solverImage ? 'image' : 'text', content: solverImage || solverText },
                solution
            }]
        })
    ).then(() => { setSolverImage(null); setSolverText(''); });
    
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const MAX_FILE_SIZE_MB = 4;
            const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE_BYTES) {
                alert(`File is too large. Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => setSolverImage(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const processAndExtractTopics = async (text: string) => {
        setIsLoading(p => ({ ...p, topicExtraction: true }));
        const topics = await extractTopicsFromText(apiKey, text);
        setExtractedTopics(topics);
        setIsLoading(p => ({ ...p, topicExtraction: false }));
    };
    
    const handleTextExtraction = async () => {
        await processAndExtractTopics(solverText);
    };
    
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsLoading(p => ({ ...p, pdfParse: true }));
            const text = await extractTextFromPdf(file);
            await processAndExtractTopics(text);
            setIsLoading(p => ({ ...p, pdfParse: false }));
        }
    };
    
    const addTopicsAsSections = (topics: string[]) => {
        const newSections: Section[] = topics.map(title => ({
            id: crypto.randomUUID(), title, content: null, images: []
        }));
        updateChapter(chapter.id, prevChapter => ({ ...prevChapter, sections: [...prevChapter.sections, ...newSections] }));
        setExtractedTopics([]);
        setModal(null);
    };

    const youTubeSearchLink = `https://www.youtube.com/results?search_query=${encodeURIComponent(chapter.title + ' playlist')}`;

    return (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl shadow-lg mb-6 transition-all duration-300">
            <h2 className="text-2xl font-bold p-6 cursor-pointer flex justify-between items-center" onClick={() => setIsOpen(!isOpen)}>
                <span>{chapter.title}</span>
                <div className="flex items-center space-x-4">
                    <a href={youTubeSearchLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
                        <Youtube size={28} />
                    </a>
                    {isOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
            </h2>

            {isOpen && (
                <div className="px-6 pb-6">
                    <div className="space-y-2 mb-8">
                        {chapter.sections.map(section => (
                            <SectionView key={section.id} section={section} chapterTitle={chapter.title} apiKey={apiKey} language={language} updateSection={updateSection} />
                        ))}
                    </div>

                    <div className="space-y-6">
                        {/* Chapter Exercises */}
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Chapter Exercises</h3>
                            {chapter.exerciseSets.map(set => <ExerciseSetView key={set.id} set={set} onDelete={id => updateChapter(chapter.id, p => ({ ...p, exerciseSets: p.exerciseSets.filter(s => s.id !== id) }))} />)}
                            <div className="mt-4 flex space-x-2">
                                <button onClick={() => setModal('exercises')} className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                    <Plus size={16} className="mr-2" /> Generate New Set
                                </button>
                                <button
                                    onClick={() => handleGenerateExercises('')}
                                    disabled={isLoading.exercises}
                                    className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                                    title="Generate a new set without a specific focus"
                                >
                                    {isLoading.exercises ? <Spinner size="h-4 w-4" /> : <RefreshCw size={16} />}
                                </button>
                            </div>
                        </div>
                        
                        {/* AI Solver */}
                        <div>
                            <h3 className="text-xl font-semibold mb-2">AI Problem Solver</h3>
                             {chapter.solverSets.map(set => <SolverSetView key={set.id} set={set} onDelete={id => updateChapter(chapter.id, p => ({ ...p, solverSets: p.solverSets.filter(s => s.id !== id) }))} />)}
                            <button onClick={() => setModal('solver')} className="mt-4 flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                                <Bot size={16} className="mr-2" /> Solve New Problem
                            </button>
                        </div>

                        {/* Topic Extractor */}
                        <div>
                            <h3 className="text-xl font-semibold mb-2">Add Sections via Topic Extraction</h3>
                             <div className="flex space-x-2">
                                <button onClick={() => setModal('extract-pdf')} className="mt-4 flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                                    <FileText size={16} className="mr-2" /> From PDF
                                </button>
                                <button onClick={() => setModal('extract-text')} className="mt-4 flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
                                    <BookText size={16} className="mr-2" /> From Text
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modals */}
            <Modal isOpen={modal === 'exercises'} onClose={() => setModal(null)} title="Generate Chapter Exercises">
                <div className="space-y-4">
                    <p>Optionally provide a specific idea to focus the exercises on.</p>
                    <input type="text" value={focusedIdea} onChange={e => setFocusedIdea(e.target.value)} placeholder="e.g., Integration by parts" className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    <button onClick={() => handleGenerateExercises(focusedIdea)} disabled={isLoading.exercises} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        {isLoading.exercises ? <Spinner /> : 'Generate'}
                    </button>
                </div>
            </Modal>
            
            <Modal isOpen={modal === 'solver'} onClose={() => setModal(null)} title="AI Problem Solver">
                <div className="space-y-4">
                    <textarea value={solverText} onChange={e => setSolverText(e.target.value)} placeholder="Type or paste your problem here..." rows={5} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    <div className="text-center my-2 font-semibold text-gray-500">OR</div>
                    <input type="file" accept="image/*" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <Upload size={16} className="mr-2"/> {solverImage ? "Change Image" : "Upload Image"}
                    </button>
                    {solverImage && <img src={solverImage} className="max-w-xs mx-auto rounded-md" />}
                    <button onClick={handleSolverSubmit} disabled={isLoading.solver || (!solverText && !solverImage)} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        {isLoading.solver ? <Spinner /> : 'Solve with AI'}
                    </button>
                </div>
            </Modal>
            
            <Modal isOpen={modal === 'extract-text' || modal === 'extract-pdf'} onClose={() => { setModal(null); setExtractedTopics([]); }} title="Extract Topics to Add as Sections">
                 {extractedTopics.length === 0 ? (
                    <div className="space-y-4">
                        {modal === 'extract-pdf' && (
                            <>
                                <input type="file" accept=".pdf" onChange={handlePdfUpload} ref={pdfInputRef} className="hidden" />
                                <button onClick={() => pdfInputRef.current?.click()} disabled={isLoading.pdfParse} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    {isLoading.pdfParse ? <Spinner /> : <><Upload size={16} className="mr-2"/> Upload PDF</>}
                                </button>
                            </>
                        )}
                        {modal === 'extract-text' && (
                           <>
                             <textarea value={solverText} onChange={e => setSolverText(e.target.value)} placeholder="Paste text containing topics..." rows={8} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                             <button onClick={handleTextExtraction} disabled={isLoading.topicExtraction || !solverText} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                                {isLoading.topicExtraction ? <Spinner /> : 'Extract Topics'}
                             </button>
                           </>
                        )}
                    </div>
                 ) : (
                    <div className="space-y-4">
                        <p>Select the topics you want to add as new sections:</p>
                        <div className="max-h-60 overflow-y-auto space-y-2 p-2 border rounded-md">
                            {extractedTopics.map((topic, i) => <div key={i} className="p-2 bg-gray-100 dark:bg-gray-700 rounded">{topic}</div>)}
                        </div>
                        <button onClick={() => addTopicsAsSections(extractedTopics)} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">Add Selected Topics</button>
                    </div>
                 )}
            </Modal>
        </div>
    );
};

export default ChapterView;