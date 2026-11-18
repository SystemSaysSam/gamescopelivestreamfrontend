import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, AlertTriangle, Shield, Sparkles, Trophy } from 'lucide-react';
import { ChatMessage, LivePoll, PinnedComment, UserIdentity, StreamState, YouTubeLivePoll } from '../../types';
import { ChatPinnedArea } from './ChatPinnedArea';
import { IdentitySetupModal } from './IdentitySetupModal';
import { ReactionEngine, FloatingParticle } from './ReactionEngine';
import { ReactionType, REACTION_CONFIGS } from './ReactionEmojis';
import { ReactionPicker } from './ReactionPicker';
import { ViceButton } from '../ViceButton';
import { api } from '../../services/api';
import { socket } from '../../services/socket';

interface ChatContainerProps {
  currentUser: UserIdentity | null;
  onSetCurrentUser: (user: UserIdentity) => void;
  adminPinnedComment: PinnedComment | null;
  onUnpinAdminComment?: () => void;
  normalPoll?: LivePoll | null;
  youtubePoll?: YouTubeLivePoll | null;
  pollFallbackEnabled?: boolean;
  onVoteNormal?: (pollId: string, optionId: string | null) => void;
  onDismissPoll?: () => void;
  streamState: StreamState;
  activeVisitors?: number;
  initialReactions?: Record<string, number>;
  onTriggerInactivityClearRef?: React.MutableRefObject<(() => void) | null>;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  currentUser,
  onSetCurrentUser,
  adminPinnedComment,
  onUnpinAdminComment,
  normalPoll,
  youtubePoll,
  pollFallbackEnabled = true,
  onVoteNormal,
  onDismissPoll,
  streamState,
  activeVisitors = 1,
  initialReactions,
  onTriggerInactivityClearRef
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentYouTubePoll, setCurrentYouTubePoll] = useState<YouTubeLivePoll | null>(youtubePoll || null);
  const [isPollFallbackEnabled, setIsPollFallbackEnabled] = useState<boolean>(pollFallbackEnabled);
  const [inputValue, setInputValue] = useState('');
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
  
  // Track last message timestamp for 5-minute inactivity cleanup during UPCOMING
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(Date.now());

  // Rate-limiting progressive cooldown states
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Expressive Animated Reaction System state
  const [activeUserReaction, setActiveUserReaction] = useState<ReactionType | null>(null);
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<ReactionType, number>>(() => {
    const counts: Record<string, number> = {};
    REACTION_CONFIGS.forEach(c => {
      counts[c.type] = initialReactions?.[c.type] ?? c.defaultCount;
    });
    return counts as Record<ReactionType, number>;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [featuredComment, setFeaturedComment] = useState<PinnedComment | null>(null);

  // Load initial persistent chat messages
  useEffect(() => {
    api.getChatMessages(60)
      .then(res => {
        if (res.messages && res.messages.length > 0) {
          setMessages(res.messages);
          setLastMessageTimestamp(Date.now());
        }
      })
      .catch(err => console.warn('Could not fetch initial chat messages:', err));
  }, []);

  // Realtime Socket listeners for chat events
  useEffect(() => {
    const unsubMsg = socket.on('chat:message', (newMsg: ChatMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setLastMessageTimestamp(Date.now());

      setTimeout(() => {
        if (chatScrollContainerRef.current) {
          chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
        }
      }, 50);
    });

    const unsubDel = socket.on('chat:message_deleted', ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    const unsubLike = socket.on('chat:like_updated', ({ messageId, likes }: { messageId: string; likes: number }) => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, likes } : m));
    });

    const unsubReaction = socket.on('chat:reaction', ({ type, counts }: { type: ReactionType; counts: Record<string, number> }) => {
      if (counts) {
        setReactionCounts(prev => ({ ...prev, ...counts }));
      }
      triggerVisualFloating(type);
    });

    // Chat Wipe Listener (Requirement 4)
    const unsubCleared = socket.on('chat:cleared', () => {
      setMessages([]);
      setLastMessageTimestamp(Date.now());
    });

    // YouTube Live Poll Listener (Requirement 1)
    const unsubYtPoll = socket.on('youtube:poll_updated', ({ poll }: { poll: YouTubeLivePoll | null }) => {
      setCurrentYouTubePoll(poll);
    });

    const unsubInit = socket.on('event:init_state', (data: any) => {
      if (data?.youtubePoll !== undefined) {
        setCurrentYouTubePoll(data.youtubePoll);
      }
      if (data?.pollFallbackEnabled !== undefined) {
        setIsPollFallbackEnabled(data.pollFallbackEnabled);
      }
    });

    return () => {
      unsubMsg();
      unsubDel();
      unsubLike();
      unsubReaction();
      unsubCleared();
      unsubYtPoll();
      unsubInit();
    };
  }, []);

  // Update initialReactions when parent supplies updated counts
  useEffect(() => {
    if (initialReactions) {
      setReactionCounts(prev => ({ ...prev, ...(initialReactions as Record<ReactionType, number>) }));
    }
  }, [initialReactions]);

  // Section 1: Chat inactivity cleanup during UPCOMING only
  useEffect(() => {
    if (streamState !== 'UPCOMING') return;

    const timer = setInterval(() => {
      const elapsed = Date.now() - lastMessageTimestamp;
      if (elapsed >= 300000 && messages.length > 0) {
        setMessages([]);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [streamState, lastMessageTimestamp, messages.length]);

  // Expose immediate inactivity clear
  useEffect(() => {
    if (onTriggerInactivityClearRef) {
      onTriggerInactivityClearRef.current = () => {
        setMessages([]);
      };
    }
  }, [onTriggerInactivityClearRef]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  // Calculate and update the most-liked comment for highlight
  useEffect(() => {
    const eligibleMessages = messages.filter(m => !m.isShoutout && m.likes > 0);
    if (eligibleMessages.length === 0) {
      setFeaturedComment(null);
      return;
    }

    const sorted = [...eligibleMessages].sort((a, b) => {
      if (b.likes !== a.likes) return b.likes - a.likes;
      return a.timestampMs - b.timestampMs;
    });

    const top = sorted[0];
    setFeaturedComment({
      id: top.id,
      username: top.username,
      text: top.text,
      likes: top.likes,
      avatarSvg: top.avatarSvg,
      avatarColor: top.avatarColor,
      isAdminPinned: false,
      rotationExpiresAt: Date.now() + 60000
    });
  }, [messages]);

  const triggerVisualFloating = (type: ReactionType) => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const id = Date.now() + Math.random();
    const x = 20 + Math.random() * 60;
    const scale = 0.9 + Math.random() * 0.35;
    const drift = (Math.random() - 0.5) * 40;

    setFloatingParticles(prev => {
      const trimmed = prev.length > 12 ? prev.slice(prev.length - 11) : prev;
      return [...trimmed, { id, type, x, scale, drift }];
    });

    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => p.id !== id));
    }, 2000);
  };

  const handleTriggerReaction = (type: ReactionType) => {
    setActiveUserReaction(type);
    triggerVisualFloating(type);

    // Emit reaction to backend server
    socket.emit('chat:reaction', { type }, (res: any) => {
      if (res?.counts) {
        setReactionCounts(prev => ({ ...prev, ...res.counts }));
      }
    });
  };

  const handleLikeMessage = (messageId: string) => {
    if (!currentUser) {
      setIsIdentityModalOpen(true);
      return;
    }

    // Emit like to backend
    socket.emit('chat:like', { messageId, userId: currentUser.id }, (res: any) => {
      if (res?.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, likes: res.likes, likedByCurrentUser: res.liked } : m));
      }
    });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser || !inputValue.trim() || cooldownSeconds > 0) return;
    setErrorMessage(null);

    const payload = {
      userId: currentUser.id,
      username: currentUser.username,
      avatarSvg: currentUser.avatarSvg,
      avatarColor: currentUser.color,
      text: inputValue.trim(),
      badge: currentUser.badge
    };

    socket.emit('chat:send', payload, (res: any) => {
      if (res?.ok) {
        setInputValue('');
        setIsReactionPickerOpen(false);
      } else if (res?.error) {
        setErrorMessage(res.error);
        setCooldownSeconds(10);
      }
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#07090e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* 1. Compact Chat Header (YouTube Live style) */}
      <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-[#0b0e17] border-b border-white/10 flex items-center justify-between flex-shrink-0 h-8 sm:h-9">
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#00f0ff]" />
          <h3 className="font-display font-bold text-[11px] sm:text-xs text-white uppercase tracking-wider">
            LIVE CHAT
          </h3>
          {streamState === 'UPCOMING' && (
            <span className="text-[8px] sm:text-[9px] font-mono px-1 sm:px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
              PRE-BROADCAST
            </span>
          )}
        </div>

        {/* Real Live Chatter / Visitor Badge */}
        <div className="flex items-center space-x-1 sm:space-x-1.5 text-[9px] sm:text-[10px] font-mono text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-ping" />
          <span className="text-white font-semibold">{activeVisitors?.toLocaleString() || 1}</span>
          <span className="hidden sm:inline">ONLINE</span>
        </div>
      </div>

      {/* 2. UNIFIED CHAT PINNED AREA (Priority 1: Normal Live Poll > Priority 2: YouTube Live Poll Fallback > Priority 3: Admin Pin > Priority 4: Top Comment) */}
      <ChatPinnedArea
        normalPoll={normalPoll || null}
        youtubePoll={currentYouTubePoll}
        pollFallbackEnabled={isPollFallbackEnabled}
        adminPinnedComment={adminPinnedComment}
        featuredComment={featuredComment}
        onVoteNormal={onVoteNormal || (() => {})}
        onDismissPoll={onDismissPoll}
        onUnpinAdminComment={onUnpinAdminComment}
      />

      {/* 3. Refined Scrollable Message Feed */}
      <div 
        ref={chatScrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-2.5 py-1.5 sm:py-2 space-y-1 sm:space-y-1.5 scroll-smooth relative"
      >
        {messages.map(msg => {
          const isCurrentUser = currentUser?.id === msg.userId;

          if (msg.isShoutout) {
            return (
              <div 
                key={msg.id} 
                className="my-1 p-1.5 sm:p-2 rounded-lg bg-gradient-to-r from-[#1c1808]/95 to-[#26200a]/95 border border-[#ffaa00]/30 flex items-start space-x-1.5 sm:space-x-2 animate-message-entry"
              >
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#ffaa00] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-[9.5px] sm:text-[10px] leading-relaxed">
                  <span className="text-[7.5px] sm:text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-[#ffaa00]/20 text-[#ffaa00] mr-1 uppercase">
                    {msg.shoutoutTitle || 'SHOUTOUT'}
                  </span>
                  <span className="text-white font-medium">{msg.text}</span>
                  <span className="text-[7.5px] sm:text-[8px] font-mono text-slate-400 ml-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          }

          return (
            <div 
              key={msg.id} 
              className={`group flex items-start space-x-1.5 sm:space-x-2 py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg transition-colors ${
                isCurrentUser ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div 
                className="w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-[#111520] mt-0.5"
                dangerouslySetInnerHTML={{ __html: msg.avatarSvg }}
              />

              <div className="flex-1 min-w-0 text-[10.5px] sm:text-[11px] leading-relaxed">
                <span 
                  className="font-display font-bold text-[9.5px] sm:text-[10px] mr-1.5 inline-block align-baseline"
                  style={{ color: msg.avatarColor || '#00f0ff' }}
                >
                  {msg.username}
                </span>

                {msg.source === 'youtube' && (
                  <span 
                    className="text-[7px] sm:text-[7.5px] font-mono px-1 py-0.2 rounded bg-red-600/20 text-red-400 border border-red-500/30 font-bold mr-1 inline-block align-baseline"
                    title="Imported from YouTube Livestream Chat"
                  >
                    YT
                  </span>
                )}

                {msg.badge && msg.source !== 'youtube' && (
                  <span className="text-[7px] sm:text-[7.5px] font-mono px-1 py-0.2 rounded bg-white/10 text-slate-300 font-bold mr-1 inline-block align-baseline">
                    {msg.badge}
                  </span>
                )}

                <span className="text-slate-200 font-sans inline break-words">
                  {msg.text}
                </span>

                <span className="text-[7.5px] sm:text-[8px] font-mono text-slate-400 ml-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                  {msg.timestamp}
                </span>
              </div>

              <button
                type="button"
                disabled={isCurrentUser}
                onClick={() => handleLikeMessage(msg.id)}
                title={isCurrentUser ? "Your comment" : "Like"}
                className={`flex items-center space-x-0.5 text-[8.5px] sm:text-[9px] font-mono transition-all flex-shrink-0 opacity-40 group-hover:opacity-100 ${
                  msg.likedByCurrentUser
                    ? '!opacity-100 text-[#ff2a85] font-bold'
                    : isCurrentUser
                    ? 'cursor-not-allowed opacity-20'
                    : 'text-slate-400 hover:text-[#ff2a85]'
                }`}
              >
                <span>♥</span>
                <span>{msg.likes > 0 ? msg.likes : ''}</span>
              </button>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Expressive Animated Reactions Engine */}
      <ReactionEngine
        activeUserReaction={activeUserReaction}
        onSelectReaction={handleTriggerReaction}
        reactionCounts={reactionCounts}
        floatingList={floatingParticles}
      />

      {/* 5. Fixed Compact Message Composer */}
      <div className="p-1.5 sm:p-2 bg-[#0b0e17] border-t border-white/10 flex-shrink-0">
        {!currentUser ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setIsIdentityModalOpen(true)}
              className="w-full flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#111520] border border-white/10 hover:border-[#00f0ff]/50 transition-all text-left group"
            >
              <div className="flex items-center space-x-1.5 text-[11px] sm:text-xs font-mono text-slate-400">
                <Shield className="w-3.5 h-3.5 text-[#00f0ff]" />
                <span className="text-slate-300 font-sans group-hover:text-white transition-colors truncate">
                  Set up callsign to chat...
                </span>
              </div>
              <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-[#ff2a85]/20 text-[#ff2a85] border border-[#ff2a85]/40 font-bold group-hover:bg-[#ff2a85] group-hover:text-white transition-all whitespace-nowrap ml-2">
                SET UP CALLSIGN
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="space-y-1">
            {/* Cooldown or Error Alert */}
            {(cooldownSeconds > 0 || errorMessage) && (
              <div className="px-2 py-0.5 rounded bg-[#ffaa00]/15 border border-[#ffaa00]/40 text-[#ffaa00] text-[9px] sm:text-[10px] font-mono flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{errorMessage || 'BURST COOLDOWN'}</span>
                </div>
                {cooldownSeconds > 0 && <span className="font-bold shrink-0">{cooldownSeconds}s</span>}
              </div>
            )}

            <div className="relative flex items-center space-x-1 sm:space-x-1.5">
              <input
                type="text"
                disabled={cooldownSeconds > 0}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={
                  cooldownSeconds > 0 
                    ? `Cooldown: wait ${cooldownSeconds}s...` 
                    : `Chat as ${currentUser.username}...`
                }
                maxLength={240}
                className="w-full bg-[#111520] border border-white/10 focus:border-[#00f0ff] rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all disabled:opacity-50 font-sans"
              />

              <button
                type="button"
                onClick={() => setIsReactionPickerOpen(!isReactionPickerOpen)}
                title="Open Expressive Reactions"
                className={`p-1 sm:p-1.5 rounded-lg border transition-all flex-shrink-0 ${
                  isReactionPickerOpen
                    ? 'bg-[#1e2538] border-[#00f0ff] text-[#00f0ff] shadow-sm'
                    : 'bg-[#111520] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              <ViceButton
                variant="pink"
                size="sm"
                type="submit"
                disabled={!inputValue.trim() || cooldownSeconds > 0}
                className="!px-2.5 sm:!px-3 !py-1 sm:!py-1.5 !text-[10.5px] sm:!text-[11px]"
                icon={<Send className="w-3 h-3" />}
              >
                SEND
              </ViceButton>

              <ReactionPicker
                isOpen={isReactionPickerOpen}
                onClose={() => setIsReactionPickerOpen(false)}
                onTriggerReaction={(type) => {
                  handleTriggerReaction(type);
                }}
              />
            </div>
          </form>
        )}
      </div>

      <IdentitySetupModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        onIdentityAssigned={(identity) => {
          onSetCurrentUser(identity);
          setIsIdentityModalOpen(false);
        }}
      />

    </div>
  );
};
