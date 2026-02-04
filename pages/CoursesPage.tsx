import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../src/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';

const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';
const TEXT_MODEL_NAME = 'gemini-3-flash-preview';

const CoursesPage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Creation State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [topicInput, setTopicInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Array for multiple PDFs

  useEffect(() => {
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('courses')
      .select(`*, modules (id, lesson_plans (id, status))`)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (!error) setCourses(data || []);
    setLoading(false);
  };

  const calculateProgress = (course: any) => {
    const allLessons = course.modules?.flatMap((m: any) => m.lesson_plans || []) || [];
    if (allLessons.length === 0) return 0;
    const completedCount = allLessons.filter((l: any) => l.status === 'completed').length;
    return Math.round((completedCount / allLessons.length) * 100);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Strict PDF validation
    const pdfFiles = files.filter(file => file.type === 'application/pdf');

    if (pdfFiles.length !== files.length) {
      alert("Only PDF documents are allowed. Non-PDF files have been removed.");
    }

    setSelectedFiles(pdfFiles);
  };

  const handleCreateCourse = async () => {
    if (!topicInput.trim() && selectedFiles.length === 0) return;
    setIsCreating(true);
    setIsModalOpen(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const prompt = `As a Master Curriculum Architect, design a progressive learning path based on the provided documents. 
      Topic Context: ${topicInput}. 
      
      Rules:
      1. Analyze ALL provided documents to create a cohesive structure.
      2. Return ONLY valid JSON:
      {
        "title": "Course Title",
        "description": "Engaging summary",
        "difficulty": "Beginner/Intermediate/Advanced",
        "modules": [
          {
            "title": "Module Title",
            "description": "Module summary",
            "lessons": [
              { "title": "Lesson Title", "objectives": ["obj1", "obj2"], "preview": "Short teaser" }
            ]
          }
        ]
      }`;

      // Process multiple PDFs into parts
      const fileParts = await Promise.all(
        selectedFiles.map(async (file) => ({
          inlineData: {
            mimeType: "application/pdf",
            data: await fileToBase64(file)
          }
        }))
      );

      const contents = [
        ...fileParts,
        { text: prompt }
      ];

      const result = await ai.models.generateContent({
        model: TEXT_MODEL_NAME,
        contents
      });
      const responseText = result.text.replace(/```json|```/g, '').trim();
      const courseData = JSON.parse(responseText);

      // Generate Card Banner
      const bannerResult = await ai.models.generateContent({
        model: IMAGE_MODEL_NAME,
        contents: `Educational cover for ${courseData.title}, clean academic style, white background.`
      });
      const bannerPart = bannerResult.candidates?.[0].content.parts.find(p => p.inlineData);
      const bannerUrl = bannerPart?.inlineData ? `data:${bannerPart.inlineData.mimeType};base64,${bannerPart.inlineData.data}` : '';

      // Save Course
      const { data: newCourse } = await supabase.from('courses').insert({
        student_id: user?.id,
        title: courseData.title,
        description: courseData.description,
        difficulty: courseData.difficulty,
        banner_url: bannerUrl,
        status: 'ready'
      }).select().single();

      // Save Modules & Lessons
      for (let i = 0; i < courseData.modules.length; i++) {
        const m = courseData.modules[i];
        const { data: mod } = await supabase.from('modules').insert({
          course_id: newCourse.id,
          title: m.title,
          description: m.description,
          order_index: i
        }).select().single();

        const lessons = m.lessons.map((l: any, idx: number) => ({
          module_id: mod.id,
          title: l.title,
          learning_objectives: l.objectives,
          content_preview: l.preview,
          order_index: idx,
          status: (i === 0 && idx === 0) ? 'ready' : 'locked'
        }));
        await supabase.from('lesson_plans').insert(lessons);
      }

      await fetchCourses();
      navigate(`/course/${newCourse.id}`);

    } catch (err) {
      console.error("Creation failed:", err);
      alert("Failed to generate course. Please ensure PDFs are not password protected.");
    } finally {
      setIsCreating(false);
      setTopicInput('');
      setSelectedFiles([]);
    }
  };

  if (loading || isCreating) return (
    <div className="h-screen bg-[#022c22] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_30px_rgba(250,204,20,0.2)]" />
      <span className="marker-font text-yellow-400 text-xl animate-pulse">
        {isCreating ? `Architecting ${selectedFiles.length > 0 ? selectedFiles.length : ''} Knowledge Sources...` : 'Opening Library...'}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#022c22] p-8 md:p-20 relative overflow-x-hidden">
      <header className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
        <div className="animate-fade-in">
          <h1 className="marker-font text-6xl md:text-8xl text-yellow-400 uppercase tracking-tighter leading-none">The Library</h1>
          <p className="handwritten text-2xl md:text-3xl text-white/40 mt-2 italic">Select a volume to begin your structured journey.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsModalOpen(true)} className="bg-white/10 text-white border border-white/20 px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined">add_circle</span> Create Course
          </button>
          <button onClick={() => navigate('/')} className="bg-yellow-400 text-[#022c22] px-10 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all">Quick Lesson</button>
        </div>
      </header>

      {/* Course Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 relative z-10">
        {courses.map((course) => (
          <div key={course.id} onClick={() => navigate(`/course/${course.id}`)} className="group cursor-pointer bg-white/5 border-2 border-white/5 rounded-[3rem] overflow-hidden hover:border-yellow-400/40 transition-all shadow-xl">
            <div className="h-56 bg-gray-900 relative overflow-hidden">
              <img src={course.banner_url} className="w-full h-full object-cover opacity-40 group-hover:opacity-80 transition-all" alt={course.title} />
              <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <span className="text-xl marker-font text-yellow-400">{calculateProgress(course)}%</span>
              </div>
            </div>
            <div className="p-8">
              <h3 className="text-3xl font-serif font-black text-white uppercase leading-tight mb-4">{course.title}</h3>
              <p className="text-white/40 font-handwriting text-xl mb-8 italic line-clamp-2">{course.description}</p>
              <div className="flex justify-between items-center pt-6 border-t border-white/5">
                <span className="text-xs font-bold text-white/60 uppercase">{course.difficulty}</span>
                <span className="material-symbols-outlined text-white/20">auto_stories</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE COURSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl">
          <div className="bg-[#1e1e1e] border border-white/10 p-12 rounded-[3.5rem] w-full max-w-2xl shadow-2xl">
            <h2 className="marker-font text-5xl text-yellow-400 mb-2 uppercase tracking-tighter">Architect Course</h2>
            <p className="text-white/40 text-xl font-handwriting italic mb-8">"Upload your PDF documents, and I shall synthesize them into a curriculum."</p>

            <div className="space-y-6">
              <input
                type="text"
                placeholder="Course Topic / Goal (Optional)"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-xl outline-none focus:ring-2 focus:ring-yellow-400"
              />

              <div className="relative group">
                <input
                  type="file"
                  accept=".pdf,application/pdf" // Restrict to PDF
                  multiple // Allow multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`w-full border-2 border-dashed rounded-2xl py-10 flex flex-col items-center justify-center transition-all ${selectedFiles.length > 0 ? 'border-green-500 bg-green-500/5' : 'border-white/10 bg-white/5 group-hover:border-yellow-400/50'}`}>
                  <span className={`material-symbols-outlined text-5xl mb-3 ${selectedFiles.length > 0 ? 'text-green-400' : 'text-white/20'}`}>
                    {selectedFiles.length > 0 ? 'library_books' : 'upload_file'}
                  </span>
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-white/40 text-center px-4">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} PDF Documents Prepared`
                      : 'Upload PDF Sources (Multiple Allowed)'}
                  </p>
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2 px-6">
                      {selectedFiles.map((f, i) => (
                        <span key={i} className="text-[9px] bg-white/5 px-2 py-1 rounded text-white/30 truncate max-w-[120px]">{f.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => { setIsModalOpen(false); setSelectedFiles([]); }} className="flex-1 py-4 text-white/40 font-bold uppercase text-[10px] tracking-widest">Cancel</button>
                <button
                  onClick={handleCreateCourse}
                  className="flex-1 py-4 bg-yellow-400 text-black rounded-xl font-black uppercase text-sm tracking-widest shadow-xl hover:scale-105 transition-all"
                >
                  Synthesize Curriculum
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .marker-font { font-family: 'Permanent Marker', cursive; }
        .handwritten { font-family: 'Caveat', cursive; }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default CoursesPage;