import React from 'react';
import { getBadgeAsset } from '../src/lib/constants';

interface BadgeUnlockModalProps {
  badge: { name: string; description: string; slug: string; xp_reward: number };
  onClose: () => void;
}

const BadgeUnlockModal: React.FC<BadgeUnlockModalProps> = ({ badge, onClose }) => {
  const asset = getBadgeAsset(badge.slug);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="relative max-w-lg w-full bg-[#1a1a1a] border-2 border-yellow-400/30 rounded-[3rem] p-10 text-center shadow-[0_0_100px_rgba(250,204,20,0.2)]">
        
        {/* Animated Background Glow */}
        <div className="absolute inset-0 bg-yellow-400/5 rounded-[3rem] animate-pulse pointer-events-none" />

        <h2 className="marker-font text-5xl text-yellow-400 uppercase tracking-tighter mb-2">Honors Received</h2>
        <p className="handwritten text-2xl text-white/40 mb-8 italic">"A new distinction has been added to your registry."</p>

        {/* Badge Media */}
        <div className="w-48 h-48 mx-auto mb-8 relative rounded-2xl overflow-hidden border-4 border-yellow-400 shadow-[0_0_40px_rgba(250,204,20,0.4)]">
          {asset?.vid ? (
            <video src={asset.vid} autoPlay loop muted playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={asset?.img} className="w-full h-full object-cover" alt={badge.name} />
          )}
        </div>

        <h3 className="marker-font text-3xl text-white uppercase mb-2">{badge.name}</h3>
        <p className="handwritten text-xl text-white/60 mb-8 px-4">{badge.description}</p>

        <div className="bg-yellow-400/10 border border-yellow-400/20 py-3 px-6 rounded-xl inline-block mb-10">
          <span className="text-yellow-400 font-black tracking-widest uppercase text-sm">+ {badge.xp_reward} Academic XP</span>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-5 bg-yellow-400 text-black rounded-2xl marker-font text-2xl uppercase shadow-xl hover:scale-105 transition-all"
        >
          Collect Distinction
        </button>
      </div>
    </div>
  );
};

export default BadgeUnlockModal;