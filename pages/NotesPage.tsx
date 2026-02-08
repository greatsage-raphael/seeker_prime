// FILE: pages/NotesPage.tsx
// --------------------------------------------------------------------------

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../src/lib/supabase';
import IntelligentMarkdown from '@/components/IntelligentMarkdown';
import CertificateView from '@/components/CertificateView'; 
import BadgeUnlockModal from '@/components/BadgeUnlockModal';

const IMAGE_MODEL_NAME = 'gemini-3-pro-image-preview'; 
const TEXT_MODEL_NAME = 'gemini-3-pro-preview'; 

const base64ToBlob = (base64: string, contentType: string) => {
  const base64String = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
  return new Blob([new Uint8Array(byteNumbers)], { type: contentType });
};

const NotesPage: React.FC = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [lesson, setLesson] = useState<any>(null);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [showComic, setShowComic] = useState(false); 
  const [currentSlide, setCurrentSlide] = useState(1);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  // --- PROGRESSION STATE ---
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [nextPlan, setNextPlan] = useState<any>(null);

  // --- MODAL STATES ---
  const [selectedComicIndex, setSelectedComicIndex] = useState<number | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const cinemaTriggered = useRef(false);
  const animatedTriggered = useRef(false);
  const bannerTriggered = useRef(false);
  const notesTriggered = useRef(false);
  const podcastTriggered = useRef(false);
  const comicTriggered = useRef(false);
  const location = useLocation();
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<any>(null);

  useEffect(() => {
    if (location.state?.unlockedBadge) {
      setUnlockedBadge(location.state.unlockedBadge);
      setShowBadgeModal(true);
      // Clean up state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    };
  }, []);

  // Podcast Audio Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !lesson?.podcast_url) return;
    const updateProgress = () => {
      if (audio.duration) {
        setAudioCurrentTime(audio.currentTime);
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [lesson?.podcast_url]);

  useEffect(() => {
    const fetchAndTrigger = async () => {
      const { data } = await supabase.from('lessons').select('*').eq('lesson_id', lessonId).single();
      if (!data) return;
      setLesson(data);

      const { data: planData } = await supabase.from('lesson_plans').select('*').eq('id', lessonId).single();
      if (planData) {
        setCurrentPlan(planData);
        const { data: next } = await supabase
          .from('lesson_plans')
          .select('*')
          .eq('module_id', planData.module_id)
          .eq('order_index', planData.order_index + 1)
          .single();
        setNextPlan(next);
      }

      if (!data.banner_image && !bannerTriggered.current) {
        bannerTriggered.current = true;
        generateAndUploadBanner(data.title);
      }
      if (!data.ai_notes && !notesTriggered.current) {
        notesTriggered.current = true;
        handlePolishing(data.lesson_summary, data.thoughts);
      }
      if (data.video_status === 'idle' && !cinemaTriggered.current) {
        cinemaTriggered.current = true;
        fetch('https://seeker-server-tn3b.onrender.com/slides/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, summary: data.lesson_summary, thoughts: data.thoughts, title: data.title })
        }).catch(err => console.error(err));
      }
      if ((!data.podcast_status || data.podcast_status === 'idle') && !data.podcast_url && !podcastTriggered.current) {
        podcastTriggered.current = true;
        fetch('https://seeker-server-tn3b.onrender.com/slides/generate-podcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId, summary: data.lesson_summary, title: data.title })
        }).catch(err => console.error(err));
      }
      if ((!data.animated_video_status || data.animated_video_status === 'idle') && !data.animated_video_url && !animatedTriggered.current) {
        animatedTriggered.current = true;
        fetch('https://seeker-server-tn3b.onrender.com/video/generate-cinematic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId, summary: data.lesson_summary, title: data.title, studentId: data.student_id })
        }).catch(err => console.error(err));
      }
    };

    fetchAndTrigger();

    const channel = supabase.channel(`notes_sync_${lessonId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lessons', filter: `lesson_id=eq.${lessonId}` }, (p) => setLesson(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lesson_plans', filter: `id=eq.${lessonId}` }, (p) => setCurrentPlan(p.new))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lessonId]);

  // Comic Navigation Handlers
  const nextComic = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedComicIndex !== null && selectedComicIndex < lesson.comic_pages.length - 1) {
      setSelectedComicIndex(selectedComicIndex + 1);
    }
  };

  const prevComic = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (selectedComicIndex !== null && selectedComicIndex > 0) {
      setSelectedComicIndex(selectedComicIndex - 1);
    }
  };

  const handleComicToggle = () => {
    if (!showComic && (!lesson.comic_pages || lesson.comic_pages.length === 0) && !comicTriggered.current) {
      comicTriggered.current = true;
      fetch('https://seeker-server-tn3b.onrender.com/slides/generate-comic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, ai_notes: lesson.ai_notes, title: lesson.title })
      }).catch(err => console.error("Comic Trigger Error:", err));
    }
    setShowComic(!showComic);
  };

  const generateAndUploadBanner = async (title: string) => {
    setIsGeneratingBanner(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({ 
        model: IMAGE_MODEL_NAME, 
        contents: [{ role: 'user', parts: [{ text: `High-detail wide academic banner for "${title}". No text.` }] }]
      });
      const part = response.candidates?.[0].content.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        const blob = base64ToBlob(part.inlineData.data, part.inlineData.mimeType);
        const fileName = `banners/${lessonId}_banner.jpg`;
        await supabase.storage.from('seeker').upload(fileName, blob, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from('seeker').getPublicUrl(fileName);
        await supabase.from('lessons').update({ banner_image: publicUrl }).eq('lesson_id', lessonId);
        setLesson((prev: any) => ({ ...prev, banner_image: publicUrl }));
      }
    } catch (e) { console.error(e); } finally { setIsGeneratingBanner(false); }
  };

  const handlePolishing = async (summary: string, thoughts: string) => {
    setIsPolishing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Expert academic note-taker. Transform this to Markdown study notes. THOUGHTS: ${thoughts} | TRANSCRIPT: ${summary}`;
      const response = await ai.models.generateContent({ model: TEXT_MODEL_NAME, contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        await supabase.from('lessons').update({ ai_notes: text }).eq('lesson_id', lessonId);
        setLesson((prev: any) => ({ ...prev, ai_notes: text }));
      }
    } catch (e) { console.error(e); } finally { setIsPolishing(false); }
  };

  const togglePublic = async () => {
    const newState = !lesson.is_public;
    await supabase.from('lessons').update({ is_public: newState }).eq('lesson_id', lessonId);
    setLesson((prev: any) => ({ ...prev, is_public: newState }));
  };

  const handleShare = async () => {
    if (!lesson.is_public) return alert("Enable 'Public Access' first.");
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: lesson.title, url });
    else { navigator.clipboard.writeText(url); alert("Link Copied!"); }
  };

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percentage * audio.duration;
  };

  if (!lesson) return <div className="h-screen bg-[#f4f1ea] flex items-center justify-center font-bold text-gray-400 uppercase tracking-widest animate-pulse">Consulting Archives...</div>;

  const contentToDisplay = (isPolishing || showOriginal || !lesson.ai_notes) ? lesson.lesson_summary : lesson.ai_notes;
  
  // Ownership Check
  const isOwner = user?.id === lesson?.student_id;

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen h-auto overflow-auto bg-[#e5e7eb] font-sans text-gray-900 overscroll-contain">
      
      {showBadgeModal && unlockedBadge && (
        <BadgeUnlockModal 
          badge={unlockedBadge} 
          onClose={() => setShowBadgeModal(false)} 
        />
      )}
      {/* LEFT SIDEBAR: LESSON IMAGES */}
      <aside className="w-full lg:w-72 bg-[#d1d5db] p-6 shrink-0 lg:h-full lg:overflow-y-auto lg:border-r border-gray-300 shadow-inner">
        <h3 className="marker-font text-gray-500 uppercase text-xs mb-8 tracking-widest text-center">Visual Aids</h3>
        <div className="flex lg:flex-col gap-8 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0">
          {lesson.lesson_images?.map((url: string, i: number) => (
            <div key={i} className="min-w-[240px] lg:min-w-0 bg-white p-2 shadow-xl border-4 border-white rotate-1 hover:rotate-0 transition-all duration-500">
              <img src={url} className="w-full h-auto grayscale-[0.2] hover:grayscale-0 transition-all" alt="Lecture Aid" />
            </div>
          ))}
        </div>
      </aside>

      {/* CENTER: THE NOTEBOOK VIEW */}
      <main className="flex-1 bg-[#f4f1ea] lg:h-full lg:overflow-y-auto scroll-smooth">
        <div className="max-w-4xl mx-auto py-8 lg:py-16 px-4 sm:px-10">
          
          <div className="w-full h-32 sm:h-56 mb-8 relative rounded-3xl overflow-hidden shadow-2xl bg-gray-200 border-4 border-white">
            {isGeneratingBanner ? (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : lesson.banner_image && <img src={lesson.banner_image} className="w-full h-full object-cover" alt="Banner" />}
          </div>

          <div className="bg-white shadow-2xl rounded-sm relative border-l-[40px] sm:border-l-[80px] border-red-50 pb-20 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: 'linear-gradient(rgba(173, 216, 230, 0.4) 1px, transparent 1px)', backgroundSize: '100% 2.5rem' }} />

            <div className="relative z-10 px-8 sm:px-16 py-12">
              <header className="flex flex-col sm:flex-row justify-between items-start border-b-4 border-gray-100 mb-12 pb-10 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <h1 className="marker-font text-4xl sm:text-6xl text-gray-800 uppercase leading-tight tracking-tighter">{lesson.title}</h1>
                    {lesson.podcast_url && (
                      <button onClick={() => setShowAudioPlayer(!showAudioPlayer)} className="w-12 h-12 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 transition-all hover:scale-110 active:scale-95">
                        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
                      </button>
                    )}
                  </div>
                  
                  {showAudioPlayer && lesson.podcast_url && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-yellow-500/20 max-w-md">
                      <audio ref={audioRef} src={lesson.podcast_url} className="hidden" preload="metadata" />
                      <div className="flex items-center gap-3">
                        <button onClick={() => audioRef.current?.paused ? audioRef.current?.play() : audioRef.current?.pause()} className="w-10 h-10 bg-yellow-500 hover:bg-yellow-600 rounded-full flex items-center justify-center shadow-md transition-all">
                          {isPlaying ? <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg> : <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                        </button>
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden cursor-pointer" onClick={handleProgressClick}>
                          <div className="h-full bg-yellow-500 transition-all duration-100" style={{ width: `${audioProgress || 0}%` }} />
                        </div>
                        <span className="text-xs font-mono text-gray-500 w-16 text-right tabular-nums">{formatTime(audioCurrentTime || 0)}</span>
                        <span className="text-xs font-mono text-gray-400">/</span>
                        <span className="text-xs font-mono text-gray-400 w-16 tabular-nums">{formatTime(audioDuration || 0)}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="relative inline-flex items-center cursor-pointer scale-90 origin-left">
                        <input type="checkbox" className="sr-only peer" checked={showOriginal} onChange={() => setShowOriginal(!showOriginal)} />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Original Transcript</span>
                    </label>

                    <label className="relative inline-flex items-center cursor-pointer scale-90 origin-left">
                        <input type="checkbox" className="sr-only peer" checked={showComic} onChange={handleComicToggle} />
                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                        <span className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Comic Mode</span>
                    </label>

                    {/* Only Owner can toggle Public Access */}
                    {isOwner && (
                      <label className="relative inline-flex items-center cursor-pointer scale-90 origin-left">
                          <input type="checkbox" className="sr-only peer" checked={lesson.is_public} onChange={togglePublic} />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                          <span className="ml-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Public Access</span>
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {isOwner && <button onClick={handleShare} className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${lesson.is_public ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' : 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'}`}>SHARE</button>}
                    <button onClick={() => navigate(isOwner ? '/archive' : '/notice-board')} className="flex-1 sm:flex-none px-8 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold uppercase shadow-xl hover:scale-105 transition-all">EXIT</button>
                </div>
              </header>

              <article className="relative min-h-[300px]">
                {showComic ? (
                  <div className="space-y-16 animate-fade-in pb-20">
                    {lesson.comic_status === 'processing' ? (
                      <div className="py-32 text-center flex flex-col items-center">
                          <div className="w-20 h-20 border-8 border-yellow-400 border-t-transparent rounded-full animate-spin mb-8 shadow-[0_0_40px_rgba(250,204,21,0.2)]" />
                          <h3 className="marker-font text-4xl text-yellow-600 animate-pulse uppercase">Banana Sensei is Drawing...</h3>
                          <p className="handwritten text-2xl text-gray-400 italic mt-4">Maintaining visual anchors & continuity.</p>
                      </div>
                    ) : lesson.comic_pages?.length > 0 ? (
                      <div className="grid grid-cols-1 gap-12">
                        {lesson.comic_pages.map((url: string, i: number) => (
                          <div 
                            key={i} 
                            onClick={() => setSelectedComicIndex(i)}
                            className="group relative bg-white p-4 shadow-[30px_30px_0px_rgba(0,0,0,0.08)] border-4 border-black transition-all hover:scale-[1.01] hover:-rotate-1 cursor-zoom-in"
                          >
                              <img src={url} className="w-full h-auto object-cover" alt={`Comic Page ${i+1}`} />
                              <div className="absolute -bottom-6 -right-6 bg-yellow-400 border-4 border-black px-6 py-2 marker-font text-2xl uppercase shadow-xl">
                                  Page {i + 1}
                              </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-32 text-center text-gray-300 marker-font text-3xl uppercase">Waiting for Sketchbook...</div>
                    )}
                  </div>
                ) : (
                  <>
                    {isPolishing && (
                      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                        <div className="w-full h-1 bg-blue-400 shadow-[0_0_25px_rgba(96,165,250,1)] animate-beam-scan absolute top-0" />
                      </div>
                    )}
                    <div className={`handwritten prose prose-2xl max-w-none transition-opacity duration-1000 ${isPolishing ? 'opacity-40' : 'opacity-100'}`}>
                    <IntelligentMarkdown content={contentToDisplay} />
                    </div>
                  </>
                )}
              </article>

              <section className="mt-20 pt-16 border-t-8 border-gray-50">
                <div className="bg-[#062012] rounded-[40px] overflow-hidden shadow-2xl border-4 border-[#22c55e]/30 relative">
                  <div className="p-4 bg-black/40 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-[#22c55e] rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" /><span className="marker-font text-white uppercase text-xs tracking-widest">Slide Presentation</span></div>
                  </div>
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {lesson.video_status === 'processing' ? <div className="text-center space-y-6"><div className="w-16 h-16 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto" /><p className="marker-font text-[#22c55e] text-2xl animate-pulse uppercase">Animating Lecture...</p></div> : lesson.video_url ? <video ref={videoRef} src={lesson.video_url} controls className="w-full h-full" onTimeUpdate={() => setCurrentSlide(Math.floor(videoRef.current!.currentTime / 30) + 1)} /> : <div className="text-white/10 marker-font text-2xl uppercase">Pending...</div>}
                  </div>
                  {lesson.video_url && (
                    <div className="p-6 bg-black/60 flex items-center gap-8">
                      <div className="flex-1 flex gap-1 h-1.5">{lesson.video_manifest?.map((_: any, i: number) => (<div key={i} className={`flex-1 rounded-full transition-all duration-700 ${i + 1 <= currentSlide ? 'bg-[#22c55e] shadow-[0_0_10px_#22c55e]' : 'bg-white/10'}`} />))}</div>
                      <div className="marker-font text-[#22c55e] text-lg whitespace-nowrap tracking-tighter">SLIDE <span className="text-white text-3xl">{currentSlide}</span> / {lesson.video_manifest?.length}</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-20 pt-16 border-t-8 border-gray-50">
                <div className="bg-[#1a1a1a] rounded-[40px] overflow-hidden shadow-2xl border-4 border-yellow-500/30 relative">
                  <div className="p-4 bg-black/40 flex justify-between items-center border-b border-white/5">
                    <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_10px_#facc15]" /><span className="marker-font text-white uppercase text-xs tracking-widest">Cinematic Explainer</span></div>
                  </div>
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {lesson.animated_video_status === 'processing' ? <div className="text-center space-y-6 p-10"><div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" /><p className="marker-font text-yellow-500 text-2xl animate-pulse uppercase">Veo is filming...</p></div> : lesson.animated_video_url ? <video src={lesson.animated_video_url} controls className="w-full h-full" /> : <div className="text-white/10 marker-font text-2xl uppercase">Studio initializing...</div>}
                  </div>
                  {lesson.animated_video_url && <div className="p-4 bg-yellow-500/10 border-t border-yellow-500/20"><p className="text-[10px] text-yellow-500/60 font-black uppercase tracking-widest text-center">Synthesized with Google Veo 3.1 & Lyria</p></div>}
                </div>
              </section>

              {/* PROGRESSION & CERTIFICATION SECTION - ONLY VISIBLE TO OWNER */}
              {isOwner && (
                <section className="mt-24 pb-20 border-t-8 border-gray-100 pt-16">
                  <div className="max-w-2xl mx-auto space-y-12">
                    
                    {/* Exam Module / Certificate */}
                    <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-dashed border-gray-200 text-center space-y-6">
                      <h3 className="marker-font text-3xl text-gray-400 uppercase">Certification</h3>
                      
                      {currentPlan?.status !== 'completed' ? (
                        <div className="space-y-4">
                          <p className="handwritten text-2xl text-gray-500">Ready to prove your mastery?</p>
                          <button 
                            onClick={() => navigate(`/test/${lessonId}`)}
                            className="px-12 py-6 bg-yellow-400 text-black rounded-2xl marker-font text-2xl uppercase shadow-2xl hover:scale-105 transition-all flex items-center gap-4 mx-auto"
                          >
                            Begin Oral Exam
                            <span className="material-symbols-outlined animate-pulse">mic</span>
                          </button>
                        </div>
                      ) : (
                        // INLINE CERTIFICATE DISPLAY
                        <CertificateView
                          userName={user ? (user.fullName || user.firstName || "Seeker Student") : "Seeker Student"}
                          topicTitle={lesson.title}
                          completionDate={new Date().toLocaleDateString()}
                        />
                      )}
                    </div>

                    {/* Progression Module */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-4">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">The Next Chapter</span>
                        <span className={`text-[10px] font-black uppercase ${currentPlan?.status === 'completed' ? 'text-green-500' : 'text-red-400'}`}>
                          {currentPlan?.status === 'completed' ? 'Unlocked' : 'Locked'}
                        </span>
                      </div>

                      <button 
                        disabled={currentPlan?.status !== 'completed' || !nextPlan}
                        onClick={() => navigate(`/lesson/${nextPlan.id}`, { state: { topic: nextPlan.title } })}
                        className={`w-full p-10 rounded-[2.5rem] marker-font text-4xl uppercase transition-all flex items-center justify-between group
                          ${currentPlan?.status === 'completed' && nextPlan 
                            ? 'bg-gray-900 text-white hover:bg-green-600 shadow-2xl active:scale-95' 
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed grayscale'}`}
                      >
                        <div className="text-left">
                          <span className="text-[10px] block opacity-40 mb-2">Block {currentPlan?.order_index + 2}</span>
                          {nextPlan ? nextPlan.title : "Academy Completed"}
                        </div>
                        <span className="material-symbols-outlined text-5xl group-hover:translate-x-4 transition-transform">
                          {currentPlan?.status === 'completed' ? 'arrow_forward' : 'lock'}
                        </span>
                      </button>

                      {currentPlan?.status !== 'completed' && (
                        <p className="text-center handwritten text-xl text-gray-400 italic mt-4">
                          Pass the head examiner's test to continue your education.
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

            </div>
          </div>
        </div>
      </main>

      {/* COMIC FULL-SCREEN OVERLAY */}
      {selectedComicIndex !== null && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-fade-in"
          onClick={() => setSelectedComicIndex(null)}
        >
          {/* Close Button */}
          <button className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-5xl">close</span>
          </button>

          {/* Navigation - Previous */}
          {selectedComicIndex > 0 && (
            <button 
              onClick={prevComic}
              className="absolute left-4 md:left-10 z-10 w-16 h-16 bg-white/5 hover:bg-yellow-400 hover:text-black rounded-full flex items-center justify-center transition-all border border-white/10"
            >
              <span className="material-symbols-outlined text-4xl">arrow_back</span>
            </button>
          )}

          {/* The Image Container */}
          <div 
            className="relative max-w-5xl w-full max-h-full bg-white p-2 border-4 border-white shadow-2xl rotate-0 transition-transform duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={lesson.comic_pages[selectedComicIndex]} 
              className="w-full h-full object-contain"
              alt="Comic Zoom" 
            />
            <div className="absolute -bottom-4 -right-4 bg-yellow-400 border-2 border-black px-4 py-1 marker-font text-xl text-black">
               PAGE {selectedComicIndex + 1}
            </div>
          </div>

          {/* Navigation - Next */}
          {selectedComicIndex < lesson.comic_pages.length - 1 && (
            <button 
              onClick={nextComic}
              className="absolute right-4 md:right-10 z-10 w-16 h-16 bg-white/5 hover:bg-yellow-400 hover:text-black rounded-full flex items-center justify-center transition-all border border-white/10"
            >
              <span className="material-symbols-outlined text-4xl">arrow_forward</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        .handwritten { font-family: 'Caveat', cursive; }
        .marker-font { font-family: 'Permanent Marker', cursive; }
        @keyframes beam-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-beam-scan { animation: beam-scan 4s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default NotesPage;