// FILE: components/Blackboard.tsx
// --------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from 'react';
import { Quiz, GeneratedDiagram } from '../types';

interface BlackboardProps {
  content: string;
  fullLesson: string;
  thoughts: string;
  isWriting: boolean;
  topic?: string;
  quiz?: Quiz | null;
  diagram?: GeneratedDiagram | null;
  // REMOVED: onOverflow prop is no longer needed
  onCloseQuiz?: () => void;
  onCloseDiagram?: () => void;
  onQuizComplete?: (result: any) => void;
}

const Blackboard: React.FC<BlackboardProps> = ({ 
  content, fullLesson, thoughts, isWriting, topic, quiz, diagram,
  onCloseQuiz, onCloseDiagram, onQuizComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const thoughtRef = useRef<HTMLDivElement>(null);
  const lessonLogRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null); // New ref for auto-scrolling
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auto-scroll thoughts and lesson log
  useEffect(() => { if (thoughtRef.current) thoughtRef.current.scrollTop = thoughtRef.current.scrollHeight; }, [thoughts]);
  useEffect(() => { if (lessonLogRef.current) lessonLogRef.current.scrollTop = lessonLogRef.current.scrollHeight; }, [fullLesson]);

  // NEW: Auto-scroll the main blackboard text
  useEffect(() => {
    if (bottomRef.current && isWriting) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [content, isWriting]);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 min-h-0 relative flex gap-4 overflow-hidden">
      
      {/* Sidebar Toggle */}
      <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute left-6 top-1/2 -translate-y-1/2 z-[60] w-8 h-32 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all">
        <div className={`transition-transform duration-500 ${isSidebarCollapsed ? '' : 'rotate-180'}`}>
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        </div>
      </button>

      {/* Sidebars (Thoughts & Logs) */}
      <div className={`shrink-0 flex flex-col h-full gap-4 transition-all duration-500 ${isSidebarCollapsed ? 'w-0 opacity-0 -ml-4' : 'w-80 opacity-100'}`}>
        <div className="flex-1 flex flex-col bg-green-500/5 rounded-xl border-2 border-green-500/10 p-4 backdrop-blur-sm overflow-hidden">
          <span className="marker-font text-[10px] text-white/40 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Internal Thoughts</span>
          <div ref={thoughtRef} className="flex-1 overflow-y-auto scrollbar-hide text-[11px] text-yellow-100/30 handwritten italic space-y-2">{thoughts || "Planning instruction..."}</div>
        </div>
        <div className="flex-1 flex flex-col bg-white/5 rounded-xl border-2 border-white/5 p-4 backdrop-blur-sm overflow-hidden">
          <span className="marker-font text-[10px] text-green-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-2">Transcript Log</span>
          <div ref={lessonLogRef} className="flex-1 overflow-y-auto scrollbar-hide text-[13px] text-white/40 handwritten space-y-2">{fullLesson || "Listening..."}</div>
        </div>
      </div>

      {/* Main Blackboard Area */}
      <div className="chalk-board flex-1 rounded-xl border-8 border-[#3d2b1f] relative overflow-hidden flex flex-col p-8 bg-[#1e3a2f] shadow-2xl">
        <div className="absolute top-4 left-0 right-0 flex justify-center opacity-10 pointer-events-none marker-font text-white text-2xl uppercase">{topic || "Classroom"}</div>
        
        {/* Diagram Overlay */}
        {diagram && !quiz && (
          <div className="absolute right-8 top-12 bottom-20 w-[42%] z-30 animate-fade-in flex flex-col">
            <div className="flex justify-between items-center mb-2 px-2 bg-black/20 rounded-t-lg">
                <span className="marker-font text-[10px] text-yellow-400/80 uppercase">{diagram.topic}</span>
                <button onClick={onCloseDiagram} className="text-white/40 hover:text-white">×</button>
            </div>
            <div className="flex-1 relative bg-white/90 rounded-b-lg overflow-hidden flex items-center justify-center p-2">
                <img 
                    src={diagram.url} 
                    className="max-w-full max-h-full object-contain mix-blend-multiply brightness-110 contrast-125" 
                    alt={diagram.topic} 
                />
            </div>
          </div>
        )}

        {/* Quiz Overlay */}
        {quiz && (
          <div className="absolute inset-0 z-40 bg-[#1e3a2f]/98 backdrop-blur-md p-8 overflow-y-auto flex flex-col items-center">
            <div className="w-full max-w-2xl text-center space-y-8">
              <h2 className="marker-font text-3xl text-yellow-400">{quiz.title}</h2>
              <div className="text-left space-y-8">
                {quiz.questions.map((q, i) => (
                  <div key={i} className="space-y-3">
                    <p className="handwritten text-2xl text-white">{i + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <button key={oi} className="text-left px-4 py-2 rounded-xl border border-white/10 bg-white/5 handwritten text-xl text-white/70 hover:bg-white/10 transition-all">{opt}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={onCloseQuiz} className="w-full py-4 bg-yellow-400 text-black font-bold rounded-2xl marker-font">Resume Lesson</button>
            </div>
          </div>
        )}

        {/* Text Container - CHANGED: overflow-y-auto enables scrolling, scrollbar-hide hides the bar */}
        <div ref={containerRef} className={`flex-1 relative overflow-y-auto scrollbar-hide transition-opacity ${quiz ? 'opacity-0' : 'opacity-100'}`}>
          <div ref={textRef} className={`handwritten text-white leading-relaxed whitespace-pre-wrap transition-all pb-10 ${diagram ? 'pr-[45%] text-2xl md:text-3xl' : 'text-4xl md:text-5xl px-8'}`}>
            {content}
            {isWriting && <span className="inline-block w-2 h-10 bg-white/60 ml-1 animate-pulse" />}
            {/* Invisible anchor for scrolling */}
            <div ref={bottomRef} className="h-2 w-full" /> 
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blackboard;