import React, { useState } from 'react';
import { Section, GeneratedImage } from '../types';
import { generateSectionContent, generateImage } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';
import Spinner from './Spinner';
import Modal from './Modal';
import { triggerMathJaxTypeset } from '../hooks/useMathJax';
import { BrainCircuit, Image, ChevronDown, ChevronUp } from 'lucide-react';

interface SectionViewProps {
    section: Section;
    chapterTitle: string;
    apiKey: string;
    language: string;
    updateSection: (sectionId: string, updater: (prevSection: Section) => Section) => void;
}

const SectionView: React.FC<SectionViewProps> = ({ section, chapterTitle, apiKey, language, updateSection }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [focusedIdea, setFocusedIdea] = useState('');

    const handleGenerateContent = async () => {
        setIsLoading(true);
        const content = await generateSectionContent(apiKey, chapterTitle, section.title, language as any);
        updateSection(section.id, prevSection => ({ ...prevSection, content }));
        setIsLoading(false);
        setIsOpen(true);
        triggerMathJaxTypeset();
    };

    const handleGenerateImage = async (idea: string) => {
        setIsImageLoading(true);
        const base64Image = await generateImage(apiKey, section.title, idea);
        if (base64Image) {
            const newImage: GeneratedImage = {
                id: crypto.randomUUID(),
                base64: `data:image/jpeg;base64,${base64Image}`,
                prompt: idea || section.title,
            };
            updateSection(section.id, prevSection => ({ 
                ...prevSection, 
                images: [...prevSection.images, newImage] 
            }));
            triggerMathJaxTypeset();
        }
        setIsImageLoading(false);
        setFocusedIdea('');
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-medium text-gray-800 dark:text-gray-200"
            >
                <span>{section.title}</span>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {isOpen && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    {section.content === null && !isLoading && (
                        <button
                            onClick={handleGenerateContent}
                            className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            <BrainCircuit size={18} className="mr-2" /> Generate Content
                        </button>
                    )}
                    {isLoading && <div className="flex items-center"><Spinner variant="dark" /><span className="ml-2">Generating content...</span></div>}
                    {section.content && <MarkdownRenderer content={section.content} />}

                    <div className="mt-6">
                        <h4 className="font-semibold text-lg mb-2">AI Generated Images</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                            {section.images.map(img => (
                                <div key={img.id} className="group relative">
                                    <img src={img.base64} alt={img.prompt} className="rounded-lg shadow-md aspect-square object-cover" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg">
                                        {img.prompt}
                                    </div>
                                </div>
                            ))}
                        </div>
                         <button
                            onClick={() => setIsModalOpen(true)}
                            disabled={isImageLoading}
                            className="flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400"
                        >
                            {isImageLoading ? <Spinner /> : <Image size={18} className="mr-2" />}
                            {isImageLoading ? 'Generating...' : 'Generate New Image'}
                        </button>
                    </div>
                </div>
            )}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Generate Image">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Optionally provide a specific idea or concept to focus on for the image related to "{section.title}".</p>
                    <input
                        type="text"
                        value={focusedIdea}
                        onChange={(e) => setFocusedIdea(e.target.value)}
                        placeholder="e.g., Photosynthesis diagram"
                        className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500"
                    />
                    <button
                        onClick={() => {
                            handleGenerateImage(focusedIdea);
                            setIsModalOpen(false);
                        }}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
                    >
                        Generate
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default SectionView;
