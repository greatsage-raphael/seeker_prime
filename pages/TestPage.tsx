// pages/TestPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GoogleGenAI, Type, FunctionDeclaration, Modality } from '@google/genai';
import { supabase } from '../src/lib/supabase';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import { awardXP } from '@/src/lib/gamification';
import { useUser } from '@clerk/clerk-react';

const submitGradeFn: FunctionDeclaration = {
  name: 'submit_grade',
  parameters: {
    type: Type.OBJECT,
    description: 'Call this ONLY to conclude the exam and provide the final grade.',
    properties: {
      score: { type: Type.NUMBER, description: 'Score 0-100' },
      feedback: { type: Type.STRING, description: 'Socratic feedback.' }
    },
    required: ['score', 'feedback']
  }
};

const TestPage = () => {
  const { lessonPlanId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [examState, setExamState] = useState<'idle' | 'active' | 'grading' | 'finished'>('idle');
  const [result, setResult] = useState<{ score: number, feedback: string } | null>(null);
  const [transcript, setTranscript] = useState<string>("");

  // Refs for Cleanup & Logic
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outAudioCtx = useRef<AudioContext | null>(null);
  const inAudioCtx = useRef<AudioContext | null>(null);

  // Audio Scheduling (Fixes the "30 voices" error)
  const nextStartTimeRef = useRef<number>(0);
  const activeSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isSessionActive = useRef<boolean>(false);

  // DOCS REQUIREMENT: Clear audio on interruption
  const stopAllAudio = () => {
    activeSources.current.forEach(source => {
      try { source.stop(); } catch (e) { }
    });
    activeSources.current.clear();
    if (outAudioCtx.current) {
      nextStartTimeRef.current = outAudioCtx.current.currentTime;
    }
  };

  const cleanup = () => {
    isSessionActive.current = false;
    stopAllAudio();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (inAudioCtx.current?.state !== 'closed') inAudioCtx.current?.close();
    if (outAudioCtx.current?.state !== 'closed') outAudioCtx.current?.close();
    if (sessionRef.current) sessionRef.current.close();
  };

  const startSocraticExam = async () => {
    const { data: lessonData } = await supabase.from('lessons').select('ai_notes, title').eq('lesson_id', lessonPlanId).single();

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    outAudioCtx.current = new AudioContext({ sampleRate: 24000 });
    inAudioCtx.current = new AudioContext({ sampleRate: 16000 });

    const session = await ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: `You are the Socratic Examiner. 
        TOPIC: ${lessonData?.title}. NOTES: ${lessonData?.ai_notes}.
        RULES: 
        1. SPEAK FIRST. Greet the student and ask the first question.
        2. Ask questions that challenge their logic.
        3. Call submit_grade when finished.`,
        tools: [{ functionDeclarations: [submitGradeFn] }],
      },
      callbacks: {
        onopen: () => {
          isSessionActive.current = true;
          setExamState('active');
          setupMicInput();
        },
        onmessage: async (m: any) => {
          // DOCS: Handle Interruption
          if (m.serverContent?.interrupted) {
            stopAllAudio();
            return;
          }

          // Handle Voice (The Scheduler)
          const audioB64 = m.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioB64 && outAudioCtx.current) {
            const buf = await decodeAudioData(decode(audioB64), outAudioCtx.current, 24000, 1);
            const source = outAudioCtx.current.createBufferSource();
            source.buffer = buf;
            source.connect(outAudioCtx.current.destination);

            // CHAINING: Prevents overlapping "30 voices"
            const now = outAudioCtx.current.currentTime;
            const startTime = Math.max(now, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + buf.duration;

            activeSources.current.add(source);
            source.onended = () => activeSources.current.delete(source);
          }

          if (m.serverContent?.outputTranscription) {
            setTranscript(m.serverContent.outputTranscription.text);
          }

          if (m.toolCall) {
            for (const fc of m.toolCall.functionCalls) {
              if (fc.name === 'submit_grade') finalizeExam(fc.args.score, fc.args.feedback);
            }
          }
        },
        onclose: () => cleanup()
      }
    });
    sessionRef.current = session;
  };

  const setupMicInput = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const source = inAudioCtx.current!.createMediaStreamSource(stream);
    const processor = inAudioCtx.current!.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      // PREVENTS WEBSOCKET ERROR: Check if active before sending
      if (isSessionActive.current && sessionRef.current) {
        try {
          sessionRef.current.sendRealtimeInput({
            media: createBlob(e.inputBuffer.getChannelData(0))
          });
        } catch (err) { isSessionActive.current = false; }
      }
    };
    source.connect(processor);
    processor.connect(inAudioCtx.current!.destination);
  };

  // Inside finalizeExam in TestPage.tsx

  const finalizeExam = async (score: number, feedback: string) => {
    const passed = score > 50;

    if (passed) {
      // 1. Mark current lesson plan as completed
      await supabase.from('lesson_plans').update({ status: 'completed' }).eq('id', lessonPlanId);

      // 2. Unlock the NEXT lesson
      // First, get current lesson details
      const { data: current } = await supabase.from('lesson_plans').select('*').eq('id', lessonPlanId).single();

      if (current) {
        // Try to find next lesson in SAME module
        const { data: nextInModule } = await supabase
          .from('lesson_plans')
          .select('id')
          .eq('module_id', current.module_id)
          .eq('order_index', current.order_index + 1)
          .single();

        if (nextInModule) {
          await supabase.from('lesson_plans').update({ status: 'ready' }).eq('id', nextInModule.id);
        } else {
          // If no more lessons in module, try to find FIRST lesson of NEXT module
          const { data: currentMod } = await supabase.from('modules').select('*').eq('id', current.module_id).single();
          
          if (currentMod) {
             const { data: nextMod } = await supabase
              .from('modules')
              .select('id')
              .eq('course_id', currentMod.course_id)
              .eq('order_index', currentMod.order_index + 1)
              .single();

            if (nextMod) {
              const { data: firstInNextMod } = await supabase
                .from('lesson_plans')
                .select('id')
                .eq('module_id', nextMod.id)
                .order('order_index', { ascending: true })
                .limit(1)
                .single();

              if (firstInNextMod) {
                await supabase.from('lesson_plans').update({ status: 'ready' }).eq('id', firstInNextMod.id);
              }
            }
          }
        }
      }

      // 3. --- GAMIFICATION TRIGGER ---
      if (user) {
        try {
            // XP Calculation: Score * 2 (e.g. 100% = 200XP)
            const xpEarned = Math.round(score * 2);
            await awardXP(user.id, xpEarned);
            
            // Check for perfect score badge
            if (score === 100) {
                // You could add a checkSocraticMaster(user.id) here if you added that badge
            }
        } catch (e) {
            console.error("XP Award Failed:", e);
        }
      }

    } else {
      // Logic for failed exam
      await supabase.from('lesson_plans').update({ status: 'failed' }).eq('id', lessonPlanId);
    }

    // 4. Update UI State
    setResult({ score, feedback });
    setExamState('finished');
    
    // 5. Cleanup resources
    cleanup();
  };

  useEffect(() => { return () => cleanup(); }, []);

  return (
    <div className="h-screen w-full bg-[#0c1a14] flex flex-col items-center justify-center relative font-sans p-6">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]" />

      {examState === 'idle' && (
        <div className="text-center space-y-8 animate-fade-in z-10">
          <h1 className="marker-font text-6xl text-white uppercase tracking-tighter">The Socratic Exam</h1>
          <button onClick={startSocraticExam} className="px-16 py-6 bg-yellow-400 text-black rounded-2xl marker-font text-2xl uppercase shadow-2xl hover:scale-105 transition-all">Begin Examination</button>
        </div>
      )}

      {examState === 'active' && (
        <div className="text-center space-y-12 z-10">
          <div className="w-48 h-48 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse mx-auto shadow-[0_0_80px_rgba(250,204,20,0.4)]">
            <span className="material-symbols-outlined text-6xl text-black">mic</span>
          </div>
          <div className="space-y-4">
            <h2 className="marker-font text-4xl text-white uppercase tracking-widest">Oral Exam In Progress</h2>
            <p className="handwritten text-2xl text-yellow-400/60 italic animate-pulse max-w-md mx-auto line-clamp-2">{transcript || "Waiting for the examiner to speak..."}</p>
          </div>
        </div>
      )}

      {examState === 'finished' && result && (
        <div className="z-20 max-w-2xl w-full bg-[#fdfbf7] rounded-[4rem] p-16 shadow-2xl text-center animate-fade-in border-l-[30px] border-black/5">
          <div className={`text-[12rem] leading-none marker-font ${result.score > 50 ? 'text-green-600' : 'text-red-600'}`}>{result.score}%</div>
          <div className="bg-black/5 p-8 rounded-3xl border-2 border-dashed border-black/10 my-8">
            <p className="handwritten text-2xl text-gray-700 leading-snug italic">"{result.feedback}"</p>
          </div>
          <button onClick={() => navigate(`/notes/${lessonPlanId}`)} className="w-full py-6 bg-black text-white rounded-2xl marker-font text-xl uppercase">Return to Library</button>
        </div>
      )}

      <style>{`
        .marker-font { font-family: 'Permanent Marker', cursive; }
        .handwritten { font-family: 'Caveat', cursive; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default TestPage;