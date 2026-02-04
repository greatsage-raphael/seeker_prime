// FILE: types.ts
// --------------------------------------------------------------------------

export enum TeacherStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  TEACHING = 'TEACHING',
  ERROR = 'ERROR'
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export interface GeneratedDiagram {
  url: string;
  topic: string;
}

export interface Message {
  role: 'user' | 'teacher';
  text: string;
  timestamp: number;
}

export interface BlackboardState {
  currentText: string;
  history: string[];
}
