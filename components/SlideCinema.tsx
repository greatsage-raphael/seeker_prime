// FILE: components/SlideCinema.tsx
import React, { useRef, useState, useEffect } from 'react';

export const SlideCinema = ({ videoUrl, totalSlides }: { videoUrl: string, totalSlides: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const seekSlide = (index: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = (index - 1) * 30;
      setCurrentSlide(index);
    }
  };

  return (
    <div className="w-full bg-[#062012] rounded-3xl overflow-hidden shadow-2xl border-4 border-[#22c55e]/20">
      <div className="relative aspect-video bg-black">
        <video 
          ref={videoRef} 
          src={videoUrl} 
          className="w-full h-full"
          onTimeUpdate={() => {
            const slide = Math.floor(videoRef.current!.currentTime / 30) + 1;
            if (slide !== currentSlide) setCurrentSlide(slide);
          }}
        />
      </div>

      <div className="p-6 bg-black/40">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => {
                if (videoRef.current?.paused) { videoRef.current.play(); setIsPlaying(true); }
                else { videoRef.current?.pause(); setIsPlaying(false); }
            }}
            className="text-[#22c55e] hover:scale-110 transition-transform"
          >
            {isPlaying ? '⏸' : '▶️'}
          </button>

          {/* Segmented Progress Bar */}
          <div className="flex-1 flex gap-1 h-2">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <div 
                key={i}
                onClick={() => seekSlide(i + 1)}
                className={`flex-1 rounded-full cursor-pointer transition-all ${
                  i + 1 <= currentSlide ? 'bg-[#22c55e] shadow-[0_0_10px_#22c55e]' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          
          <div className="marker-font text-[#22c55e] text-sm whitespace-nowrap">
            Slide {currentSlide} / {totalSlides}
          </div>
        </div>
      </div>
    </div>
  );
};