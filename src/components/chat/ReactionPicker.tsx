import React from 'react';
import { REACTION_CONFIGS, ReactionType } from './ReactionEmojis';
import { X, Sparkles } from 'lucide-react';

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerReaction: (type: ReactionType) => void;
}

/**
 * Compact Expressive Reaction Picker for GameScope Live
 * Renders actual visual animations (no shortcodes like :anim-skull:)
 * Includes 8 curated 3D gaming reactions:
 * ❤️ Love, 🔥 Fire, 😂 Laugh, 😮 Shock, 💀 Dead, 👏 Clap, ⚡ Hype, 🎮 Gaming
 */
export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  isOpen,
  onClose,
  onTriggerReaction,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-12 right-2 p-2.5 rounded-xl bg-[#0d121c]/98 border border-white/20 shadow-2xl z-40 w-64 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 select-none"
      role="dialog"
      aria-label="Expressive Chat Reactions"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-white/10 text-xs font-mono">
        <div className="flex items-center space-x-1.5 text-white">
          <Sparkles className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span className="font-bold tracking-wider text-[11px] uppercase">EXPRESSIVE REACTIONS</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
          title="Close Reactions"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 8 Reaction Grid: 4 columns x 2 rows */}
      <div className="grid grid-cols-4 gap-1.5">
        {REACTION_CONFIGS.map(reaction => (
          <button
            key={reaction.type}
            type="button"
            onClick={() => {
              onTriggerReaction(reaction.type);
            }}
            className="group flex flex-col items-center justify-center p-2 rounded-lg bg-[#141a27] hover:bg-[#1f283d] border border-white/5 hover:border-[#00f0ff]/50 transition-all active:scale-95 text-center"
            title={`React with ${reaction.label}`}
          >
            <div 
              className="w-7 h-7 drop-shadow-md group-hover:scale-110 transition-transform duration-150"
              dangerouslySetInnerHTML={{ __html: reaction.svg }}
            />
            <span className="text-[10px] font-mono text-slate-300 group-hover:text-white mt-1 leading-none">
              {reaction.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-2 text-[9px] font-mono text-slate-400 text-center leading-tight">
        Click to play visual 3D reaction in broadcast stream
      </div>
    </div>
  );
};