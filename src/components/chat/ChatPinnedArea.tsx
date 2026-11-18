import React, { useState, useEffect } from 'react';
import { Pin, Star, Clock, X, BarChart2, Youtube } from 'lucide-react';
import { LivePoll, PinnedComment, YouTubeLivePoll } from '../../types';

interface ChatPinnedAreaProps {
  normalPoll: LivePoll | null;
  youtubePoll?: YouTubeLivePoll | null;
  pollFallbackEnabled?: boolean;
  adminPinnedComment: PinnedComment | null;
  featuredComment?: PinnedComment | null;
  onVoteNormal: (pollId: string, optionId: string | null) => void;
  onDismissPoll?: () => void;
  onUnpinAdminComment?: () => void;
}

/**
 * Unified Chat Pinned Area for GameScope Live
 * Priority Hierarchy:
 * 1. Priority 1: Active Normal Live Poll (occupies pinned slot while active)
 * 2. Priority 2: Active YouTube Live Poll Fallback (when no GameScope poll is active & fallback is enabled)
 * 3. Priority 3: Admin Pinned Comment (restored when no poll or poll is dismissed)
 * 4. Priority 4: Community Featured Comment (top-liked comment, restored when no poll or admin pin)
 * 5. None: returns null (no empty placeholder)
 */
export const ChatPinnedArea: React.FC<ChatPinnedAreaProps> = ({
  normalPoll,
  youtubePoll,
  pollFallbackEnabled = true,
  adminPinnedComment,
  featuredComment,
  onVoteNormal,
  onDismissPoll,
  onUnpinAdminComment
}) => {
  const [isPollDismissed, setIsPollDismissed] = useState(false);
  const [rotationSecondsLeft, setRotationSecondsLeft] = useState(60);

  // Reset dismissal when a new or updated poll arrives
  useEffect(() => {
    setIsPollDismissed(false);
  }, [normalPoll?.id, normalPoll?.status, youtubePoll?.id, youtubePoll?.status]);

  // PRIORITY 1: Active Normal Live Poll
  const isNormalActive = 
    Boolean(normalPoll && 
    (normalPoll.status === 'active' || normalPoll.status === 'closed') && 
    !isPollDismissed);

  // PRIORITY 2: Active YouTube Live Poll (Fallback)
  const isYouTubeActive =
    !isNormalActive &&
    pollFallbackEnabled !== false &&
    Boolean(youtubePoll && 
    (youtubePoll.status === 'active' || youtubePoll.status === 'closed') && 
    !isPollDismissed);

  // Rotation ticker for featured comment
  useEffect(() => {
    if (adminPinnedComment || isNormalActive || isYouTubeActive) return;

    const timer = setInterval(() => {
      setRotationSecondsLeft(prev => (prev <= 1 ? 60 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [adminPinnedComment, isNormalActive, isYouTubeActive, featuredComment?.id]);

  // PRIORITY 3: Admin Pinned Comment
  const isAdminActive = !isNormalActive && !isYouTubeActive && Boolean(adminPinnedComment);

  // PRIORITY 4: Featured Community Comment
  const isFeaturedActive = !isNormalActive && !isYouTubeActive && !isAdminActive && Boolean(featuredComment);

  // If no content meets priority criteria, do NOT render an empty container
  if (!isNormalActive && !isYouTubeActive && !isAdminActive && !isFeaturedActive) {
    return null;
  }

  const handleDismiss = () => {
    setIsPollDismissed(true);
    if (onDismissPoll) onDismissPoll();
  };

  return (
    <div className="p-1.5 sm:p-2 bg-[#090c14] border-b border-white/5 flex-shrink-0 z-10 transition-all duration-200">
      
      {/* ----------------------------------------------------------------- */}
      {/* PRIORITY 1: COMPACT CHAT-NATIVE LIVE POLL                         */}
      {/* ----------------------------------------------------------------- */}
      {isNormalActive && normalPoll && (
        <div className="rounded-lg bg-[#0c1018] border border-[#00f0ff]/30 p-2 text-xs font-mono select-none animate-in fade-in">
          
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/10 text-[10px]">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-ping" />
              <BarChart2 className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span className="font-bold text-white tracking-wider">LIVE POLL</span>
              <span className={`px-1 py-0.2 rounded font-bold border ${
                normalPoll.status === 'active' 
                  ? 'bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/40' 
                  : 'bg-slate-800 text-slate-400 border-white/10'
              }`}>
                {normalPoll.status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[9px] text-slate-400">
              <span>{normalPoll.totalVotes.toLocaleString()} votes</span>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                title="Dismiss poll to restore pinned chat"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <p className="font-sans font-semibold text-[11px] text-white leading-tight mb-2 truncate">
            {normalPoll.question}
          </p>

          <div className="space-y-1">
            {normalPoll.options.map(opt => {
              const isSelected = normalPoll.userVotedOptionId === opt.id;
              const pct = normalPoll.totalVotes > 0 
                ? Math.round((opt.votes / normalPoll.totalVotes) * 100) 
                : 0;

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={normalPoll.status !== 'active'}
                  onClick={() => {
                    // Clicking current option again removes vote (toggle)
                    onVoteNormal(normalPoll.id, isSelected ? null : opt.id);
                  }}
                  className={`relative w-full px-2 py-1.5 rounded flex items-center justify-between text-left transition-all border overflow-hidden ${
                    isSelected
                      ? 'bg-[#00f0ff]/10 border-[#00f0ff] text-white shadow-sm'
                      : 'bg-black/30 hover:bg-white/5 border-white/5 hover:border-white/15 text-slate-300'
                  }`}
                >
                  {/* Progress Fill */}
                  <div
                    className="absolute inset-y-0 left-0 bg-[#00f0ff]/15 pointer-events-none transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative z-10 flex items-center space-x-1.5 truncate pr-2">
                    <span className={`w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0 text-[8px] ${
                      isSelected 
                        ? 'border-[#00f0ff] bg-[#00f0ff] text-slate-950 font-bold' 
                        : 'border-white/20 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className="font-sans text-[11px] truncate">
                      {opt.text}
                    </span>
                  </div>

                  <div className="relative z-10 font-mono text-[10px] text-slate-400 flex items-center space-x-1.5 flex-shrink-0">
                    <span className="text-slate-500 text-[9px]">{opt.votes.toLocaleString()}</span>
                    <span className={isSelected ? 'text-[#00f0ff] font-bold' : ''}>{pct}%</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-1.5 text-[9px] text-slate-400 text-center flex items-center justify-between">
            <span>Click to vote • Click again to cancel</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white underline text-[9px]"
            >
              Restore Pinned Content
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* PRIORITY 2: YOUTUBE LIVE POLL FALLBACK                            */}
      {/* ----------------------------------------------------------------- */}
      {isYouTubeActive && youtubePoll && (
        <div className="rounded-lg bg-[#0c1018] border border-red-500/40 p-2 text-xs font-mono select-none animate-in fade-in">
          
          <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-white/10 text-[10px]">
            <div className="flex items-center space-x-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${youtubePoll.status === 'active' ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              <span className="font-bold text-white tracking-wider">YOUTUBE POLL</span>
              <span className={`px-1 py-0.2 rounded font-bold border text-[9px] ${
                youtubePoll.status === 'active' 
                  ? 'bg-red-500/15 text-red-400 border-red-500/40' 
                  : 'bg-slate-800 text-slate-400 border-white/10'
              }`}>
                {youtubePoll.status.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[9px] text-slate-400">
              {youtubePoll.totalVotes > 0 && (
                <span>{youtubePoll.totalVotes.toLocaleString()} votes</span>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                title="Dismiss poll to restore pinned chat"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <p className="font-sans font-semibold text-[11px] text-white leading-tight mb-2 truncate">
            {youtubePoll.question}
          </p>

          <div className="space-y-1">
            {youtubePoll.options.map(opt => {
              const pct = youtubePoll.totalVotes > 0 
                ? Math.round((opt.votes / youtubePoll.totalVotes) * 100) 
                : 0;

              return (
                <div
                  key={opt.id}
                  className="relative w-full px-2 py-1.5 rounded flex items-center justify-between text-left border overflow-hidden bg-black/40 border-white/10 text-slate-300"
                >
                  {/* Progress Fill */}
                  <div
                    className="absolute inset-y-0 left-0 bg-red-600/20 pointer-events-none transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />

                  <div className="relative z-10 flex items-center space-x-1.5 truncate pr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 flex-shrink-0" />
                    <span className="font-sans text-[11px] truncate text-slate-200">
                      {opt.text}
                    </span>
                  </div>

                  <div className="relative z-10 font-mono text-[10px] text-slate-400 flex items-center space-x-1.5 flex-shrink-0">
                    <span className="text-slate-500 text-[9px]">{opt.votes.toLocaleString()}</span>
                    <span className="text-red-400 font-bold">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-1.5 text-[9px] text-slate-400 text-center flex items-center justify-between">
            <span className="text-slate-500">Informational • Live from YouTube</span>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white underline text-[9px]"
            >
              Restore Pinned Content
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* PRIORITY 3: ADMIN PINNED COMMENT                                  */}
      {/* ----------------------------------------------------------------- */}
      {isAdminActive && adminPinnedComment && (
        <div className="relative px-2.5 py-1.5 rounded-lg border bg-[#1a1508]/95 border-[#ffaa00]/30 overflow-hidden transition-all duration-200 animate-in fade-in">
          <div className="flex items-center justify-between gap-1.5 mb-1 text-[10px] font-mono leading-none">
            <span className="px-1.5 py-0.5 rounded bg-[#ffaa00]/20 text-[#ffaa00] border border-[#ffaa00]/40 font-bold flex items-center gap-1">
              <Pin className="w-2.5 h-2.5" />
              <span>ADMIN PIN</span>
            </span>

            {onUnpinAdminComment && (
              <button
                type="button"
                onClick={onUnpinAdminComment}
                title="Unpin message"
                className="p-0.5 rounded text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div 
              className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-black/40"
              dangerouslySetInnerHTML={{ __html: adminPinnedComment.avatarSvg }}
            />
            <div className="flex-1 min-w-0 flex items-baseline space-x-1.5 text-xs truncate">
              <span className="font-display font-bold text-[11px] text-white flex-shrink-0">
                {adminPinnedComment.username}
              </span>
              <span className="font-sans text-slate-300 text-[11px] truncate">
                {adminPinnedComment.text}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* PRIORITY 4: FEATURED COMMUNITY COMMENT                             */}
      {/* ----------------------------------------------------------------- */}
      {isFeaturedActive && featuredComment && (
        <div className="relative px-2.5 py-1.5 rounded-lg border bg-[#161222]/95 border-purple-500/30 overflow-hidden transition-all duration-200 animate-in fade-in">
          {/* 60-second progress bar */}
          <div 
            className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-purple-500 to-[#00f0ff] transition-all duration-1000 ease-linear pointer-events-none"
            style={{ width: `${(rotationSecondsLeft / 60) * 100}%` }}
          />

          <div className="flex items-center justify-between gap-1.5 mb-1 text-[10px] font-mono leading-none">
            <div className="flex items-center space-x-1.5">
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                <Star className="w-2.5 h-2.5 text-purple-300" />
                <span>TOP COMMENT</span>
              </span>
              <span className="text-slate-400 flex items-center gap-0.5 text-[9px]">
                <Clock className="w-2.5 h-2.5" />
                <span>{rotationSecondsLeft}s</span>
              </span>
            </div>

            <span className="text-[10px] text-purple-300 font-bold">
              ❤️ {featuredComment.likes}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div 
              className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-black/40"
              dangerouslySetInnerHTML={{ __html: featuredComment.avatarSvg }}
            />
            <div className="flex-1 min-w-0 flex items-baseline space-x-1.5 text-xs truncate">
              <span className="font-display font-bold text-[11px] text-white flex-shrink-0">
                {featuredComment.username}
              </span>
              <span className="font-sans text-slate-300 text-[11px] truncate">
                {featuredComment.text}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
