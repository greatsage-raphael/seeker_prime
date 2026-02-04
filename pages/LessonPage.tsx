// FILE: pages/LessonPage.tsx
// --------------------------------------------------------------------------

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from '@google/genai';
import { useUser, UserButton } from '@clerk/clerk-react';
import Blackboard from '../components/Blackboard';
import { TeacherStatus, Quiz, GeneratedDiagram } from '../types';
import { decodeAudioData, createBlob, decode } from '../utils/audio';
import { supabase } from '../src/lib/supabase';
import { awardXP, checkDeepDiver, checkFirstStep, checkNightScholar } from '@/src/lib/gamification';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';
const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';

// --- Tools Configuration ---

const createQuizFn: FunctionDeclaration = {
  name: 'create_quiz',
  parameters: {
    type: Type.OBJECT,
    description: 'Generate an interactive multiple-choice quiz based on the lesson content.',
    properties: {
      title: { type: Type.STRING },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswerIndex: { type: Type.NUMBER }
          },
          required: ['question', 'options', 'correctAnswerIndex']
        }
      }
    },
    required: ['title', 'questions']
  }
};

const generateDiagramFn: FunctionDeclaration = {
  name: 'generate_educational_diagram',
  parameters: {
    type: Type.OBJECT,
    description: 'Use Nano Banana Pro to create a high-fidelity educational diagram for the chalkboard.',
    properties: {
      description: { type: Type.STRING, description: 'Detailed description. Request isolated cutout on solid pure white background.' },
      topic: { type: Type.STRING, description: 'The specific subject being illustrated.' }
    },
    required: ['description', 'topic']
  }
};

const searchAcademicPapersFn: FunctionDeclaration = {
  name: 'search_academic_papers',
  parameters: {
    type: Type.OBJECT,
    description: 'Deep search for academic papers, PDFs, and peer-reviewed studies.',
    properties: { query: { type: Type.STRING } },
    required: ['query']
  }
};

// --- Helper Functions ---

const base64ToBlob = (base64: string, contentType: string) => {
  const base64String = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64String);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
  return new Blob([byteNumbers], { type: contentType });
};

// --- Component ---

const LessonPage: React.FC = () => {
  const { lessonId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();

  // State
  const [status, setStatus] = useState<TeacherStatus>(TeacherStatus.IDLE);
  const [boardContent, setBoardContent] = useState('');
  const [fullLesson, setFullLesson] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [currentDiagram, setCurrentDiagram] = useState<GeneratedDiagram | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sources, setSources] = useState<any[]>([]);

  // Context State
  const [loadingContext, setLoadingContext] = useState(true);
  const [lessonContext, setLessonContext] = useState<{
    type: 'impromptu' | 'structured';
    title: string;
    courseTitle?: string;
    moduleTitle?: string;
    objectives?: string[];
  } | null>(null);

  // Refs
  const sessionRef = useRef<any>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const keepaliveIntervalRef = useRef<number | null>(null);

  // Interrupt Handling
  const userSpeakingRef = useRef(false); // Can likely be removed now, but keeping for state tracking if needed
  
  // Accumulators for saving
  const transcriptAccumulator = useRef("");
  const thoughtAccumulator = useRef("");
  const base64ImagesQueue = useRef<string[]>([]);

  // 1. Data Fetching / Context Setup
  useEffect(() => {
    const fetchContext = async () => {
      if (!lessonId) return;

      // Case A: Impromptu (Topic passed via router state)
      if (state?.topic) {
        setLessonContext({
          type: 'impromptu',
          title: state.topic
        });
        setLoadingContext(false);
        return;
      }

      // Case B: Structured (Fetch from DB)
      try {
        const { data, error } = await supabase
          .from('lesson_plans')
          .select(`
            title,
            learning_objectives,
            modules (
              title,
              courses (
                title,
                description
              )
            )
          `)
          .eq('id', lessonId)
          .single();

        if (error || !data) {
          console.error("Lesson plan not found:", error);
          navigate('/'); // Fallback
          return;
        }

        const moduleData = Array.isArray(data.modules) ? data.modules[0] : data.modules;
        const courseData = Array.isArray(moduleData?.courses) ? moduleData.courses[0] : moduleData?.courses;

        setLessonContext({
          type: 'structured',
          title: data.title,
          moduleTitle: moduleData?.title,
          courseTitle: courseData?.title,
          objectives: data.learning_objectives
        });
      } catch (err) {
        console.error("Context fetch error:", err);
      } finally {
        setLoadingContext(false);
      }
    };

    fetchContext();
  }, [lessonId, state, navigate]);

  // 2. Audio Cleanup & Interaction Handling
  const clearAudioQueue = useCallback(() => {
    console.log('🛑 Clearing audio queue - Interruption Detected');
    
    // Stop all audio
    sourcesRef.current.forEach(source => {
      try { source.stop(); source.disconnect(); } catch (e) { }
    });
    sourcesRef.current.clear();
    
    // Reset output timing
    if (outputAudioCtxRef.current) {
      nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
    
    // UX: Wipe the board on interruption
    setBoardContent(''); 
    
    setIsWriting(false);
  }, []);

  // 3. Stop & Save Session
  const stopSession = useCallback(async () => {
    if (keepaliveIntervalRef.current) {
      clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }

    setIsSaving(true);

    if (user && (transcriptAccumulator.current || thoughtAccumulator.current)) {
      const finalUrls: string[] = [];
      
      // A. Upload generated images
      for (const b64 of base64ImagesQueue.current) {
        try {
          const blob = base64ToBlob(b64, 'image/jpeg');
          const path = `${user.id}/${lessonId}_${Math.random().toString(36).substring(7)}.jpg`;
          const { error: upErr } = await supabase.storage.from('seeker').upload(path, blob);
          if (!upErr) {
            const { data: { publicUrl } } = supabase.storage.from('seeker').getPublicUrl(path);
            finalUrls.push(publicUrl);
          }
        } catch (e) { console.error("Image upload failed:", e); }
      }

      // B. Save Lesson
      await supabase.from('lessons').insert({
        lesson_id: lessonId,
        student_id: user.id,
        title: lessonContext?.title || "Untitled Lesson",
        lesson_summary: transcriptAccumulator.current,
        thoughts: thoughtAccumulator.current,
        lesson_images: finalUrls
      });

      // C. Gamification
      try {
        await awardXP(user.id, 50); 
        await checkNightScholar(user.id);
        await checkFirstStep(user.id);
        await checkDeepDiver(user.id);
      } catch (err) { console.error("Gamification error:", err); }
    }

    if (sessionRef.current) try { sessionRef.current.close(); } catch (e) { }
    sessionRef.current = null;
    sessionPromiseRef.current = null;

    [inputAudioCtxRef, outputAudioCtxRef].forEach(ref => {
      if (ref.current && ref.current.state !== 'closed') ref.current.close();
      ref.current = null;
    });

    setIsWriting(false);

    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

    setTimeout(() => navigate(`/notes/${lessonId}`), 2500);
  }, [user, lessonId, lessonContext, navigate]);

  // 4. Image Generation
  const handleGenerateImage = async (prompt: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const optimizedPrompt = `${prompt}. High-quality professional educational illustration, isolated cutout on a SOLID PURE WHITE BACKGROUND. No shadows.`;
      const response = await ai.models.generateContent({ model: IMAGE_MODEL_NAME, contents: optimizedPrompt });
      const part = response.candidates?.[0].content.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        const b64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        base64ImagesQueue.current.push(b64);
        return b64;
      }
    } catch (err) { console.error("Image Gen Failed:", err); }
    return null;
  };

  // 5. Main AI Logic
  useEffect(() => {
    if (loadingContext || !lessonContext || !user) return;

    const initLesson = async () => {
      try {
        setStatus(TeacherStatus.CONNECTING);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        inputAudioCtxRef.current = new AudioCtx({ sampleRate: 16000 });
        outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });

        // UPDATE: Added constraints for Echo Cancellation to prevent self-interruption
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: { width: 640, height: 480 }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }

        // --- CONTEXT ENGINEERING ---
        let finalSystemInstruction = `You are a friendly, patient, and expert virtual AI teacher named Seeker. 
        Your goal is to teach the user via AUDIO. You cannot see the user, so rely on your voice and the blackboard.
        
        CRITICAL RULES:
        1. Keep responses SHORT (15-30 seconds max) - this is a conversation, not a lecture.
        2. After each short explanation, PAUSE and ask "Does that make sense?" or "Should I continue?".
        3. Listen for interruptions.
        4. NEVER queue long monologues.

        Student Name: ${user.firstName}.
        `;

        let initialUserMessage = "";

        if (lessonContext.type === 'structured') {
          finalSystemInstruction += `
          CONTEXT:
          You are the official instructor for the course: "${lessonContext.courseTitle}".
          Current Module: "${lessonContext.moduleTitle}".
          Lesson Topic: "${lessonContext.title}".
          Learning Objectives: ${lessonContext.objectives?.join(', ')}.

          BEHAVIOR:
          Welcome the student to this specific lesson. 
          Briefly state the goal based on the objectives. 
          Do NOT ask "what do you want to learn today". 
          Begin the lesson material immediately after the welcome.
          `;
          initialUserMessage = `I have arrived in the classroom for the lesson: "${lessonContext.title}". Please introduce today's lesson and begin.`;
        } else {
          finalSystemInstruction += `
          CONTEXT:
          The student has initiated an impromptu session on the topic: "${lessonContext.title}".
          
          BEHAVIOR:
          Ask the student what specific aspect of "${lessonContext.title}" they want to explore, or offer a starting point.
          `;
          initialUserMessage = `I want to learn about "${lessonContext.title}". Please start the class.`;
        }

        const sessionPromise = ai.live.connect({
          model: MODEL_NAME,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: finalSystemInstruction,
            tools: [
              { googleSearch: {} },
              { functionDeclarations: [createQuizFn, generateDiagramFn, searchAcademicPapersFn] }
            ],
            // UPDATE: Removed "Kore" voice config to use default or let model decide, 
            // as some specific voice configs can sometimes cause latency issues. 
            // You can add it back if needed, but simplest is best for debugging.
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            outputAudioTranscription: {},
          },
          callbacks: {
            onopen: () => {
              setStatus(TeacherStatus.TEACHING);

              // Force Speak First
              if (sessionRef.current) {
                console.log("🚀 Sending initial context trigger...");
                sessionRef.current.sendClientContent({
                  turns: [{ role: 'user', parts: [{ text: initialUserMessage }] }],
                  turnComplete: true
                });
              }

              // Audio Input Setup
              const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
              
              // UPDATE: Removed manual Volume calculation logic (average > 20).
              // We now trust Gemini's VAD entirely.
              scriptProcessor.onaudioprocess = (e) => {
                if (sessionRef.current) {
                  try {
                    sessionRef.current.sendRealtimeInput({
                      media: createBlob(e.inputBuffer.getChannelData(0))
                    });
                  } catch (err) {
                     // ignore if session closed
                  }
                }
              };

              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioCtxRef.current!.destination);

              // Keepalive
              keepaliveIntervalRef.current = window.setInterval(() => {
                if (sessionRef.current) {
                  const silentBuffer = new Float32Array(160);
                  try {
                    sessionRef.current.sendRealtimeInput({ media: createBlob(silentBuffer) });
                  } catch (err) { }
                }
              }, 5000);
            },

            onmessage: async (m: any) => {
              // Transcript
              if (m.serverContent?.outputTranscription) {
                const text = m.serverContent.outputTranscription.text;
                transcriptAccumulator.current += text;
                // Append to board
                setBoardContent(p => p + text);
                setFullLesson(p => p + text);
              }

              // Thoughts
              if (m.serverContent?.modelTurn?.parts) {
                for (const p of m.serverContent.modelTurn.parts) {
                  if (p.thought) {
                    thoughtAccumulator.current += p.text;
                    setThoughts(t => t + p.text);
                  }
                }
              }

              // Audio Output
              const audio = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (audio && outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
                
                setIsWriting(true);
                try {
                  const buf = await decodeAudioData(decode(audio), outputAudioCtxRef.current, 24000, 1);
                  const src = outputAudioCtxRef.current.createBufferSource();
                  src.buffer = buf;
                  src.connect(outputAudioCtxRef.current.destination);

                  src.onended = () => {
                    sourcesRef.current.delete(src);
                    if (sourcesRef.current.size === 0) setIsWriting(false);
                  };

                  const now = outputAudioCtxRef.current.currentTime;
                  nextStartTimeRef.current = Math.max(now, nextStartTimeRef.current);
                  src.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buf.duration;
                  sourcesRef.current.add(src);
                } catch (err) { setIsWriting(false); }
              }

              // Tools
              if (m.toolCall) {
                for (const fc of m.toolCall.functionCalls) {
                  setActiveAction(fc.name.replace(/_/g, ' '));

                  if (fc.name === 'create_quiz') {
                    setCurrentQuiz(fc.args as Quiz);
                    if (sessionRef.current) sessionRef.current.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Quiz displayed." } } });
                  }
                  else if (fc.name === 'generate_educational_diagram') {
                    if (sessionRef.current) sessionRef.current.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Generating diagram..." } } });
                    handleGenerateImage(fc.args.description).then(url => {
                      if (url) setCurrentDiagram({ url, topic: fc.args.topic });
                    });
                  }
                  else if (fc.name === 'search_academic_papers') {
                    setSources(prev => [{
                      title: `PAPER: ${fc.args.query}`,
                      uri: `https://scholar.google.com/scholar?q=${encodeURIComponent(fc.args.query)}`,
                      isAcademic: true
                    }, ...prev]);
                    if (sessionRef.current) sessionRef.current.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Sources found." } } });
                  }
                  setTimeout(() => setActiveAction(null), 3000);
                }
              }

              // Server-Side VAD (Interruption Handling)
              // This is the correct way to handle interruptions
              if (m.serverContent?.interrupted) {
                clearAudioQueue();
              }
            },

            onerror: (e) => {
              console.error('Session error:', e);
              setStatus(TeacherStatus.ERROR);
            },

            onclose: () => {
              if (keepaliveIntervalRef.current) {
                clearInterval(keepaliveIntervalRef.current);
                keepaliveIntervalRef.current = null;
              }
            }
          }
        });

        sessionPromiseRef.current = sessionPromise;
        sessionRef.current = await sessionPromise;

      } catch (err) {
        console.error('Init error:', err);
        setStatus(TeacherStatus.IDLE);
      }
    };

    initLesson();

    return () => {
      if (keepaliveIntervalRef.current) clearInterval(keepaliveIntervalRef.current);
      if (sessionRef.current) try { sessionRef.current.close(); } catch (e) { }
    };
  }, [loadingContext, lessonContext, user, clearAudioQueue]);

  if (loadingContext) {
    return (
      <div className="h-screen bg-[#1a1a1a] flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <p className="marker-font text-yellow-400 text-2xl animate-pulse uppercase">Consulting Curriculum...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#1a1a1a] text-white overflow-hidden relative font-sans">
      {isSaving && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center space-y-8 text-center px-4">
          <div className="w-24 h-24 border-8 border-green-500 border-t-transparent rounded-full animate-spin shadow-[0_0_60px_rgba(34,197,94,0.3)]" />
          <div className="space-y-2">
            <h2 className="marker-font text-5xl text-green-500 animate-pulse uppercase tracking-tighter">Archiving Lecture</h2>
            <p className="handwritten text-2xl text-white/40 italic">Seeker is preparing your personal notebook.</p>
          </div>
        </div>
      )}

      {activeAction && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-yellow-400 text-black px-6 py-3 rounded-full font-bold shadow-2xl animate-bounce border-2 border-black text-xs uppercase tracking-widest">
          AI Action: {activeAction}
        </div>
      )}

      <header className="p-4 md:px-8 border-b border-white/10 bg-[#1e1e1e]/50 backdrop-blur-xl z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center border border-white/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest">
              {lessonContext?.type === 'structured' ? `${lessonContext.courseTitle} / ${lessonContext.moduleTitle}` : 'Impromptu Session'}
            </span>
            <h1 className="text-xl font-bold uppercase tracking-tight leading-none text-white">
              {lessonContext?.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={clearAudioQueue}
            className="px-4 py-2 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-yellow-500 hover:text-black transition-all shadow-lg"
          >
            Skip Response
          </button>
          <button onClick={stopSession} className="px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg">End Lesson</button>
          <UserButton />
        </div>
      </header>

      <main className="flex-1 flex flex-col relative bg-[#161616] min-h-0">
        <Blackboard
          content={boardContent}
          fullLesson={fullLesson}
          thoughts={thoughts}
          isWriting={isWriting}
          topic={lessonContext?.title}
          quiz={currentQuiz}
          diagram={currentDiagram}
          // Removed onOverflow since we now auto-scroll
          onCloseQuiz={() => setCurrentQuiz(null)}
          onCloseDiagram={() => setCurrentDiagram(null)}
          onQuizComplete={() => { }}
        />

        {sources.length > 0 && (
          <div className="px-8 pb-4 flex flex-wrap gap-2 overflow-y-auto max-h-24 z-20">
            {sources.map((s, i) => (
              <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="border px-3 py-1 rounded-lg text-[10px] uppercase font-bold tracking-widest bg-white/5 border-white/10 hover:bg-white/10 transition-all text-white/60">
                {s.title}
              </a>
            ))}
          </div>
        )}

        {cameraActive && (
          <div className="absolute top-6 right-6 w-44 h-32 rounded-2xl border-4 border-white/10 shadow-2xl overflow-hidden bg-black z-30 transition-all hover:scale-105 shadow-green-500/10">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale brightness-110" />
            <div className="absolute inset-0 bg-green-500/5 pointer-events-none" />
          </div>
        )}
      </main>

      <footer className="p-4 md:p-6 border-t border-white/10 bg-[#1e1e1e] z-40">
        <div className="max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Speak to Seeker or type a question here..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && userInput.trim() && sessionRef.current) {
                // Manually clearing queue triggers the board wipe
                clearAudioQueue(); 
                try {
                  sessionRef.current.sendClientContent({
                    turns: [{ role: 'user', parts: [{ text: userInput }] }],
                    turnComplete: true
                  });
                  setUserInput('');
                } catch (err) {
                  console.error("Send input error:", err);
                }
              }
            }}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 handwritten text-2xl focus:ring-2 focus:ring-green-500 placeholder:text-white/10 transition-all"
          />
        </div>
      </footer>
    </div>
  );
};

export default LessonPage;