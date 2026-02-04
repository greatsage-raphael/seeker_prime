// FILE: App.tsx
// --------------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { supabase } from './src/lib/supabase';

// Components & Pages
import Blackboard from './components/Blackboard';
import LessonPage from './pages/LessonPage';
import NotesPage from './pages/NotesPage';
import ArchivePage from './pages/ArchivePage';
import NoticeBoard from './pages/NoticeBoard';
import WelcomePage from './pages/WelcomePage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import TestPage from './pages/TestPage';
import ProfilePage from './pages/ProfilePage';

const App: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [topic, setTopic] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // 1. Sync User to Supabase (Non-blocking)
  useEffect(() => {
    const syncUser = async () => {
      if (isLoaded && isSignedIn && user) {
        // Sync profile to Supabase silently
        await supabase
          .from('students')
          .upsert({
            student_id: user.id,
            full_name: user.fullName || user.username || "Seeker Student",
            email: user.primaryEmailAddress?.emailAddress,
            profile_image_url: user.imageUrl,
          }, {
            onConflict: 'student_id'
          });
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, user]);

  // 2. Start Lesson Handler
  const handleStartLesson = () => {
    if (!topic.trim()) return;
    const lessonUuid = crypto.randomUUID();
    navigate(`/lesson/${lessonUuid}`, { state: { topic } });
    setTopic('');
    setMobileMenuOpen(false); // Close mobile menu after starting lesson
  };

  // 3. Loading State (Only for Clerk Auth)
  if (!isLoaded) {
    return (
      <div className="h-screen bg-[#1e3a2f] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-full text-white font-sans ${location.pathname === '/archive' ? 'bg-[#f4f1ea]' : 'bg-[#1a1a1a]'}`} style={{ overflow: location.pathname === '/archive' || location.pathname === '/profile' ? 'auto' : 'hidden' }}>

      {/* GLOBAL HEADER */}
      <SignedIn>
        <header className="p-4 md:px-8 border-b border-white/10 bg-[#1e1e1e]/50 backdrop-blur-xl flex items-center justify-between font-bold text-xl uppercase tracking-tight z-50">
          
          {/* Logo - Always Visible */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center border border-white/20">
              <span className="material-symbols-outlined text-[#1e3a2f] font-bold">school</span>
            </div>
            <span className="marker-font text-yellow-400 lowercase hidden sm:block">seeker</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 border-l border-white/10 pl-8">
            <Link to="/notice-board" className="text-[10px] tracking-[0.2em] text-white/40 hover:text-yellow-500 transition-colors uppercase">Notice Board</Link>
            <Link to="/archive" className="text-[10px] tracking-[0.2em] text-white/40 hover:text-green-500 transition-colors uppercase">My Lessons</Link>
            <Link to="/courses" className="text-[10px] tracking-[0.2em] text-white/40 hover:text-blue-500 transition-colors uppercase">My Courses</Link>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden text-white/60 hover:text-white p-2 transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>

          {/* Desktop Search & User */}
          <div className="hidden lg:flex items-center gap-4 flex-1 justify-end max-w-2xl px-4">
            <div className="flex gap-2 w-full">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartLesson()}
                placeholder={`What would you like to learn, ${user?.firstName}?`}
                className="bg-white/5 border border-white/10 rounded-full px-5 py-2 text-sm focus:ring-2 focus:ring-yellow-500 transition-all font-normal flex-1 outline-none handwritten text-lg"
              />
              <button
                onClick={handleStartLesson}
                className="bg-yellow-400 text-[#1e3a2f] px-6 py-2 rounded-full text-[10px] hover:bg-yellow-300 transition-all uppercase tracking-widest font-black"
              >
                Start
              </button>
            </div>
            <div className="ml-2 pl-4 border-l border-white/10 flex items-center gap-3">
              <Link to="/profile" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors" title="Student Profile">
                <span className="material-symbols-outlined text-sm">settings</span>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          {/* Mobile User Button (Top Right) */}
          <div className="lg:hidden flex items-center gap-2">
            <Link to="/profile" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/20 transition-colors">
              <span className="material-symbols-outlined text-sm">settings</span>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#1e1e1e] border-b border-white/10 px-4 py-6 space-y-4 z-40 animate-fade-in">
            {/* Mobile Search */}
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartLesson()}
                placeholder={`Learn something new...`}
                className="bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 transition-all font-normal flex-1 outline-none handwritten text-lg"
              />
              <button
                onClick={handleStartLesson}
                className="bg-yellow-400 text-[#1e3a2f] px-5 py-3 rounded-full text-[10px] hover:bg-yellow-300 transition-all uppercase tracking-widest font-black shrink-0"
              >
                Go
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <Link 
                to="/notice-board" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-base tracking-wider text-white/60 hover:text-yellow-500 transition-colors uppercase py-3 px-2 rounded-lg hover:bg-white/5"
              >
                <span className="text-2xl">📌</span>
                <span>Notice Board</span>
              </Link>
              <Link 
                to="/archive" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-base tracking-wider text-white/60 hover:text-green-500 transition-colors uppercase py-3 px-2 rounded-lg hover:bg-white/5"
              >
                <span className="text-2xl">📚</span>
                <span>My Lessons</span>
              </Link>
              <Link 
                to="/courses" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 text-base tracking-wider text-white/60 hover:text-blue-500 transition-colors uppercase py-3 px-2 rounded-lg hover:bg-white/5"
              >
                <span className="text-2xl">🎓</span>
                <span>My Courses</span>
              </Link>
            </nav>
          </div>
        )}
      </SignedIn>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 flex flex-col relative min-h-0 ${location.pathname === '/archive' ? 'bg-[#f4f1ea]' : 'bg-[#161616]'}`} style={{ overflow: location.pathname === '/archive' || location.pathname === '/profile' ? 'visible' : 'hidden' }}>
        <Routes>
          {/* HOME ROUTE */}
          <Route path="/" element={
            <>
              <SignedIn>
                <div className="flex-1 flex flex-col">
                  <Blackboard
                    content={topic || "The classroom is quiet..."}
                    fullLesson=""
                    thoughts="Consulting student profile... Ready to tailor your lecture."
                    isWriting={false}
                    topic="Classroom Session"
                  />
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center pointer-events-none px-4">
                    <h2 className="marker-font text-3xl md:text-5xl text-white opacity-10 uppercase tracking-widest leading-none">Your Private Academy</h2>
                    <p className="handwritten text-xl md:text-2xl text-white/5 mt-4">Consult the board or start a new lecture above.</p>
                  </div>
                </div>
              </SignedIn>

              <SignedOut>
                <WelcomePage />
              </SignedOut>
            </>
          } />

          {/* PROTECTED APP ROUTES */}
          <Route path="/course/:courseId" element={<CourseDetailPage />} />
          <Route path="/test/:lessonPlanId" element={<TestPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/notice-board" element={<NoticeBoard />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/notes/:lessonId" element={<NotesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      <style>{`
        .handwritten { font-family: 'Caveat', cursive; }
        .marker-font { font-family: 'Permanent Marker', cursive; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        /* Hide Scrollbar for cleaner UI */
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;

// END OF FILE: App.tsx