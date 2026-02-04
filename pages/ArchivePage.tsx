import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../src/lib/supabase';

const ArchivePage: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enable scrolling and set background for this page
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.body.style.height = 'auto';
    document.documentElement.style.height = 'auto';
    document.body.style.backgroundColor = '#f4f1ea';
    document.documentElement.style.backgroundColor = '#f4f1ea';

    return () => {
      // Reset on cleanup
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.backgroundColor = '';
      document.documentElement.style.backgroundColor = '';
    };
  }, []);

  useEffect(() => {
    const fetchLessons = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setLessons(data || []);
      } catch (err) {
        console.error("Error fetching library:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLessons();
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-6 md:p-16 lg:p-24 font-sans selection:bg-green-200" style={{ minHeight: '100%', height: 'auto' }}>
      <header className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="animate-fade-in">
          <h1 className="marker-font text-6xl md:text-8xl text-gray-800 uppercase tracking-tighter leading-none">My Archive</h1>
          <p className="handwritten text-xl md:text-3xl text-gray-400 mt-4 max-w-xl italic">
            "Education is not the filling of a pail, but the lighting of a fire."
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full md:w-auto px-10 py-4 bg-gray-900 text-white rounded-2xl marker-font text-xl uppercase tracking-widest active:scale-95 transition-all shadow-2xl"
        >
          New Lesson
        </button>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20 pb-24">
        {lessons.length === 0 ? (
          <div className="col-span-full py-48 text-center border-4 border-dashed border-gray-200 rounded-3xl">
            <h2 className="marker-font text-5xl text-gray-300">Shelf Empty</h2>
          </div>
        ) : (
          lessons.map((lesson) => (
            <div
              key={lesson.lesson_id}
              onClick={() => navigate(`/notes/${lesson.lesson_id}`)}
              className="notebook-wrapper group cursor-pointer"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* NOTEBOOK CONTAINER */}
              <div className="notebook-cover relative w-full aspect-[3/4.2] bg-white rounded-r-2xl shadow-[0_15px_35px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden border-l-[15px] border-black/5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">

                {/* Visual Header */}
                <div className="h-[45%] w-full bg-gray-100 relative overflow-hidden">
                  {lesson.banner_image ? (
                    <img
                      src={lesson.banner_image}
                      className="cover-image w-full h-full object-cover grayscale opacity-60 transition-all duration-700 scale-110"
                      alt="Cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-green-900/10 flex items-center justify-center">
                      <span className="marker-font text-green-700/10 text-9xl">S.A</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent group-active:bg-transparent transition-colors" />
                </div>

                {/* Cover Details */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-white relative">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">
                        Vol. {new Date(lesson.created_at).toLocaleDateString()}
                      </span>
                      <div className="dot-indicator w-2 h-2 rounded-full bg-green-500 opacity-0 transition-opacity" />
                    </div>
                    <h2 className="title-text marker-font text-3xl md:text-4xl text-gray-800 leading-[0.9] transition-colors uppercase">
                      {lesson.title}
                    </h2>
                  </div>

                  <div className="border-t-2 border-gray-50 pt-6">
                    <p className="handwritten text-lg md:text-xl text-gray-400 line-clamp-3 leading-tight italic">
                      {lesson.lesson_summary || "Lesson archive ready."}
                    </p>
                  </div>
                </div>

                {/* Binding Shadows */}
                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .notebook-wrapper {
          perspective: 1500px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y pinch-zoom;
        }

        .notebook-cover {
          transform-origin: left center;
          will-change: transform, box-shadow;
        }

        /* Unified Desktop Hover & Mobile Touch Trigger */
        .notebook-wrapper:hover .notebook-cover,
        .notebook-wrapper:active .notebook-cover {
           transform: rotateY(-22deg) translateX(10px) scale(1.04);
           box-shadow: -25px 45px 85px -15px rgba(0,0,0,0.35);
           border-left-width: 18px;
        }

        .notebook-wrapper:hover .cover-image,
        .notebook-wrapper:active .cover-image {
           filter: grayscale(0);
           opacity: 1;
           transform: scale(1);
        }

        .notebook-wrapper:hover .title-text,
        .notebook-wrapper:active .title-text {
           color: #15803d; /* green-700 */
        }

        .notebook-wrapper:hover .dot-indicator,
        .notebook-wrapper:active .dot-indicator {
           opacity: 1;
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ArchivePage;