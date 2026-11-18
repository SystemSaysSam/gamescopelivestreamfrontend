import React, { useState } from 'react';
import { REACTION_CONFIGS, ReactionType } from './ReactionEmojis';

export interface FloatingParticle {
  id: number;
  type: ReactionType;
  x: number;
  scale: number;
  drift: number;
}

interface ReactionEngineProps {
  activeUserReaction: ReactionType | null;
  onSelectReaction: (type: ReactionType) => void;
  reactionCounts: Record<ReactionType, number>;
  floatingList: FloatingParticle[];
}

export const ReactionEngine: React.FC<ReactionEngineProps> = ({
  activeUserReaction,
  onSelectReaction,
  reactionCounts,
  floatingList
}) => {
  return (
    <>
      {/* 1. Dedicated Floating Visual Reaction Stream Overlay (Clipped inside chat, pointer-events-none) */}
      <div 
        aria-hidden="true" 
        className="absolute bottom-14 right-3 w-44 h-72 pointer-events-none overflow-hidden z-30"
      >
        {floatingList.map(particle => {
          const config = REACTION_CONFIGS.find(c => c.type === particle.type);
          if (!config) return null;

          return (
            <div
              key={particle.id}
              className="absolute bottom-2 flex items-center justify-center animate-reaction-float"
              style={{
                left: `${particle.x}%`,
                transform: `scale(${particle.scale})`,
                ['--drift' as string]: `${particle.drift}px`
              }}
            >
              <div 
                className="w-8 h-8 drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
                dangerouslySetInnerHTML={{ __html: config.svg }}
              />
            </div>
          );
        })}
      </div>

      {/* 2. Compact Reaction Counter Selector Bar (Instant reactions) */}
      <div className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-[#0e121a] border-t border-white/10 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none select-none flex-shrink-0">
        {REACTION_CONFIGS.map(config => {
          const isSelected = activeUserReaction === config.type;
          const count = reactionCounts[config.type] || config.defaultCount;

          return (
            <button
              key={config.type}
              type="button"
              onClick={() => onSelectReaction(config.type)}
              title={`${config.label} (${count})`}
              className={`flex items-center space-x-1 px-1 sm:px-1.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border transition-all text-[10px] sm:text-[11px] font-mono leading-none flex-shrink-0 active:scale-95 ${
                isSelected
                  ? 'bg-[#1e2538] border-2 border-[#00f0ff] text-[#00f0ff] font-bold shadow-sm'
                  : 'bg-[#121620] hover:bg-[#181d2a] border-white/5 hover:border-white/20 text-slate-300'
              }`}
            >
              <div 
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
                dangerouslySetInnerHTML={{ __html: config.svg }}
              />
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};