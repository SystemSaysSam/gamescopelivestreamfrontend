import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Bell, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AmbientGradientBackground } from './components/AmbientGradientBackground';
import { CinematicPreStream } from './components/CinematicPreStream';
import { VideoPlayer } from './components/VideoPlayer';
import { ChatContainer } from './components/chat/ChatContainer';
import { EmailSubscription } from './components/EmailSubscription';
import { HudShield } from './components/icons/GameIcons';
import { 
  StreamState, 
  PinnedComment, 
  UserIdentity, 
  LivePoll, 
  CountdownConfig, 
  InactiveScreenConfig, 
  PublicEventConfig 
} from './types';
import { soundManager } from './services/soundManager';
import { notificationService } from './services/notificationService';
import { api } from './services/api';
import { socket } from './services/socket';

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const [videoHeight, setVideoHeight] = useState<number | null>(null);

  // Authoritative Server-Driven State
  const [streamState, setStreamState] = useState<StreamState>('UPCOMING');
  const [countdownConfig, setCountdownConfig] = useState<CountdownConfig | undefined>(undefined);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string>('QdBZY2fkU-0');
  const [inactiveScreen, setInactiveScreen] = useState<InactiveScreenConfig | undefined>(undefined);
  const [adminPinnedComment, setAdminPinnedComment] = useState<PinnedComment | null>(null);
  const [activePoll, setActivePoll] = useState<LivePoll | null>(null);
  const [activeVisitors, setActiveVisitors] = useState<number>(1);
  const [initialReactions, setInitialReactions] = useState<Record<string, number> | undefined>(undefined);

  // In-App Toast Notification Banner
  const [activeNotification, setActiveNotification] = useState<{ title: string; body: string } | null>(null);

  // Active User Identity
  const [currentUser, setCurrentUser] = useState<UserIdentity | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const search = window.location.search;
        if (search && new URLSearchParams(search).has('resetUser')) {
          localStorage.removeItem('gamescope_live_user');
          return null;
        }
      }
      const saved = localStorage.getItem('gamescope_live_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Client Session ID for authentic analytics ping
  const clientIdRef = useRef<string>(
    (typeof window !== 'undefined' && localStorage.getItem('gamescope_client_id')) ||
    `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('gamescope_client_id')) {
      localStorage.setItem('gamescope_client_id', clientIdRef.current);
    }
  }, []);

  // Arcade Embedded State
  const [isArcadeActive, setIsArcadeActive] = useState(false);
  const [, setArcadeHighScore] = useState(0);

  // Chat Inactivity Cleanup Dev Ref
  const inactivityClearRef = useRef<(() => void) | null>(null);

  // Load Authoritative State from Backend and Initialize Socket.IO
  useEffect(() => {
    // 1. Initial REST fetch
    api.getPublicConfig()
      .then(data => {
        if (data.config) {
          applyServerConfig(data.config);
        }
        if (data.adminPinnedComment !== undefined) {
          setAdminPinnedComment(data.adminPinnedComment);
        }
        if (data.activePoll) {
          setActivePoll(data.activePoll);
        }
        if (data.activeVisitors) {
          setActiveVisitors(data.activeVisitors);
        }
        if (data.reactions) {
          setInitialReactions(data.reactions);
        }
      })
      .catch(err => {
        console.warn('Could not fetch server config:', err.message);
      });

    // 2. Connect Socket.IO
    socket.connect();

    // 3. Register Realtime Handlers
    const unsubInit = socket.on('event:init_state', (payload) => {
      if (payload.config) applyServerConfig(payload.config);
      if (payload.adminPinnedComment !== undefined) setAdminPinnedComment(payload.adminPinnedComment);
      if (payload.reactions) setInitialReactions(payload.reactions);
      if (payload.activePoll) setActivePoll(payload.activePoll);
      if (payload.activeVisitors) setActiveVisitors(payload.activeVisitors);
    });

    const unsubState = socket.on('event:state_updated', ({ state }: { state: StreamState }) => {
      setStreamState(state);
    });

    const unsubCountdown = socket.on('event:countdown_updated', ({ countdown }: { countdown: CountdownConfig }) => {
      setCountdownConfig(countdown);
    });

    const unsubStream = socket.on('event:stream_updated', ({ youtubeVideoId }: { youtubeVideoId: string }) => {
      setYoutubeVideoId(youtubeVideoId);
    });

    const unsubInactive = socket.on('event:inactive_updated', ({ inactiveScreen }: { inactiveScreen: InactiveScreenConfig }) => {
      setInactiveScreen(inactiveScreen);
    });

    const unsubSync = socket.on('event:force_sync', (newCfg: PublicEventConfig) => {
      applyServerConfig(newCfg);
    });

    const unsubPin = socket.on('chat:message_pinned', ({ pinnedComment }: { pinnedComment: PinnedComment | null }) => {
      setAdminPinnedComment(pinnedComment);
    });

    const unsubPollCreated = socket.on('poll:created', (poll: LivePoll) => {
      setActivePoll(poll);
    });

    const unsubPollResults = socket.on('poll:results', (poll: LivePoll) => {
      setActivePoll(poll);
    });

    const unsubPollClosed = socket.on('poll:closed', (poll: LivePoll) => {
      setActivePoll(poll);
    });

    const unsubPollRemoved = socket.on('poll:removed', () => {
      setActivePoll(null);
    });

    const unsubNotif = socket.on('notification:broadcast', (notif: { title: string; body: string; type: string }) => {
      setActiveNotification({ title: notif.title, body: notif.body });
    });

    return () => {
      unsubInit();
      unsubState();
      unsubCountdown();
      unsubStream();
      unsubInactive();
      unsubSync();
      unsubPin();
      unsubPollCreated();
      unsubPollResults();
      unsubPollClosed();
      unsubPollRemoved();
      unsubNotif();
    };
  }, []);

  const applyServerConfig = (cfg: PublicEventConfig) => {
    setStreamState(cfg.state);
    setCountdownConfig(cfg.countdown);
    setYoutubeVideoId(cfg.youtubeVideoId);
    setInactiveScreen(cfg.inactiveScreen);
  };

  // Periodic Analytics Ping (Active visitor presence)
  useEffect(() => {
    const cId = clientIdRef.current;
    const interval = setInterval(() => {
      api.sendAnalyticsPing(cId)
        .then(res => {
          if (res?.activeVisitors) setActiveVisitors(res.activeVisitors);
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Poll Vote Submission
  const handleVoteNormal = (pollId: string, optionId: string | null) => {
    const userId = currentUser?.id || 'anon-voter';
    api.votePoll(pollId, optionId, userId)
      .then(res => {
        if (res.poll) {
          setActivePoll({
            ...res.poll,
            userVotedOptionId: optionId
          });
        }
      })
      .catch(err => {
        console.warn('Poll voting warning:', err.message);
      });
  };

  // Section 2 & 3: Audio & Arcade reactions to Stream State changes
  useEffect(() => {
    soundManager.onStreamStateChange(streamState);
    if (streamState !== 'UPCOMING' && streamState !== 'BREAK') {
      // In LIVE, STARTING, and ENDED, arcade is strictly disabled and shut down
      setIsArcadeActive(false);
    }
  }, [streamState]);

  // Push Notification trigger when stream switches to STARTING
  useEffect(() => {
    if (streamState === 'STARTING') {
      notificationService.sendStartingNotification(false);
    } else if (streamState === 'UPCOMING') {
      notificationService.resetStartingFlag();
    }
  }, [streamState]);

  // Listen for in-app push notification alerts to render floating toast banner
  useEffect(() => {
    const handlePushEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ title: string; body: string }>;
      if (customEvent.detail) {
        setActiveNotification(customEvent.detail);
      }
    };
    window.addEventListener('gamescope-push-notification', handlePushEvent);
    return () => window.removeEventListener('gamescope-push-notification', handlePushEvent);
  }, []);

  // Auto-dismiss in-app notification after 6 seconds
  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  // GSAP Entrance Animations
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.from('.anim-header', {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power3.out'
      });

      gsap.from('.anim-stream-section', {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Dynamic Desktop Height Lock: Chat height strictly tracks Video Player height on desktop
  useEffect(() => {
    const el = videoWrapperRef.current;
    if (!el) return;

    const syncHeight = () => {
      if (window.innerWidth >= 1024) {
        const measured = el.offsetHeight;
        if (measured > 0) {
          setVideoHeight(measured);
        }
      } else {
        setVideoHeight(null);
      }
    };

    syncHeight();

    const ro = new ResizeObserver(() => {
      syncHeight();
    });
    ro.observe(el);

    window.addEventListener('resize', syncHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, []);

  const handleOpenArcade = () => {
    if (streamState === 'BREAK' || streamState === 'UPCOMING') {
      setIsArcadeActive(true);
      const videoElement = document.getElementById('broadcast-stage');
      if (videoElement) {
        videoElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleScoreSubmitted = (score: number) => {
    setArcadeHighScore(prev => Math.max(prev, score));
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-[#ff2a85] selection:text-white relative">
      
      {/* 1. Cinematic Ambient Lighting Background Environment */}
      <AmbientGradientBackground />

      {/* 2. Top Navigation Bar */}
      <Navbar
        currentChannelTitle="GRAND THEFT AUTO VI // PREMIERE LIVE STREAM"
        gameSlug="gta-vi"
        streamState={streamState}
        onOpenArcade={handleOpenArcade}
      />

      {/* 3. Main Stream Destination Container (Original Layout Foundation) */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        
        {/* 1. ORIGINAL HERO HEADER */}
        <div className="anim-header mb-6 sm:mb-8">
          <CinematicPreStream
            streamState={streamState}
            countdownConfig={countdownConfig}
            userId={currentUser?.id}
          />
        </div>

        {/* 2. MAIN BROADCAST & COMMUNITY CHAT SECTION (LEVELED SIDE-BY-SIDE ON DESKTOP) */}
        <section id="broadcast-stage" className="anim-stream-section mb-8 sm:mb-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-[72%_1fr] xl:grid-cols-[74%_1fr] gap-4 sm:gap-6 items-start">
            
            {/* LEFT COLUMN: Main Media Container (Livestream in LIVE, Arcade in BREAK, Waiting in UPCOMING, Inactive in ENDED) */}
            <div ref={videoWrapperRef} className="w-full flex flex-col min-w-0">
              <VideoPlayer
                streamState={streamState}
                youtubeVideoId={youtubeVideoId}
                inactiveScreen={inactiveScreen}
                isArcadeActive={isArcadeActive}
                onLaunchArcade={handleOpenArcade}
                onExitArcade={() => setIsArcadeActive(false)}
                onScoreSubmitted={handleScoreSubmitted}
              />
            </div>

            {/* RIGHT COLUMN: Independent GameScope Community Chat (Height-Locked on Desktop) */}
            <div 
              className="w-full h-[430px] sm:h-[480px] lg:h-auto min-h-0 flex flex-col min-w-0"
              style={videoHeight ? { height: `${videoHeight}px`, maxHeight: `${videoHeight}px` } : undefined}
            >
              <ChatContainer
                currentUser={currentUser}
                onSetCurrentUser={setCurrentUser}
                adminPinnedComment={adminPinnedComment}
                onUnpinAdminComment={() => setAdminPinnedComment(null)}
                normalPoll={activePoll}
                onVoteNormal={handleVoteNormal}
                onDismissPoll={() => setActivePoll(null)}
                streamState={streamState}
                activeVisitors={activeVisitors}
                initialReactions={initialReactions}
                onTriggerInactivityClearRef={inactivityClearRef}
              />
            </div>

          </div>

        </section>

      </main>

      {/* 4. Compact Email Subscription Section (Directly Above Footer) */}
      <EmailSubscription />

      {/* Push Notification Visual Floating Toast (In-App Feedback) */}
      {activeNotification && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="p-3.5 rounded-xl bg-[#0b0e17]/95 border border-[#00f0ff]/50 shadow-[0_0_30px_rgba(0,240,255,0.25)] backdrop-blur-xl flex items-start space-x-3 text-slate-100">
            <div className="w-8 h-8 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-4 h-4 text-[#00f0ff] animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <div className="text-[10px] font-mono font-bold text-[#00f0ff] uppercase tracking-wider flex items-center space-x-1.5">
                <span>BROADCAST PUSH ALERT</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-ping" />
              </div>
              <h4 className="text-xs font-bold text-white font-display mt-0.5 leading-snug">
                {activeNotification.title}
              </h4>
              <p className="text-[11px] text-slate-300 font-sans mt-0.5 leading-tight">
                {activeNotification.body}
              </p>
            </div>
            <button
              onClick={() => setActiveNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Brand-Consistent Footer */}
      <footer className="w-full bg-[#05070a] border-t border-white/10 text-slate-400 font-sans text-xs py-10 sm:py-12">
        <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Brand Logo & Tagline */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#ff2a85]/20 border border-[#ff2a85] flex items-center justify-center">
                <HudShield className="w-4 h-4 text-[#ff2a85]" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-display font-black text-lg text-white tracking-wider">GAME</span>
                  <span className="font-display font-black text-lg text-[#00f0ff] tracking-wider">SCOPE</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40 font-bold">
                    LIVE
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 tracking-wider">
                  Discover. Explore. Experience.
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 max-w-md text-center sm:text-right">
              Built for gaming culture, community, and live experiences.
            </p>
          </div>

          <div className="border-t border-white/5 pt-4 space-y-3">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Grand Theft Auto, GTA 6, and all related characters and logos are trademarks of Rockstar Games and Take-Two Interactive Software. GameScope Live is an independent gaming community and livestream platform and is not affiliated with, endorsed by, or sponsored by Rockstar Games or Take-Two Interactive Software.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 font-mono text-[11px]">
              <div>
                &copy; 2026 GameScope Live. All rights reserved.
              </div>
              <div className="text-slate-400">
                Discover. Explore. Experience.
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
