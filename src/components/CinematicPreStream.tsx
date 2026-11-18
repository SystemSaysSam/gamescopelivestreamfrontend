import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Bell, Check } from 'lucide-react';
import { HudRadar, HudCrosshair } from './icons/GameIcons';
import { soundManager } from '../services/soundManager';
import { notificationService } from '../services/notificationService';
import { ViceButton } from './ViceButton';
import { CountdownConfig, StreamState } from '../types';
import { ASSETS } from '../config';

interface CinematicPreStreamProps {
  streamState: StreamState;
  countdownConfig?: CountdownConfig;
  userId?: string;
}

export const CinematicPreStream: React.FC<CinematicPreStreamProps> = ({ 
  streamState,
  countdownConfig,
  userId
}) => {
  // Authoritative Target Timestamp in MS
  const targetTimestampMs = countdownConfig?.targetTimestampMs || Date.now() + (3 * 3600 + 42 * 60 + 18) * 1000;
  const eventLabel = countdownConfig?.label || 'EVENT TIME: 4:30 PM IST';

  const calculateTimeLeft = () => {
    const diff = targetTimestampMs - Date.now();
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);
  const [isBgmPlaying, setIsBgmPlaying] = useState(soundManager.getIsBgmPlaying());
  const [, setIsMuted] = useState(soundManager.getIsMuted());

  // Native Browser Push Subscription State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [subscribing, setSubscribing] = useState(false);

  // Check actual push subscription status on mount
  useEffect(() => {
    notificationService.checkSubscriptionStatus().then((status) => {
      setIsSubscribed(status.isSubscribed);
      setPermissionState(status.permission);
    });
  }, []);

  // Synchronized 1-second countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetTimestampMs]);

  // Request & register real browser push subscription
  const handleRequestNotification = async () => {
    if (!notificationService.isSupported()) {
      alert('Desktop push notifications are not supported in this browser.');
      return;
    }

    if (permissionState === 'denied') {
      alert('Notifications are blocked in your browser settings. Please allow notifications for this site to receive the 15-minute start reminder.');
      return;
    }

    setSubscribing(true);
    try {
      const res = await notificationService.subscribeToPush(userId);
      setPermissionState(res.permission);
      if (res.success && res.isSubscribed) {
        setIsSubscribed(true);
      } else if (res.error) {
        alert(res.error);
      }
    } finally {
      setSubscribing(false);
    }
  };

  // Push notification trigger when stream switches to STARTING or LIVE
  useEffect(() => {
    if (streamState === 'STARTING' || streamState === 'LIVE') {
      notificationService.sendStartingNotification(false);
    } else if (streamState === 'UPCOMING') {
      notificationService.resetStartingFlag();
    }
  }, [streamState]);

  useEffect(() => {
    const unsub = soundManager.subscribe(() => {
      setIsBgmPlaying(soundManager.getIsBgmPlaying());
      setIsMuted(soundManager.getIsMuted());
    });
    return unsub;
  }, []);

  const handleToggleBgm = () => {
    const nextState = soundManager.toggleBgm();
    setIsBgmPlaying(nextState);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-[#07090e] shadow-2xl mb-8 group">
      
      {/* 1. Official GTA 6 Poster Backdrop (Responsive Desktop & Mobile) */}
      <div className="relative h-[340px] sm:h-[420px] md:h-[480px] lg:h-[520px] w-full overflow-hidden bg-black">
        <picture>
          <source media="(max-width: 640px)" srcSet={ASSETS.posters.gta6Mobile} />
          <img
            src={ASSETS.posters.gta6Desktop}
            alt="Grand Theft Auto VI Official Artwork"
            className="w-full h-full object-cover object-center sm:object-top filter brightness-[0.6] contrast-[1.1] scale-100 transition-transform duration-700 ease-out"
          />
        </picture>

        {/* Cinematic Vignettes for comfortable contrast without obscuring the artwork */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090e]/80 via-transparent to-transparent hidden sm:block" />
        
        {/* Subtle scanline texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100%_4px] opacity-25 pointer-events-none" />

        {/* Corner Reticles */}
        <div className="absolute top-4 left-4 text-[#00f0ff]/30 pointer-events-none hidden sm:block">
          <HudCrosshair className="w-4 h-4" />
        </div>
        <div className="absolute top-4 right-4 text-[#F276B9]/30 pointer-events-none hidden sm:block">
          <HudCrosshair className="w-4 h-4" />
        </div>

        {/* Top Status Bar: Desktop Row & Mobile Top Row */}
        <div className="absolute top-3 sm:top-5 left-3 sm:left-6 right-3 sm:right-6 z-20">
          
          {/* Mobile Top Row: Compact Countdown (Left) + BGM Control (Right) */}
          <div className="flex sm:hidden items-center justify-between w-full">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/75 border border-white/15 backdrop-blur-md text-[10px] font-mono text-slate-300 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-ping mr-0.5" />
              <span className="text-[#00f0ff] font-bold">
                {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-slate-400 text-[8.5px] font-sans uppercase tracking-wider">REMAINS</span>
            </div>

            <button
              type="button"
              onClick={handleToggleBgm}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/75 hover:bg-black/90 border border-white/15 text-[10px] font-mono text-slate-200 backdrop-blur-md transition-all shadow-sm"
              title={isBgmPlaying ? 'Pause ambient soundtrack' : 'Play ambient soundtrack'}
            >
              {isBgmPlaying ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                  <span className="text-[#00f0ff]">BGM ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400">BGM OFF</span>
                </>
              )}
            </button>
          </div>

          {/* Desktop Top Row: Live Stream Badge (Left) + Full Soundtrack Control (Right) */}
          <div className="hidden sm:flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider bg-[#ff2a85]/20 text-[#ff2a85] border border-[#ff2a85]/40 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff2a85] animate-ping" />
                <span>LIVE STREAM</span>
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleToggleBgm}
                className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-[11px] font-mono text-slate-200 transition-all backdrop-blur-md"
                title={isBgmPlaying ? 'Pause ambient soundtrack' : 'Play ambient soundtrack'}
              >
                {isBgmPlaying ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#00f0ff]" />
                    <span className="text-[#00f0ff]">SOUNDTRACK ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-400">SOUNDTRACK OFF</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Main Event Headline & Hero Information */}
        <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-8 right-3 sm:right-8 z-20 max-w-2xl lg:max-w-3xl">
          
          {/* Mobile Hero Content */}
          <div className="block sm:hidden">
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#131926]/90 border border-[#F276B9]/30 text-[#F276B9] text-[9px] font-mono mb-1 backdrop-blur-md">
              <HudRadar className="w-2.5 h-2.5 text-[#F276B9]" />
              <span>{eventLabel}</span>
            </div>

            <h1 className="font-display font-black text-lg text-white tracking-tight uppercase leading-snug drop-shadow-md max-w-[260px]">
              THE WAIT IS ALMOST OVER.
            </h1>

            <p className="text-[11px] text-slate-300 font-light max-w-[270px] mt-1 leading-snug">
              Join us for the GTA VI launch-day livestream experience.
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              <ViceButton
                variant={isSubscribed ? 'cyan' : permissionState === 'denied' ? 'dark' : 'pink'}
                size="sm"
                onClick={handleRequestNotification}
                disabled={subscribing}
                icon={isSubscribed ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Bell className="w-3.5 h-3.5" />}
                className="!py-1.5 !px-3 !text-xs font-mono font-bold"
              >
                {isSubscribed ? 'ALERT SET' : subscribing ? 'SETTING...' : permissionState === 'denied' ? 'BLOCKED' : 'NOTIFY ME!'}
              </ViceButton>
            </div>
          </div>

          {/* Desktop Hero Content */}
          <div className="hidden sm:block">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-[#131926]/90 border border-[#F276B9]/30 text-[#F276B9] text-xs font-mono mb-2 backdrop-blur-md">
              <HudRadar className="w-3 h-3 text-[#F276B9]" />
              <span>{eventLabel}</span>
            </div>

            <h1 className="font-display font-black text-3xl md:text-4xl lg:text-5xl text-white tracking-tight uppercase leading-tight drop-shadow-md">
              THE WAIT IS ALMOST OVER.
            </h1>

            <p className="text-sm text-slate-300 font-light max-w-xl mt-1.5 leading-relaxed">
              Join us for the GTA VI launch-day livestream experience.
            </p>

            {/* Desktop Countdown & Actions Row */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-3 border-t border-white/10">
              
              {/* Live Countdown Box */}
              <div className="flex items-center space-x-2">
                <div className="text-center px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/15 min-w-[50px] backdrop-blur-md">
                  <span className="font-display font-black text-lg text-white block leading-tight">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">HRS</span>
                </div>
                <span className="text-slate-500 font-bold text-xs">:</span>
                <div className="text-center px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/15 min-w-[50px] backdrop-blur-md">
                  <span className="font-display font-black text-lg text-[#00f0ff] block leading-tight">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">MIN</span>
                </div>
                <span className="text-slate-500 font-bold text-xs">:</span>
                <div className="text-center px-2.5 py-1.5 rounded-lg bg-black/70 border border-white/15 min-w-[50px] backdrop-blur-md">
                  <span className="font-display font-black text-lg text-[#ff2a85] block leading-tight animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">SEC</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <ViceButton
                  variant={isSubscribed ? 'cyan' : permissionState === 'denied' ? 'dark' : 'pink'}
                  size="sm"
                  onClick={handleRequestNotification}
                  disabled={subscribing}
                  icon={isSubscribed ? <Check className="w-3.5 h-3.5 text-[#00ff88]" /> : <Bell className="w-3.5 h-3.5" />}
                  className="!py-1.5 !px-3.5 !text-xs font-mono font-bold"
                >
                  {isSubscribed ? 'ALERT SET' : subscribing ? 'SETTING...' : permissionState === 'denied' ? 'NOTIFICATIONS BLOCKED' : 'NOTIFY ME!'}
                </ViceButton>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
