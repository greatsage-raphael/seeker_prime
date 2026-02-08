import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import CertificateView from '@/components/CertificateView';
import { useUser } from '@clerk/clerk-react';

const TEXT_MODEL = "gemini-3-pro-preview"; // Latest Gemini 3 Pro
const IMAGE_MODEL = "gemini-3-pro-image-preview"; // Nano Banana Pro

const CourseDetailPage: React.FC = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    const [course, setCourse] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    

    useEffect(() => {
        fetchCourseAndModules();
    }, [courseId]);

    const fetchCourseAndModules = async () => {
        const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
        setCourse(courseData);

        const { data: moduleData } = await supabase
            .from('modules')
            .select(`*, lesson_plans (*)`)
            .eq('course_id', courseId)
            .order('order_index', { ascending: true });

        if (moduleData && moduleData.length > 0) {
            const sortedModules = moduleData.map(m => ({
                ...m,
                lesson_plans: m.lesson_plans.sort((a: any, b: any) => a.order_index - b.order_index)
            }));
            setModules(sortedModules);
        } else if (courseData) {
            // No curriculum found - trigger Gemini 3 Reasoning
            generateCurriculum(courseData);
        }
    };

    const generateCurriculum = async (courseInfo: any) => {
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

            // DOCS COMPLIANT: Initializing Gemini 3 Pro with "High" Thinking Level for complex reasoning
            const result = await ai.models.generateContent({
                model: TEXT_MODEL,
                contents: [{
                    role: "user",
                    parts: [{
                        text: `As a Master Curriculum Architect, design a progressive learning path for: "${courseInfo.title}".

        Description: ${courseInfo.description}

        Apply the "Building Block Approach":

        1. Meso Level: 4 thematic Modules.

        2. Micro Level: 3 sequential Lesson Plans per module.

        Return ONLY JSON:

        {"modules": [{"title": "Module Title", "description": "", "lessons": [{"title": "Lesson Title", "objectives": ["obj1"], "preview": ""}]}]}`
                    }]
                }],
                config: {
                    thinkingConfig: {
                        thinkingLevel: ThinkingLevel.HIGH // DOCS: High depth for curriculum logic
                    }
                }
            });

            const data = JSON.parse(result.text.replace(/```json|```/g, '').trim());

            // 1. Transactional save to Supabase
            for (let i = 0; i < data.modules.length; i++) {
                const m = data.modules[i];
                const { data: newMod } = await supabase
                    .from('modules')
                    .insert({ course_id: courseId, title: m.title, description: m.description, order_index: i })
                    .select().single();

                const lessonsToInsert = m.lessons.map((l: any, idx: number) => ({
                    module_id: newMod.id,
                    title: l.title,
                    learning_objectives: l.objectives,
                    content_preview: l.preview,
                    order_index: idx,
                    // Unlock only the first lesson of the whole course
                    status: (i === 0 && idx === 0) ? 'ready' : 'locked'
                }));

                await supabase.from('lesson_plans').insert(lessonsToInsert);
            }

            fetchCourseAndModules();
        } catch (e) {
            console.error("Gemini 3 Logic Failure:", e);
        } finally {
            setIsGenerating(false);
        }
    };

    const allLessons = modules.flatMap(m => m.lesson_plans || []);
    const completedLessons = allLessons.filter(l => l.status === 'completed').length;
    const isCourseComplete = allLessons.length > 0 && completedLessons === allLessons.length;
    const progressPercent = allLessons.length > 0 ? Math.round((completedLessons / allLessons.length) * 100) : 0;

    if (isGenerating) return (
        <div className="h-screen bg-[#1e3a2f] flex flex-col items-center justify-center p-10">
            <div className="w-24 h-24 border-8 border-yellow-400 border-t-transparent rounded-full animate-spin mb-8 shadow-2xl" />
            <h1 className="marker-font text-5xl text-yellow-400 uppercase animate-pulse">Consulting the Grand Architect...</h1>
            <p className="handwritten text-2xl text-white/40 mt-4 italic">Gemini 3 is deep-thinking your path to mastery.</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f4f1ea] p-8 md:p-20 text-gray-900 overflow-y-auto">
            <header className="max-w-6xl mx-auto mb-16 flex justify-between items-end gap-6">
                <div className="flex-1">
                    <button onClick={() => navigate('/courses')} className="text-gray-400 hover:text-black mb-8 flex items-center gap-2">
                        <span className="material-symbols-outlined">arrow_back</span> Library
                    </button>
                    <h1 className="marker-font text-6xl md:text-8xl uppercase tracking-tighter text-gray-800 leading-[0.8] mb-6">{course?.title}</h1>
                    <p className="handwritten text-3xl text-gray-400 italic max-w-4xl">{course?.description}</p>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-8xl marker-font text-green-600">{progressPercent}%</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mastery Level</div>
                </div>
            </header>

            <div className="max-w-6xl mx-auto space-y-24">
                {modules.map((module, mIdx) => {
                    const isModuleAccessible = module.lesson_plans?.some((l: any) => l.status !== 'locked');

                    return (
                        <section key={module.id} className="relative">
                            <div className="absolute left-10 top-24 bottom-[-6rem] w-1 bg-gray-200">
                                <div
                                    className="w-full bg-green-500 transition-all duration-1000"
                                    style={{ height: isModuleAccessible ? '100%' : '0%' }}
                                />
                            </div>

                            <div className="flex items-start gap-8 mb-12 relative z-10">
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center marker-font text-4xl shadow-xl transition-colors duration-700
                                    ${isModuleAccessible ? 'bg-gray-900 text-yellow-400' : 'bg-gray-200 text-gray-400'}`}>
                                    {mIdx + 1}
                                </div>
                                <div className="pt-2">
                                    <h2 className="marker-font text-4xl uppercase text-gray-700 leading-none">{module.title}</h2>
                                    <p className="handwritten text-xl text-gray-400 mt-1 italic">{module.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ml-0 md:ml-28">
                                {module.lesson_plans?.map((lesson: any, lIdx: number) => {
                                    const isLocked = lesson.status === 'locked';
                                    const isDone = lesson.status === 'completed';

                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={() => !isLocked && navigate(`/lesson/${lesson.id}`)}
                                            className={`group relative p-8 rounded-[3rem] shadow-xl border-b-8 transition-all duration-500
                                                ${isLocked ? 'bg-gray-50 border-gray-200 grayscale cursor-not-allowed opacity-60' : 'bg-white border-green-500 cursor-pointer hover:-translate-y-2 shadow-green-500/5'}`}
                                        >
                                            <div className="flex justify-between items-start mb-6">
                                                <span className="text-[10px] font-black uppercase text-gray-300 tracking-widest">Block {mIdx + 1}.{lIdx + 1}</span>
                                                <span className={`material-symbols-outlined ${isLocked ? 'text-gray-300' : isDone ? 'text-green-500' : 'text-yellow-500 animate-pulse'}`}>
                                                    {isLocked ? 'lock' : isDone ? 'verified' : 'play_circle'}
                                                </span>
                                            </div>

                                            <h4 className={`marker-font text-2xl uppercase leading-tight mb-4 ${isLocked ? 'text-gray-300' : 'text-gray-800'}`}>
                                                {lesson.title}
                                            </h4>

                                            <div className="space-y-2 opacity-60">
                                                {lesson.learning_objectives?.slice(0, 2).map((obj: string, i: number) => (
                                                    <div key={i} className="handwritten text-sm text-gray-500">• {obj}</div>
                                                ))}
                                            </div>

                                            {isLocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-[3rem]">
                                                    <span className="material-symbols-outlined text-4xl text-gray-200">lock_outline</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>   
                    );
                })}
                <section className="pt-20 border-t-8 border-gray-200 mt-32 pb-40">
                    <div className="text-center mb-12">
                        <h2 className="marker-font text-5xl uppercase text-gray-800">Final Certification</h2>
                        <p className="handwritten text-2xl text-gray-400 italic mt-2">
                            {isCourseComplete 
                                ? "Congratulations, Scholar. You have mastered this curriculum." 
                                : "Master all lesson blocks to unlock your official diploma."}
                        </p>
                    </div>

                    <div className="relative">
                        {/* Grayed out overlay if not complete */}
                        {!isCourseComplete && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#f4f1ea]/60 backdrop-blur-[2px] rounded-3xl">
                                <div className="bg-white p-8 rounded-full shadow-2xl mb-4">
                                    <span className="material-symbols-outlined text-6xl text-gray-300">lock</span>
                                </div>
                                <div className="marker-font text-2xl text-gray-400 uppercase tracking-widest">
                                    {allLessons.length - completedLessons} Lessons Remaining
                                </div>
                            </div>
                        )}

                        {/* The Certificate Component */}
                        <div className={isCourseComplete ? "" : "grayscale opacity-30 pointer-events-none"}>
                            <CertificateView
                                topicTitle={course?.title || "Seeker Course"}
                                userName={user?.fullName || user?.firstName || "Seeker Student"}
                                completionDate={new Date().toLocaleDateString()}
                            />
                        </div>
                    </div>
                </section>
            </div>
            <style>{` .marker-font { font-family: 'Permanent Marker', cursive; } .handwritten { font-family: 'Caveat', cursive; } `}</style>
        </div>
    );
};

export default CourseDetailPage;