// FILE: pages/WelcomePage.tsx
// --------------------------------------------------------------------------

import React from 'react';
import { SignInButton } from '@clerk/clerk-react';

const WelcomePage: React.FC = () => {
  return (
    <div className="relative h-full w-full flex flex-col bg-[#1e3a2f] font-sans text-white overflow-y-auto selection:bg-yellow-400 selection:text-[#1e3a2f]">
      
      {/* 1. Chalkboard Texture & Glow Overlays */}
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none z-0" 
        style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/black-paper.png')` }}
      />
      <div className="fixed inset-0 bg-radial-gradient from-transparent to-[#1e3a2f]/80 z-0" />
      
      {/* Glow Effects - Fixed positioning */}
      <div className="fixed top-1/4 -left-20 w-96 h-96 bg-yellow-400/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/4 -right-20 w-96 h-96 bg-yellow-400/5 rounded-full blur-[100px] pointer-events-none" />

      {/* 2. Navigation Header */}
      <header className="relative z-10 w-full px-6 lg:px-20 py-8 flex items-center justify-between max-w-7xl mx-auto shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 text-[#1e3a2f] p-2 rounded-lg shadow-lg">
            <span className="material-symbols-outlined text-2xl font-bold">school</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight uppercase marker-font text-yellow-400">Seeker</h2>
        </div>
        
        <div className="flex items-center gap-8">
          <SignInButton mode="modal">
            <button className="bg-transparent border border-white/20 hover:border-yellow-400/50 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              Sign In
            </button>
          </SignInButton>
        </div>
      </header>

      {/* 3. Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center py-20 min-h-[600px]">
        <div className="max-w-3xl flex flex-col items-center animate-fade-in">
          
          {/* Central Scholar Icon */}
          <div className="mb-10 text-yellow-400">
            <span 
              className="material-symbols-outlined !text-[120px] drop-shadow-[0_0_30px_rgba(250,204,20,0.4)]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_stories
            </span>
          </div>

          <div className="space-y-6 mb-12">
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight text-white leading-[0.9] uppercase marker-font">
              Your Private<span className="text-yellow-400 italic">tutor</span> Awaits
            </h1>
            <p className="handwritten text-xl md:text-3xl text-white/60 max-w-xl mx-auto leading-relaxed italic">
              "What you seek is also seeking you." — Step into a personalized realm of AI-driven mentorship.
            </p>
          </div>

          {/* CTA: Clerk Sign In Trigger */}
          <SignInButton mode="modal">
            <button className="group relative bg-yellow-400 text-[#1e3a2f] px-12 py-6 rounded-2xl text-xl font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_50px_rgba(250,204,20,0.2)] flex items-center gap-4">
              <span>Enter Classroom</span>
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </button>
          </SignInButton> <br />

          {/* Est Date */}
          <div className="mt-16 flex items-center gap-6 opacity-20">
            <div className="h-[1px] w-12 bg-white" />
            <span className="text-[10px] tracking-[0.5em] uppercase font-black">Est. MMXXVI</span>
            <div className="h-[1px] w-12 bg-white" />
          </div>
        </div>
      </main>

      {/* 4. Features Grid */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon="psychology" 
            title="Cognitive AI" 
            desc="An intelligence that adapts to your mental model and learning speed." 
          />
          {/* UPDATED CARD */}
          <FeatureCard 
            icon="record_voice_over" 
            title="1:1 Mentoring" 
            desc="Destroying the 'one size fits all' model of education through hyper-personalization." 
          />
          <FeatureCard 
            icon="shield_person" 
            title="Private Mentorship" 
            desc="A secure, data-private environment for your intellectual growth." 
          />
        </div>
      </div>

      {/* 5. Footer */}
      <footer className="relative z-10 w-full py-10 border-t border-white/5 bg-black/20 shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">
            © 2026 Seeker. Pursue wisdom, endlessly.
          </p>
          <div className="flex items-center gap-8 text-[9px] font-black text-white/20 uppercase tracking-widest">
            <a href="#" className="hover:text-yellow-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-yellow-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-yellow-400 transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Sub-component for clean cards
const FeatureCard = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
  <div className="p-8 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-md hover:bg-white/10 transition-all group border-b-4 border-b-transparent hover:border-b-yellow-400">
    <span className="material-symbols-outlined text-yellow-400 mb-4 text-3xl group-hover:scale-110 transition-transform">{icon}</span>
    <h3 className="marker-font text-white text-lg mb-2 uppercase tracking-tight">{title}</h3>
    <p className="handwritten text-white/40 text-lg leading-tight">{desc}</p>
  </div>
);

export default WelcomePage;