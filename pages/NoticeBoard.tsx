import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

const NoticeBoard: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicLessons = async () => {
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*, students(profile_image_url, full_name)')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLessons(data || []);
      } catch (err) {
        console.error("Error fetching notice board:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicLessons();
  }, []);

  if (loading) return (
    <div className="h-screen bg-[#3d2b1f] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    // CHANGE 1: Switched from 'min-h-screen' to 'h-screen overflow-y-auto'.
    // This creates an internal scroll container that ignores the Body's 'overflow: hidden' lock.
    <div className="h-screen w-full overflow-y-auto bg-[#3d2b1f] font-sans relative">
      
      {/* Container for content with padding */}
      <div className="min-h-full p-6 md:p-16 lg:p-24">
        
        {/* Texture Overlay - Fixed relative to the viewport */}
        <div className="fixed inset-0 opacity-10 pointer-events-none z-0" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/cork-board.png')` }} />

        <header className="max-w-7xl mx-auto mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
          <div className="animate-fade-in">
            <h1 className="marker-font text-6xl md:text-8xl text-yellow-500 uppercase tracking-tighter leading-none drop-shadow-lg">Notice Board</h1>
            <p className="handwritten text-xl md:text-3xl text-white/60 mt-4 max-w-xl italic">Public lectures shared by the Seeker community.</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate('/archive')} className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl marker-font text-lg uppercase transition-all">My Lessons</button>
            <button onClick={() => navigate('/')} className="px-8 py-4 bg-yellow-600 text-white rounded-2xl marker-font text-lg uppercase shadow-2xl transition-all hover:scale-105">New Lesson</button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 relative z-10 pb-24">
          {lessons.map((lesson) => (
            <div key={lesson.lesson_id} onClick={() => navigate(`/notes/${lesson.lesson_id}`)} className="notebook-wrapper group cursor-pointer">
              <div className="notebook-cover relative w-full aspect-[3/4.2] bg-[#fdfbf7] rounded-r-2xl shadow-2xl flex flex-col overflow-hidden border-l-[15px] border-black/10 transition-all duration-500 hover:-translate-y-2">

                {/* Image Banner Section */}
                <div className="h-[40%] w-full bg-gray-200 relative overflow-hidden">
                  <img src={lesson.banner_image} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="" />
                  <div className="absolute inset-0 bg-black/5" />
                </div>

                {/* Text Content Section */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-[#fdfbf7]">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                        Shared {new Date(lesson.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* PROFILE IMAGE NEXT TO TITLE */}
                    <div className="flex items-start gap-4 group/title">
                      <h2 className="marker-font text-2xl md:text-3xl text-gray-800 leading-tight uppercase group-hover:text-yellow-700 transition-colors">
                        {lesson.title}
                      </h2>
                      <div className="shrink-0 mt-1">
                        {lesson.students?.profile_image_url ? (
                          <img
                            src={lesson.students.profile_image_url}
                            className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover ring-2 ring-yellow-500/20"
                            alt="Author"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-md">
                            {lesson.students?.full_name?.substring(0, 1) || 'S'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="handwritten text-lg text-gray-500 italic line-clamp-3">
                      {lesson.lesson_summary}
                    </p>
                  </div>
                </div>

                <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/5 to-transparent pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .marker-font { font-family: 'Permanent Marker', cursive; }
        .handwritten { font-family: 'Caveat', cursive; }
        .notebook-wrapper { perspective: 1500px; }
        .notebook-cover { transform-origin: left center; }
        .notebook-wrapper:hover .notebook-cover {
           transform: rotateY(-8deg);
           box-shadow: -20px 30px 60px rgba(0,0,0,0.3);
        }
        
        /* Optional: Custom scrollbar styling to match the theme */
        ::-webkit-scrollbar {
          width: 10px;
        }
        ::-webkit-scrollbar-track {
          background: #3d2b1f; 
        }
        ::-webkit-scrollbar-thumb {
          background: #ca8a04; 
          border-radius: 5px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #eab308; 
        }
      `}</style>
    </div>
  );
};

export default NoticeBoard;