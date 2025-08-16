
import React, { useState, useCallback } from 'react';
import { Outline, Language, Languages } from './types';
import { generateOutline } from './services/geminiService';
import OutlineView from './components/OutlineView';
import { LanguagesIcon } from 'lucide-react';

const ApiKeyInput: React.FC<{ onApiKeySubmit: (key: string) => void }> = ({ onApiKeySubmit }) => {
    const [key, setKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onApiKeySubmit(key.trim());
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Course Architect</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Enter your Google Gemini API Key to begin.</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="api-key" className="sr-only">Gemini API Key</label>
                            <input
                                id="api-key"
                                name="api-key"
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Gemini API Key"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Start Creating
                        </button>
                    </div>
                </form>
                 <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                    Your API key is stored only in your browser and is never sent to our servers.
                </p>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [outline, setOutline] = useState<Outline | null>(null);
    const [topic, setTopic] = useState<string>('');
    const [numChapters, setNumChapters] = useState<number>(5);
    const [language, setLanguage] = useState<Language>('English');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateOutline = useCallback(async () => {
        if (!apiKey || !topic) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await generateOutline(apiKey, topic, numChapters, language);
            if (result) {
                setOutline(result);
            } else {
                setError('Failed to generate outline. Please check your API key and try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, topic, numChapters, language]);

    const handleReset = () => {
        setOutline(null);
        setTopic('');
        setError(null);
    }
    
    if (!apiKey) {
        return <ApiKeyInput onApiKeySubmit={setApiKey} />;
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-wrap justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 dark:text-white">AI Course Architect</h1>
                    <div className="flex items-center space-x-4">
                       <div className="relative">
                            <LanguagesIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as Language)}
                                className="pl-10 pr-4 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {Languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                       </div>
                        {outline && (
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                New Outline
                            </button>
                        )}
                    </div>
                </header>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                        <strong className="font-bold">Error: </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {!outline ? (
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course Topic</label>
                                <input
                                    type="text"
                                    id="topic"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g., Introduction to Quantum Physics"
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label htmlFor="chapters" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Chapters</label>
                                <input
                                    type="number"
                                    id="chapters"
                                    value={numChapters}
                                    onChange={(e) => setNumChapters(Number(e.target.value))}
                                    min="1"
                                    max="20"
                                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="mt-6">
                            <button
                                onClick={handleGenerateOutline}
                                disabled={isLoading || !topic}
                                className="w-full inline-flex justify-center py-3 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Generating...
                                    </>
                                ) : 'Generate Outline'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <OutlineView 
                      outline={outline} 
                      setOutline={setOutline} 
                      apiKey={apiKey} 
                      language={language} 
                    />
                )}
            </div>
        </div>
    );
};

export default App;
