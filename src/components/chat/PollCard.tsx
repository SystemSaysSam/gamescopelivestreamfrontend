import React, { useState } from 'react';
import { BarChart3, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { LivePoll } from '../../types';

interface PollCardProps {
  poll: LivePoll | null;
  onVote: (optionId: string) => void;
}

export const PollCard: React.FC<PollCardProps> = ({ poll, onVote }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!poll || poll.status === 'closed') {
    return null; // Do not reserve vertical space when no active poll
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#0d121c]/95 overflow-hidden transition-all duration-200 animate-message-entry">
      
      {/* Compact Header Bar */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-2.5 py-1 bg-black/40 border-b border-white/5 flex items-center justify-between cursor-pointer select-none hover:bg-black/60 transition-colors"
      >
        <div className="flex items-center space-x-1.5">
          <BarChart3 className="w-3 h-3 text-[#00f0ff]" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-white">
            LIVE POLL
          </span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 font-semibold">
            {poll.status.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-400">
          <Clock className="w-2.5 h-2.5 text-slate-400" />
          <span>{poll.deadlineTime}</span>
          <span className="text-slate-400">
            {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </span>
        </div>
      </div>

      {/* Compact Poll Body */}
      {!isCollapsed && (
        <div className="p-2 space-y-1.5">
          <p className="font-sans font-medium text-[11px] text-slate-200 leading-tight">
            {poll.question}
          </p>

          {/* Compact Options */}
          <div className="space-y-1">
            {poll.options.map(option => {
              const isSelected = poll.userVotedOptionId === option.id;
              const percentage = poll.totalVotes > 0 
                ? Math.round((option.votes / poll.totalVotes) * 100) 
                : 0;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onVote(option.id)}
                  className={`group relative w-full px-2 py-1 rounded border text-left transition-all overflow-hidden flex items-center justify-between ${
                    isSelected 
                      ? 'bg-[#00f0ff]/10 border-[#00f0ff]' 
                      : 'bg-black/25 border-white/5 hover:border-white/15'
                  }`}
                >
                  {/* Percentage Progress Fill */}
                  <div 
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out pointer-events-none ${
                      isSelected ? 'bg-[#00f0ff]/20' : 'bg-white/[0.06] group-hover:bg-white/10'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />

                  {/* Option Content */}
                  <div className="relative z-10 flex items-center space-x-1.5 pr-2 truncate">
                    <span className={`w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 text-[8px] ${
                      isSelected 
                        ? 'border-[#00f0ff] bg-[#00f0ff] text-slate-950 font-bold' 
                        : 'border-white/20 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className={`text-[11px] font-sans truncate ${isSelected ? 'text-white font-bold' : 'text-slate-300'}`}>
                      {option.text}
                    </span>
                  </div>

                  <div className="relative z-10 flex items-center space-x-1.5 flex-shrink-0 text-[10px] font-mono">
                    <span className="text-slate-400">{option.votes.toLocaleString()}</span>
                    <span className={`font-bold ${isSelected ? 'text-[#00f0ff]' : 'text-slate-300'}`}>
                      {percentage}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-0.5">
            <span>{poll.totalVotes.toLocaleString()} votes</span>
            <span>Tap selected to withdraw</span>
          </div>
        </div>
      )}

    </div>
  );
};
