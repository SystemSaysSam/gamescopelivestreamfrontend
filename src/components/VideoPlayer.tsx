import React, { useState } from 'react';
import { Volume2, AlertCircle, RefreshCw, Gamepad2, Radio, Bell } from 'lucide-react';
import { InactiveScreenConfig, StreamState } from '../types';
import { ViceButton } from './ViceButton';
import { ViceCityRunArcade } from './arcade/ViceCityRunArcade';
import { ASSETS } from '../config';

interface VideoPlayerProps {
  streamState: StreamState;
  youtubeVideoId?: string;
  inactiveScreen?: InactiveScreenConfig;
  isArcadeActive?: boolean;
  onLaunchArcade?: () => void;
  onExitArcade?: () => void;
  onScoreSubmitted?: (score: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  streamState, 
  youtubeVideoId = 'QdBZY2fkU-0',
  inactiveScreen,
  isArcadeActive = false,
  onLaunchArcade,
  onExitArcade,
  onScoreSubmitted
}) => {
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hasUserUnmuted, setHasUserUnmuted] = useState(false);

  // Dynamic YouTube Embed URL
  const embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?autoplay=1&mute=${isAudioMuted ? 1 : 0}&controls=1&rel=0&modestbranding=1&enablejsapi=1`;

  const handlePlayWithSound = () => {
    setIsAudioMuted(false);
    setHasUserUnmuted(true);
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-[#080b11] border border-white/10 shadow-xl group transition-all duration-200">
      
      {/* 1. STATE: UPCOMING — Pre-Stream Waiting Experience OR Embedded Arcade */}
      {streamState === 'UPCOMING' && (
        isArcadeActive ? (
          <div className="relative w-full aspect-video bg-[#05030c] overflow-hidden">
            <ViceCityRunArcade
              streamState={streamState}
              onExit={onExitArcade || (() => {})}
              onScoreSubmitted={onScoreSubmitted}
            />
          </div>
        ) : (
          <div className="relative w-full aspect-video bg-[#080b11] overflow-hidden flex flex-col items-center justify-center p-3 sm:p-6 text-center">
            {/* Background Backdrop Poster */}
            <img
              src={ASSETS.posters.gta6Desktop}
              alt="Grand Theft Auto VI Live Stream Waiting Screen"
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.25] contrast-[1.1] blur-[1px]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-black/50 to-[#080b11]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25 pointer-events-none" />

            <div className="relative z-10 max-w-md space-y-1.5 sm:space-y-2.5 px-3">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#00f0ff]/15 border border-[#00f0ff]/40 text-[#00f0ff] text-[9px] sm:text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping" />
                <span>LIVE STREAM</span>
              </div>

              <h2 className="font-display font-black text-sm sm:text-xl md:text-2xl text-white tracking-tight uppercase leading-snug">
                Live Stream Expected to Start at 4:30 PM IST
              </h2>

              <p className="text-[10.5px] sm:text-xs text-slate-300 font-light leading-relaxed max-w-sm mx-auto">
                Community chat is active. Warm up with Vice City Run in the arcade while you wait.
              </p>

              {onLaunchArcade && (
                <div className="pt-1 sm:pt-2 flex items-center justify-center">
                  <ViceButton
                    variant="pink"
                    size="sm"
                    onClick={onLaunchArcade}
                    icon={<Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" />}
                    className="!py-1 sm:!py-1.5 !px-2.5 sm:!px-3.5 !text-[10px] sm:!text-xs font-mono font-bold tracking-wider"
                  >
                    PLAY ARCADE // VICE CITY RUN
                  </ViceButton>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* 2. STATE: LIVE — Clean YouTube Livestream Only (No Overlays or Arcade) */}
      {streamState === 'LIVE' && (
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          <iframe
            key={`${youtubeVideoId}-${isAudioMuted ? 'muted' : 'unmuted'}`}
            src={embedUrl}
            title="GameScope Live Stream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setIsVideoLoading(false)}
            onError={() => {
              setIsVideoLoading(false);
              setHasError(true);
            }}
            className="w-full h-full border-0 absolute inset-0 z-10"
          />

          {!hasUserUnmuted && !isVideoLoading && (
            <div className="absolute top-3 left-3 z-20 flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePlayWithSound}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#0b0e17]/95 hover:bg-[#141926] border border-white/20 text-xs font-mono text-white shadow-lg transition-colors group"
                title="Enable stream sound"
              >
                <Volume2 className="w-4 h-4 text-[#00f0ff] group-hover:scale-110 transition-transform" />
                <span className="font-bold tracking-wide">PLAY WITH SOUND</span>
              </button>
            </div>
          )}

          {isVideoLoading && !hasError && (
            <div className="absolute inset-0 bg-[#080b11] flex flex-col items-center justify-center z-20 space-y-3">
              <div className="w-8 h-8 border-2 border-[#00f0ff]/30 border-t-[#00f0ff] rounded-full animate-spin" />
              <p className="text-[11px] font-mono text-slate-400 tracking-wider">CONNECTING TO LIVESTREAM...</p>
            </div>
          )}

          {hasError && (
            <div className="absolute inset-0 bg-[#0b0e17] flex flex-col items-center justify-center z-20 p-6 text-center space-y-3">
              <AlertCircle className="w-7 h-7 text-[#ff2a85]" />
              <h3 className="font-display font-bold text-white text-sm">BROADCAST TEMPORARILY UNAVAILABLE</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                The connection experienced an interruption. Reconnecting to the live broadcast.
              </p>
              <ViceButton
                variant="cyan"
                size="sm"
                onClick={() => {
                  setHasError(false);
                  setIsVideoLoading(true);
                }}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                RECONNECT
              </ViceButton>
            </div>
          )}
        </div>
      )}

      {/* 3. STATE: BREAK — Intermission with Direct Arcade Experience & Leaderboard */}
      {streamState === 'BREAK' && (
        isArcadeActive ? (
          <div className="relative w-full aspect-video bg-[#05030c] overflow-hidden">
            <ViceCityRunArcade
              streamState={streamState}
              onExit={onExitArcade || (() => {})}
              onScoreSubmitted={onScoreSubmitted}
            />
          </div>
        ) : (
          <div className="relative w-full aspect-video bg-[#080b11] overflow-hidden flex flex-col items-center justify-center p-6 text-center">
            <img
              src={ASSETS.posters.gta6Desktop}
              alt="Stream Intermission"
              className="absolute inset-0 w-full h-full object-cover filter brightness-[0.25] blur-[2px]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-transparent to-[#080b11]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25 pointer-events-none" />

            <div className="relative z-10 max-w-lg space-y-3">
              <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-md bg-[#ffaa00]/15 border border-[#ffaa00]/30 text-[#ffaa00] text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ffaa00] animate-ping" />
                <span>STREAM INTERMISSION</span>
              </div>

              <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-wider uppercase">
                Taking a Short Break
              </h2>

              {/* Resume Notification Badge */}
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-black/75 border border-[#00f0ff]/30 text-slate-200 font-mono shadow-lg backdrop-blur-md">
                <Bell className="w-3.5 h-3.5 text-[#00f0ff] animate-pulse" />
                <span className="text-[11px] font-mono tracking-wide text-slate-200">
                  We'll notify you the moment the stream resumes live.
                </span>
              </div>

              <p className="text-xs text-slate-300 font-light leading-relaxed">
                The broadcast will resume shortly. Community chat remains open, and you can warm up in Vice City Run while you wait.
              </p>

              {onLaunchArcade && (
                <div className="pt-2 sm:pt-3 flex items-center justify-center">
                  <ViceButton
                    variant="pink"
                    size="sm"
                    onClick={onLaunchArcade}
                    icon={<Gamepad2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-0.5" />}
                    className="!py-1 sm:!py-1.5 !px-2.5 sm:!px-3.5 !text-[10px] sm:!text-xs font-mono font-bold tracking-wider"
                  >
                    PLAY ARCADE // VICE CITY RUN
                  </ViceButton>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* 4. STATE: STARTING — Announcement & Shutdown Alert */}
      {streamState === 'STARTING' && (
        <div className="relative w-full aspect-video bg-[#080b11] overflow-hidden flex flex-col items-center justify-center p-6 text-center">
          <img
            src={ASSETS.posters.gta6Desktop}
            alt="Starting Soon"
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.28] contrast-[1.1]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-transparent to-[#080b11]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25 pointer-events-none" />

          <div className="relative z-10 max-w-lg space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-md bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] text-[10px] font-mono font-bold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>STARTING SOON</span>
            </div>

            <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-wider uppercase">
              TIME'S UP! THE STREAM IS ABOUT TO START
            </h2>

            <p className="text-xs text-slate-200 font-light leading-relaxed">
              Prepare for the live broadcast premiere. Active arcade sessions have concluded and scores are locked.
            </p>
          </div>
        </div>
      )}

      {/* 5. STATE: ENDED / INACTIVE — Synchronized Screen Messaging */}
      {streamState === 'ENDED' && (
        <div className="relative w-full aspect-video bg-[#080b11] overflow-hidden flex flex-col items-center justify-center p-6 text-center">
          <img
            src={ASSETS.posters.gta6Desktop}
            alt="Broadcast Concluded"
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.22] contrast-[1.1]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-black/70 to-[#080b11]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25 pointer-events-none" />

          <div className="relative z-10 max-w-lg space-y-3 px-4">
            <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-md bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-mono font-bold">
              <span>BROADCAST CONCLUDED</span>
            </div>

            <h2 className="font-display font-black text-xl sm:text-2xl text-white tracking-wider uppercase">
              {inactiveScreen?.heading || 'THE BROADCAST HAS CONCLUDED'}
            </h2>

            <p className="text-xs text-slate-200 font-light leading-relaxed">
              {inactiveScreen?.description || 'Thank you for tuning in to the GameScope Live premiere event. Replay highlights and full breakdowns will be released shortly.'}
            </p>

            {inactiveScreen?.secondaryMessage && (
              <p className="text-[11px] text-[#00f0ff] font-mono pt-2 border-t border-white/10">
                {inactiveScreen.secondaryMessage}
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
