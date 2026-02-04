// FILE: pages/ProfilePage.tsx
// --------------------------------------------------------------------------

import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';
import { GoogleGenAI } from '@google/genai';

const TEXT_MODEL_NAME = 'gemini-3-pro-preview';
const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview';

// --- REMOTE ASSETS MAP ---
const BADGE_ASSETS: Record<string, { img: string; vid: string }> = {
  "deep_diver": {
    "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/deep_diver.jpeg",
    "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/deep_diver.mp4"
  },
  "first_step": {
    "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/first_step.jpeg",
    "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/first_step.mp4"
  },
  "night_scholar": {
    "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/night_scholar.jpeg",
    "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/night_scholar.mp4"
  },
  "socratic_scholar": {
    "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/socratic_scholar.jpeg",
    "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/socratic_scholar.mp4"
  },
  "streak": {
    "img": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/streak.jpeg",
    "vid": "https://eifeyuvbxmsjjtbtbyuk.supabase.co/storage/v1/object/public/seeker/streak.mp4"
  }
};

// --- HELPER: Map Database Slugs to Asset Keys ---
const getBadgeAsset = (slug: string) => {
  if (slug === 'socratic_master') return BADGE_ASSETS['socratic_scholar'];
  if (slug === 'streak_3') return BADGE_ASSETS['streak'];
  // Default: assumes slug matches asset key exactly
  return BADGE_ASSETS[slug];
};

// --- GAMIFICATION & MATH HELPERS ---

const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1;

const getLevelThresholds = (level: number) => {
  const currentLevelBase = Math.pow(level - 1, 2) * 100;
  const nextLevelBase = Math.pow(level, 2) * 100;
  return { currentLevelBase, nextLevelBase };
};

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

const getReadableDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const getIntensityClass = (count: number) => {
  if (count === 0) return 'bg-white/5';           
  if (count <= 1) return 'bg-green-900/40';       
  if (count <= 2) return 'bg-green-700/60';       
  if (count <= 4) return 'bg-green-500';          
  return 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]'; 
};

// --- STATIC DATA OPTIONS ---

const LEVELS = ['Primary', 'High School', 'Undergraduate', 'Post-Grad', 'Professional'];
const STYLES = [
  { id: 'Diver', label: 'Deep Diver', desc: 'Context & History focused' },
  { id: 'Visualist', label: 'Visualist', desc: 'Maps & Imagery focused' },
  { id: 'Builder', label: 'Builder', desc: 'Project & Prototype focused' },
];
const PERSONAS = [
  { id: 'Professor', label: 'The Professor', desc: 'Formal & Rigorous' },
  { id: 'Mentor', label: 'The Mentor', desc: 'Supportive & Patient' },
  { id: 'Friend', label: 'The Friend', desc: 'Casual & Direct' },
];

// --- SKELETON LOADER COMPONENT ---

const ProfileSkeleton = () => (
  <div className="min-h-screen bg-[#1a1a1a] text-white p-6 md:p-20 overflow-y-auto font-sans animate-pulse">
    <div className="max-w-5xl mx-auto space-y-16 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-8 gap-6">
        <div className="flex-1 w-full space-y-4">
          <div className="flex items-center gap-4">
             <div className="h-12 w-64 bg-white/10 rounded-lg"></div>
             <div className="h-8 w-16 bg-yellow-400/20 rounded"></div>
          </div>
          <div className="w-full max-w-lg space-y-2">
             <div className="flex justify-between">
                <div className="h-3 w-24 bg-white/10 rounded"></div>
                <div className="h-3 w-24 bg-white/10 rounded"></div>
             </div>
             <div className="h-2 w-full bg-white/10 rounded-full"></div>
          </div>
        </div>
        <div className="flex gap-4">
            <div className="h-20 w-28 bg-white/5 rounded-2xl border border-white/5"></div>
            <div className="h-20 w-28 bg-white/5 rounded-2xl border border-white/5"></div>
        </div>
      </div>
      <div className="space-y-6">
         <div className="h-6 w-48 bg-white/10 rounded"></div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => (
                <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5"></div>
            ))}
         </div>
      </div>
      <div className="h-64 bg-[#0c0c0c] rounded-3xl border border-white/10"></div>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

const ProfilePage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile Data State
  const [profileData, setProfileData] = useState<{
    academicLevel: string;
    profession: string;
    learningStyle: string;
    teacherPersona: string;
    interests: string[];
    xp: number;
    earnedBadgeIds: Set<string>;
  }>({
    academicLevel: 'Undergraduate',
    profession: '',
    learningStyle: 'Visualist',
    teacherPersona: 'Mentor',
    interests: [],
    xp: 0,
    earnedBadgeIds: new Set()
  });

  const [allBadges, setAllBadges] = useState<any[]>([]);
  const [interestInput, setInterestInput] = useState('');

  // Heatmap Data State
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [totalLessons, setTotalLessons] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Daily Log Selection State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLessons, setSelectedLessons] = useState<any[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  // Recommendations State
  const [recommendations, setRecommendations] = useState<Array<{topic: string, image?: string}>>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // --- 1. INITIAL DATA FETCH (PARALLEL) ---
  useEffect(() => {
    if (!user) return;

    const loadAllData = async () => {
      setLoading(true);

      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(new Date().getFullYear() - 1);

      const [profileResult, allBadgesResult, activityResult] = await Promise.all([
        supabase
          .from('students')
          .select('*, student_badges(badge_id)')
          .eq('student_id', user.id)
          .single(),
        
        supabase
          .from('badges')
          .select('*')
          .order('xp_reward', { ascending: true }),

        supabase
          .from('lessons')
          .select('created_at')
          .eq('student_id', user.id)
          .gte('created_at', oneYearAgo.toISOString())
      ]);

      if (profileResult.data) {
        const d = profileResult.data;
        const earnedIds = new Set(
          (d.student_badges || []).map((sb: any) => sb.badge_id)
        );
          
        setProfileData({
          academicLevel: d.academic_level || 'Undergraduate',
          profession: d.profession || '',
          learningStyle: d.learning_style_notes || 'Visualist',
          teacherPersona: d.teacher_persona || 'Mentor',
          interests: d.interest || [],
          xp: d.xp || 0,
          earnedBadgeIds: earnedIds as Set<string>
        });
      }

      if (allBadgesResult.data) {
        setAllBadges(allBadgesResult.data);
      }

      if (activityResult.data) {
        setTotalLessons(activityResult.data.length);
        const map: Record<string, number> = {};
        activityResult.data.forEach((l) => {
          const k = l.created_at.split('T')[0];
          map[k] = (map[k] || 0) + 1;
        });
        setHeatmapData(map);

        let streak = 0;
        const dateIterator = new Date();
        while (true) {
          const k = formatDateKey(dateIterator);
          if (map[k] && map[k] > 0) {
            streak++;
            dateIterator.setDate(dateIterator.getDate() - 1);
          } else {
            if (k === formatDateKey(new Date()) && streak === 0) {
              dateIterator.setDate(dateIterator.getDate() - 1);
              continue;
            }
            break;
          }
        }
        setCurrentStreak(streak);
        setSelectedDate(formatDateKey(new Date()));
      }

      setLoading(false);
    };

    loadAllData();
  }, [user]);

  // --- 2. DAILY DETAIL FETCH ---
  useEffect(() => {
    if (selectedDate && user) {
        const fetchDay = async () => {
            setLoadingDay(true);
            const start = new Date(selectedDate); start.setHours(0,0,0,0);
            const end = new Date(selectedDate); end.setHours(23,59,59,999);
            
            const { data } = await supabase
              .from('lessons')
              .select('*')
              .eq('student_id', user.id)
              .gte('created_at', start.toISOString())
              .lte('created_at', end.toISOString())
              .order('created_at', { ascending: false });
            
            setSelectedLessons(data || []);
            setLoadingDay(false);
        }
        fetchDay();
    }
  }, [selectedDate, user]);

  // --- 3. GENERATE RECOMMENDATIONS WHEN DATA LOADS ---
  useEffect(() => {
    if (!loading && user && profileData.interests.length > 0) {
      generateRecommendations();
    }
  }, [loading, profileData.interests]);

  // --- AI RECOMMENDATION GENERATION ---
  const generateRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      const { data: recentLessons } = await supabase
        .from('lessons')
        .select('title')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const recentTopics = recentLessons?.map(l => l.title).join(', ') || 'None yet';

      const prompt = `You are an academic advisor for a student with the following profile:
**Interests:** ${profileData.interests.join(', ')}
**Academic Level:** ${profileData.academicLevel}
**Profession/Goal:** ${profileData.profession || 'Not specified'}
**Learning Style:** ${profileData.learningStyle}
**Recent Lessons:** ${recentTopics}

Based on this profile, recommend 6 specific, compelling lesson topics.
Return ONLY a JSON array of lesson titles (strings), nothing else. Example format:
["Advanced Quantum Entanglement", "The Ethics of AI Alignment"]`;

      const response = await ai.models.generateContent({
        model: TEXT_MODEL_NAME,
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const cleanJson = text.replace(/```json|```/g, '').trim();
        const topics = JSON.parse(cleanJson);
        
        const topicsWithImages = await Promise.all(
          topics.map(async (topic: string) => {
            try {
              const imagePrompt = `Educational illustration for "${topic}". Academic style, clean composition, isolated subject on pure white background. High quality, professional.`;
              
              const imageResponse = await ai.models.generateContent({
                model: IMAGE_MODEL_NAME,
                contents: [{ role: 'user', parts: [{ text: imagePrompt }] }]
              });

              const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
              const imageUrl = imagePart?.inlineData 
                ? `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
                : undefined;

              return { topic, image: imageUrl };
            } catch (err) {
              return { topic };
            }
          })
        );
        
        setRecommendations(topicsWithImages);
      }
    } catch (err) {
      console.error('Failed to generate recommendations:', err);
      setRecommendations([
        { topic: 'Introduction to Machine Learning' },
        { topic: 'Philosophy of Mind' },
        { topic: 'Data Structures & Algorithms' },
        { topic: 'Creative Writing Fundamentals' },
        { topic: 'Modern Physics Concepts' },
        { topic: 'Economic Game Theory' }
      ]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // --- FORM HANDLERS ---
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('students').update({
        academic_level: profileData.academicLevel,
        profession: profileData.profession,
        learning_style_notes: profileData.learningStyle,
        teacher_persona: profileData.teacherPersona,
        interest: profileData.interests,
        onboarding_finished: true 
    }).eq('student_id', user.id);
    setSaving(false);
    if (!error) {
      alert('Registry updated successfully.');
      if (profileData.interests.length > 0) {
        generateRecommendations();
      }
    }
  };

  const updateField = (field: string, val: any) => {
    setProfileData(prev => ({ ...prev, [field]: val }));
  };

  const addInterest = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && interestInput.trim()) {
      if (!profileData.interests.includes(interestInput.trim())) {
        updateField('interests', [...profileData.interests, interestInput.trim()]);
      }
      setInterestInput('');
    }
  };

  const removeInterest = (tag: string) => {
    updateField('interests', profileData.interests.filter(i => i !== tag));
  };

  const startRecommendedLesson = (topic: string) => {
    const lessonUuid = crypto.randomUUID();
    navigate(`/lesson/${lessonUuid}`, { state: { topic } });
  };

  // --- CALCULATIONS & RENDERERS ---
  const level = calculateLevel(profileData.xp);
  const { currentLevelBase, nextLevelBase } = getLevelThresholds(level);
  const progressPercent = Math.min(100, Math.max(0, ((profileData.xp - currentLevelBase) / (nextLevelBase - currentLevelBase)) * 100));

  const renderMonthLabels = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    for(let i = 0; i < 12; i++) {
        const d = new Date(); 
        d.setMonth(d.getMonth() - 11 + i);
        labels.push(
            <span key={i} className="text-[10px] text-white/30 uppercase font-bold" style={{ width: '40px' }}>
                {months[d.getMonth()]}
            </span>
        );
    }
    return <div className="flex justify-between pl-8 mb-2 w-full max-w-[calc(53*14px)]">{labels}</div>;
  };

  const renderHeatmapSquares = () => {
    const squares = [];
    const daysToRender = 365;
    const startDate = new Date(); 
    startDate.setDate(startDate.getDate() - daysToRender);
    
    for (let i = 0; i < daysToRender; i++) {
        const current = new Date(startDate);
        current.setDate(startDate.getDate() + i);
        const dateKey = formatDateKey(current);
        const count = heatmapData[dateKey] || 0;
        const isSelected = selectedDate === dateKey;
        
        squares.push(
            <div 
                key={dateKey}
                onClick={() => setSelectedDate(dateKey)}
                title={`${count} lessons on ${current.toLocaleDateString()}`}
                className={`
                    w-[10px] h-[10px] sm:w-3 sm:h-3 rounded-[2px] cursor-pointer transition-all duration-200 
                    ${getIntensityClass(count)}
                    ${isSelected ? 'ring-2 ring-white scale-110 z-10' : 'hover:scale-125 hover:z-10'}
                `}
            />
        );
    }
    return squares;
  };

  if (loading) return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-6 md:p-20 overflow-y-auto font-sans">
      <div className="max-w-5xl mx-auto space-y-16 pb-20">
        
        {/* HEADER: GAMIFIED STATS */}
        <header className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-8 gap-6 animate-fade-in">
          <div className="flex-1 w-full">
            <div className="flex items-baseline gap-4 mb-3">
               <h1 className="marker-font text-5xl md:text-7xl text-white uppercase tracking-tighter">Student Registry</h1>
               <div className="bg-yellow-400 text-black px-3 py-1 rounded text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(250,204,20,0.4)]">
                 Lvl {level}
               </div>
            </div>
            
            {/* XP BAR */}
            <div className="w-full max-w-lg">
                <div className="flex justify-between text-[10px] uppercase font-bold text-white/40 mb-1 tracking-wider">
                    <span>Progress to Level {level + 1}</span>
                    <span>{profileData.xp} / {nextLevelBase} XP</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-green-600 to-yellow-400 transition-all duration-1000 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
                        style={{ width: `${progressPercent}%` }} 
                    />
                </div>
            </div>
          </div>
          
          <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-center min-w-[100px]">
                  <div className="text-2xl font-black text-green-400 marker-font">{currentStreak}</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40">Day Streak</div>
              </div>
              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl text-center min-w-[100px]">
                  <div className="text-2xl font-black text-white marker-font">{totalLessons}</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40">Total Lessons</div>
              </div>
          </div>
        </header>

        {/* SECTION 1: HONORS & DISTINCTIONS (BADGES) - USING REMOTE S3 ASSETS */}
        <section className="space-y-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-xl font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">I. Honors & Distinctions</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allBadges.map((badge: any) => {
                    const isUnlocked = profileData.earnedBadgeIds.has(badge.id);
                    const asset = getBadgeAsset(badge.slug); // Using helper for mapping

                    return (
                        <div key={badge.id} className={`bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center text-center transition-all relative overflow-hidden group ${isUnlocked ? 'hover:bg-white/10' : ''}`}>
                            
                            {/* MEDIA CONTAINER */}
                            <div className={`w-24 h-24 mb-4 relative rounded-lg overflow-hidden flex items-center justify-center ${!isUnlocked ? 'opacity-50 grayscale' : ''}`}>
                                {asset ? (
                                    isUnlocked ? (
                                        // UNLOCKED: Loop the remote MP4
                                        <video 
                                            src={asset.vid} 
                                            autoPlay 
                                            loop 
                                            muted 
                                            playsInline 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        // LOCKED: Show remote Image
                                        <img 
                                            src={asset.img} 
                                            alt={badge.name} 
                                            className="w-full h-full object-cover"
                                        />
                                    )
                                ) : (
                                    // FALLBACK: If asset mapping missing
                                    <span className="material-symbols-outlined text-4xl text-white/20">{badge.icon}</span>
                                )}

                                {/* LOCKED CHAIN OVERLAY */}
                                {!isUnlocked && (
                                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/40">
                                        <div className="absolute w-[120%] h-1 bg-black/80 rotate-45 border-y border-white/20 shadow-xl"></div>
                                        <div className="absolute w-[120%] h-1 bg-black/80 -rotate-45 border-y border-white/20 shadow-xl"></div>
                                        <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center border-2 border-white/20 z-30 shadow-2xl">
                                            <span className="material-symbols-outlined text-white/50 text-sm">lock</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <h3 className={`font-bold uppercase text-[10px] tracking-widest mb-1 ${isUnlocked ? 'text-yellow-400' : 'text-white/60'}`}>{badge.name}</h3>
                            <p className="text-[9px] text-white/40 leading-tight line-clamp-2">{badge.description}</p>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* SECTION 2: CLASS ATTENDANCE (HEATMAP) */}
        <section className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h2 className="text-sm font-black uppercase text-white/40 tracking-widest mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">calendar_month</span>
                Class Attendance
            </h2>

            <div className="relative w-full overflow-x-auto pb-4 scrollbar-hide">
                {renderMonthLabels()}
                <div className="flex gap-2">
                    <div className="flex flex-col justify-between text-[9px] text-white/30 font-bold h-[calc(7*14px)] py-[2px] pr-2">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                    </div>
                    <div className="grid gap-[3px] sm:gap-1" style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}>
                        {renderHeatmapSquares()}
                    </div>
                </div>
            </div>

            <div className="mt-4 flex justify-end items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest">
                <span>Less</span>
                <div className="w-3 h-3 bg-white/5 rounded-[2px]" />
                <div className="w-3 h-3 bg-green-900/40 rounded-[2px]" />
                <div className="w-3 h-3 bg-green-700/60 rounded-[2px]" />
                <div className="w-3 h-3 bg-green-500 rounded-[2px]" />
                <div className="w-3 h-3 bg-green-400 rounded-[2px]" />
                <span>More</span>
            </div>

            <div className="w-full h-px bg-white/10 my-8" />

            {/* SUBSECTION: DAILY LOG */}
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl marker-font text-white uppercase">
                            {selectedDate ? getReadableDate(selectedDate) : 'Select a date'}
                        </h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest mt-1">
                            {selectedLessons.length} Classes Attended
                        </p>
                    </div>
                    {loadingDay && <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />}
                </div>

                {selectedLessons.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                        <p className="handwritten text-white/30 text-xl">No lectures attended on this date.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedLessons.map((lesson) => (
                            <div key={lesson.lesson_id} className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 flex gap-4 items-center transition-all cursor-default">
                                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-black relative border border-white/10">
                                    {lesson.banner_image ? (
                                        <img src={lesson.banner_image} alt="Banner" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-green-900/20 text-green-700 font-bold">A.I</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-white truncate group-hover:text-yellow-400 transition-colors">{lesson.title}</h4>
                                    <p className="text-xs text-white/40 line-clamp-1 mt-0.5">{lesson.lesson_summary || "No summary available."}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/60 uppercase tracking-wider">Lesson</span>
                                        <span className="text-[9px] text-white/20 uppercase">{new Date(lesson.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>

        {/* SECTION 3: ACADEMIC IDENTITY FORM */}
        <section className="space-y-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h2 className="text-xl font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">III. Academic Identity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-yellow-500 tracking-widest">Current Level</label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map(l => (
                  <button
                    key={l}
                    onClick={() => updateField('academicLevel', l)}
                    className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${profileData.academicLevel === l ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 hover:border-white/30 text-white/60'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase text-yellow-500 tracking-widest">Profession / Ambition</label>
              <input
                type="text"
                value={profileData.profession}
                onChange={(e) => updateField('profession', e.target.value)}
                placeholder="e.g. Quantum Physicist"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-yellow-400 outline-none transition-all text-lg font-serif"
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: INTELLECTUAL CURIOSITIES */}
        <section className="space-y-6 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">IV. Intellectual Curiosities</h2>
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
            
            {/* Instructional Header */}
            <div className="flex items-start gap-3 mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <span className="material-symbols-outlined text-blue-400 text-2xl shrink-0">info</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-1">How This Works</h3>
                <p className="text-sm text-white/60 leading-relaxed">
                  Add topics you're passionate about or want to explore. These help personalize your lesson recommendations.
                </p>
              </div>
            </div>

            {/* Interest Tags Display */}
            {profileData.interests.length > 0 ? (
              <div className="flex flex-wrap gap-3 mb-6">
                {profileData.interests.map(tag => (
                  <span key={tag} className="group bg-gradient-to-r from-yellow-400 to-yellow-500 text-black pl-4 pr-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 uppercase tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                    {tag}
                    <button 
                      onClick={() => removeInterest(tag)} 
                      className="hover:bg-black/20 rounded-full p-1 transition-all"
                      title="Remove interest"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="mb-6 p-6 border-2 border-dashed border-white/10 rounded-2xl text-center">
                <span className="material-symbols-outlined text-white/20 text-4xl mb-2">psychology</span>
                <p className="text-white/40 handwritten text-xl">No interests added yet. Start by typing below!</p>
              </div>
            )}

            {/* Input Field */}
            <div className="relative">
              <div className="flex items-center gap-4 border-2 border-white/10 focus-within:border-yellow-400 transition-colors rounded-2xl px-6 py-4 bg-white/5 hover:bg-white/10">
                <span className="material-symbols-outlined text-yellow-400 text-2xl">add_circle</span>
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={addInterest}
                  placeholder="Type a topic (e.g., Quantum Computing, Renaissance Art)..."
                  className="w-full bg-transparent outline-none text-xl placeholder:text-white/30 font-handwriting"
                />
                {interestInput.trim() && (
                  <span className="text-xs text-white/40 uppercase tracking-wider shrink-0">Press Enter</span>
                )}
              </div>
            </div>

            {/* Quick Suggestions */}
            {profileData.interests.length < 3 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-white/40 uppercase tracking-wider">Quick Add:</span>
                {['Machine Learning', 'Philosophy', 'Neuroscience', 'Game Theory'].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      if (!profileData.interests.includes(suggestion)) {
                        updateField('interests', [...profileData.interests, suggestion]);
                      }
                    }}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-400/50 px-3 py-1.5 rounded-lg transition-all"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* NEW SECTION: PERSONALIZED RECOMMENDATIONS */}
        {profileData.interests.length > 0 && (
          <section className="space-y-6 animate-fade-in" style={{ animationDelay: '450ms' }}>
            <div className="flex justify-between items-end border-b border-white/5 pb-2">
              <h2 className="text-xl font-bold uppercase tracking-widest text-white/40">Recommended for You</h2>
              <button
                onClick={generateRecommendations}
                disabled={loadingRecommendations}
                className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loadingRecommendations ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">refresh</span>
                    Refresh
                  </>
                )}
              </button>
            </div>

            {loadingRecommendations ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 animate-pulse">
                    <div className="aspect-video bg-white/10" />
                    <div className="p-6">
                      <div className="h-4 bg-white/10 rounded mb-3 w-3/4"></div>
                      <div className="h-3 bg-white/10 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, index) => (
                  <button
                    key={index}
                    onClick={() => startRecommendedLesson(rec.topic)}
                    className="group bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 hover:border-yellow-400/50 rounded-2xl overflow-hidden text-left transition-all shadow-lg hover:shadow-2xl hover:-translate-y-1 relative"
                  >
                    <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 relative overflow-hidden">
                      {rec.image ? (
                        <>
                          <img 
                            src={rec.image} 
                            alt={rec.topic}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/20 text-5xl">auto_stories</span>
                        </div>
                      )}
                      
                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10">
                        <span className="text-[9px] uppercase tracking-widest text-white/80 font-bold">
                          Lesson {index + 1}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 relative z-10">
                      <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors leading-tight mb-3">
                        {rec.topic}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/40 uppercase tracking-wider">
                        <span className="material-symbols-outlined text-sm">play_circle</span>
                        <span>Start Learning</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 5: CLASSROOM PREFERENCES */}
        <section className="space-y-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <h2 className="text-xl font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">V. The Classroom</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <label className="text-xs font-black uppercase text-yellow-500 tracking-widest">Learning Style</label>
              <div className="space-y-3">
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => updateField('learningStyle', s.id)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all group ${profileData.learningStyle === s.id ? 'bg-yellow-400/10 border-yellow-400' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                        <div className={`font-black uppercase tracking-widest ${profileData.learningStyle === s.id ? 'text-yellow-400' : 'text-white'}`}>{s.label}</div>
                        {profileData.learningStyle === s.id && <span className="material-symbols-outlined text-yellow-400 text-sm">check_circle</span>}
                    </div>
                    <div className="text-sm text-white/40 group-hover:text-white/60 transition-colors">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-xs font-black uppercase text-yellow-500 tracking-widest">Teacher Persona</label>
              <div className="space-y-3">
                {PERSONAS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => updateField('teacherPersona', p.id)}
                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all group ${profileData.teacherPersona === p.id ? 'bg-green-500/10 border-green-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                  >
                     <div className="flex justify-between items-center mb-1">
                        <div className={`font-black uppercase tracking-widest ${profileData.teacherPersona === p.id ? 'text-green-500' : 'text-white'}`}>{p.label}</div>
                        {profileData.teacherPersona === p.id && <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>}
                    </div>
                    <div className="text-sm text-white/40 group-hover:text-white/60 transition-colors">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER SAVE ACTION */}
        <div className="pt-8 border-t border-white/10 flex justify-between items-center">
          <p className="text-white/30 text-sm italic font-serif">"Update your registry to refine the AI's teaching model."</p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-yellow-400 transition-all shadow-xl disabled:opacity-50 flex items-center gap-3"
          >
            {saving && <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;