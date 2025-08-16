import { GoogleGenAI, Type, GenerateContentResponse, Part } from "@google/genai";
import { Outline, Chapter, Language } from '../types';

const getAI = (apiKey: string) => new GoogleGenAI({ apiKey });

const tryParseJson = <T,>(jsonString: string, fallback: T): T => {
  try {
    // 1. Remove markdown fences and trim whitespace
    let cleanedString = jsonString.replace(/```json|```/g, '').trim();
    // 2. Attempt to remove trailing commas from objects and arrays which are invalid in JSON.
    // This regex finds a comma that is followed by whitespace and then a closing bracket or brace.
    cleanedString = cleanedString.replace(/,(\s*[\}\]])/g, '$1');
    return JSON.parse(cleanedString);
  } catch (error) {
    console.error("JSON parsing error:", error);
    // Log the problematic string to help with debugging in the future.
    console.error("Original string that failed parsing:", jsonString);
    return fallback;
  }
};

export const generateOutline = async (apiKey: string, topic: string, numChapters: number, language: Language): Promise<Outline | null> => {
  const ai = getAI(apiKey);
  // Stricter prompt to reduce the likelihood of malformed JSON.
  const prompt = `Generate a course outline for a subject titled "${topic}" with ${numChapters} chapters. For each chapter, provide a concise title and a list of 5-7 relevant section titles. The outline must be in ${language}. Your entire response must be ONLY a single, valid JSON object with no extra text, explanations, or markdown fences. The structure must be: { "title": "...", "chapters": [ { "title": "...", "sections": ["...", "...", ...] }, ... ] }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });

    // Use the robust tryParseJson to handle potential minor formatting issues from the AI.
    const parsed = tryParseJson(response.text, null);

    // Add a check to ensure the parsed object is valid before proceeding.
    if (!parsed || !parsed.title || !Array.isArray(parsed.chapters)) {
        console.error("Failed to parse outline or the parsed outline has an invalid structure.", parsed);
        return null;
    }

    return {
      ...parsed,
      chapters: parsed.chapters.map((chap: { title: string, sections: string[] }) => ({
        id: crypto.randomUUID(),
        title: chap.title,
        sections: chap.sections.map((secTitle: string) => ({
          id: crypto.randomUUID(),
          title: secTitle,
          content: null,
          images: [],
        })),
        exerciseSets: [],
        solverSets: [],
      })),
      examSets: [],
    };
  } catch (error) {
    console.error("Error generating outline:", error);
    return null;
  }
};

export const generateSectionContent = async (apiKey: string, chapterTitle: string, sectionTitle: string, language: Language): Promise<string> => {
    const ai = getAI(apiKey);
    const prompt = `You are an expert educator. For the section "${sectionTitle}" in the chapter "${chapterTitle}", generate the following content in well-structured Markdown format. The language must be ${language}.
1.  **Learning Content**: A comprehensive explanation of the topic.
2.  **Rules & Formulas**: A clear list of all relevant rules, principles, or formulas.
3.  **Examples**: Provide at least 3 detailed, step-by-step examples.
4.  **Exercises**: Create 3 exercises. Each exercise must have exactly 3 parts (a, b, c).
5.  **Solutions**: Provide full, step-by-step solutions for every part of every exercise immediately after the exercises section.

Important Formatting Rules:
- Use Markdown for all formatting (headings, lists, bold, etc.).
- Enclose ALL mathematical expressions and variables in LaTeX format, using $$...$$ for block equations and $...$ for inline math.
- Format tables using Markdown with professional styling in mind.
- For programming topics, provide full, runnable code examples in code blocks, followed by the expected output.
- For accounting topics, use Markdown tables for financial statements.
- Ensure content is complete and does not cut off.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating section content:", error);
        return "Error: Could not generate content.";
    }
};

const generateExercises = async (apiKey: string, prompt: string) => {
    const ai = getAI(apiKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        exercises: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    problem: { type: Type.STRING },
                                    parts: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                part: { type: Type.STRING },
                                                solution: { type: Type.STRING }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        const jsonText = response.text;
        return tryParseJson(jsonText, { exercises: [] });
    } catch (error) {
        console.error("Error generating exercises:", error);
        return { exercises: [] };
    }
};

export const generateChapterExercises = (apiKey: string, chapter: Chapter, language: Language, focusedIdea?: string) => {
    const sectionTitles = chapter.sections.map(s => s.title).join(', ');
    const prompt = `Generate a set of 10 challenging exercises for a chapter on "${chapter.title}" which covers: ${sectionTitles}. Each exercise must have exactly 4 parts. ${focusedIdea ? `Focus specifically on the concept of "${focusedIdea}".` : ''} For each part, provide both the question and a full, step-by-step solution. The language must be ${language}. Use LaTeX for all math. Structure your response as a JSON object with an "exercises" array. Each exercise object should have "problem" and "parts" fields. The "parts" field should be an array of objects, each with a "part" (the question) and a "solution".`;
    return generateExercises(apiKey, prompt);
};

export const generateExam = (apiKey: string, outline: Outline, language: Language, focusedIdea?: string) => {
    const allTopics = outline.chapters.map(c => `${c.title}: ${c.sections.map(s => s.title).join(', ')}`).join('; ');
    const prompt = `Generate a final exam of 10 exercises covering all topics from the course "${outline.title}". The topics are: ${allTopics}. Each exercise must have exactly 4 parts. ${focusedIdea ? `Focus specifically on the concept of "${focusedIdea}".` : ''} For each part, provide both the question and a full, step-by-step solution. The language must be ${language}. Use LaTeX for all math. Structure your response as a JSON object with an "exercises" array. Each exercise object should have "problem" and "parts" fields. The "parts" field should be an array of objects, each with a "part" (the question) and a "solution".`;
    return generateExercises(apiKey, prompt);
};


export const solveWithAI = async (apiKey: string, language: Language, textPrompt: string, imageBase64?: string): Promise<string> => {
  const ai = getAI(apiKey);
  const prompt = `You are an expert problem solver. Here is an exercise. Provide a full, step-by-step solution in ${language}. Explain your reasoning clearly. Use LaTeX for all mathematical notation. The exercise is: "${textPrompt}"`;

  const parts: Part[] = [{ text: prompt }];

  if (imageBase64) {
    parts.unshift({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts }],
        config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text;
  } catch (error) {
    console.error("Error solving with AI:", error);
    return "Error: Could not get a solution.";
  }
};


export const extractTopicsFromText = async (apiKey: string, text: string): Promise<string[]> => {
    const ai = getAI(apiKey);
    const prompt = `Analyze the following text and extract the main educational topics or section titles from it. List them clearly. Do not provide summaries, just the titles. Respond ONLY with a valid JSON object in the following structure: { "topics": ["...", "...", ...] }`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{text: prompt}, {text: `\n\nText to analyze:\n${text}`}] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topics: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    }
                },
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        const result = tryParseJson(response.text, { topics: [] });
        return result.topics;
    } catch (error) {
        console.error("Error extracting topics:", error);
        return [];
    }
};

export const generateImage = async (apiKey: string, sectionTitle: string, focusedIdea?: string): Promise<string | null> => {
    const ai = getAI(apiKey);
    const prompt = `Create a clear and simple educational image for a student learning about "${sectionTitle}". ${focusedIdea ? `The image should specifically focus on illustrating "${focusedIdea}".` : ''} The style should be like a textbook illustration or a simple diagram. Use clear, easy-to-read English words and numbers if needed. The image should be visually appealing and helpful for learning.`;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });
        return response.generatedImages[0].image.imageBytes;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
};