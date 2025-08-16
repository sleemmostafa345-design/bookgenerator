
export interface GeneratedImage {
  id: string;
  base64: string;
  prompt: string;
}

export interface ExercisePart {
  part: string;
  solution: string;
}

export interface ExerciseSet {
  id: string;
  focusedIdea?: string;
  exercises: {
    problem: string;
    parts: ExercisePart[];
  }[];
}

export interface SolverSet {
  id:string;
  userInput: {
    type: 'text' | 'image';
    content: string; // text or base64 image
  };
  solution: string;
}

export interface Section {
  id: string;
  title: string;
  content: string | null;
  images: GeneratedImage[];
}

export interface Chapter {
  id: string;
  title: string;
  sections: Section[];
  exerciseSets: ExerciseSet[];
  solverSets: SolverSet[];
}

export interface Outline {
  title: string;
  chapters: Chapter[];
  examSets: ExerciseSet[];
}

export type Language = 'English' | 'Arabic' | 'French' | 'Spanish' | 'German' | 'Chinese';

export const Languages: Language[] = ['English', 'Arabic', 'French', 'Spanish', 'German', 'Chinese'];
