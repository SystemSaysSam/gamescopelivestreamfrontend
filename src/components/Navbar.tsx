import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Radio, ChevronRight, Music, Sparkles } from 'lucide-react';
import { HudShield, HudRadar } from './icons/GameIcons';
import { soundManager } from '../services/soundManager';
import { StreamState } from '../types';

interface NavbarProps {
  currentChannelTitle: string;
  gameSlug: string;
  streamState: StreamState;
  onChannelSelect?: (slug: string) => void;
  onOpenArcade?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentChannelTitle, 
  gameSlug, 
  streamState,
  onOpenArcade 
}) => {
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [volume, setVolume] = useState(soundManager.getVolume());
  const [isBgmPlaying, setIsBgmPlaying] = useState(soundManager.getIsBgmPlaying());
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [logoClicked, setLogoClicked] = useState(false);

  useEffect(() => {
    const unsubscribe = soundManager.subscribe(() => {
      setIsMuted(soundManager.getIsMuted());
      setVolume(soundManager.getVolume());
      setIsBgmPlaying(soundManager.getIsBgmPlaying());
    });
    return unsubscribe;
  }, []);

  const handleToggleSound = () => {
    const nextMute = soundManager.toggleMute();
    setIsMuted(nextMute);
  };

  const handleToggleBgm = () => {
    const state = soundManager.toggleBgm();
    setIsBgmPlaying(state);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundManager.setVolume(val);
    if (isMuted && val > 0) {
      soundManager.setMuted(false);
    }
  };

  const handleLogoClick = () => {
    setLogoClicked(true);
    setTimeout(() => setLogoClicked(false), 400);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#07090e]/95 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Breadcrumb */}
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleLogoClick}
            className={`flex items-center space-x-3 group text-left focus:outline-none transition-transform duration-200 ${
              logoClicked ? 'scale-95' : 'hover:scale-[1.02]'
            }`}
          >
            {/* Logo Shield Icon Container */}
            <div className="relative w-9 h-9 rounded-lg bg-[#131926] border border-[#F276B9]/50 flex items-center justify-center group-hover:border-[#F276B9] shadow-sm transition-all duration-200">
              <HudShield className="w-5 h-5 text-[#F276B9] group-hover:text-[#00f0ff] transition-colors" />
              {logoClicked && (
                <span className="absolute inset-0 rounded-lg bg-[#00f0ff]/20 animate-ping pointer-events-none" />
              )}
            </div>

            {/* Logo Text Hierarchy */}
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-display font-black text-lg tracking-wider text-white">GAME</span>
                <span className="font-display font-black text-lg tracking-wider text-[#00f0ff]">SCOPE</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-ping" />
                  <span>LIVE</span>
                </span>
              </div>
              <p className="text-[10px] font-mono tracking-wider text-slate-400">DISCOVER. EXPLORE. EXPERIENCE.</p>
            </div>
          </button>

          {/* Breadcrumb Navigation (Multi-Game Architecture) */}
          <nav className="hidden md:flex items-center space-x-2 text-xs font-mono text-slate-400 border-l border-white/10 pl-6">
            <span className="text-slate-500">CHANNELS</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-[#00f0ff] font-semibold flex items-center gap-1.5">
              <HudRadar className="w-3.5 h-3.5 text-[#00f0ff]" />
              <span>{gameSlug.toUpperCase()}</span>
            </span>
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Live Intel Indicator */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-black/40 border border-white/10 text-xs font-mono">
            <Radio className="w-3.5 h-3.5 text-[#00ff88] animate-pulse" />
            <span className="text-slate-400">STATUS:</span>
            <span className={`font-bold ${
              streamState === 'LIVE' ? 'text-[#00ff88]' : streamState === 'BREAK' ? 'text-[#ffaa00]' : streamState === 'UPCOMING' ? 'text-[#00f0ff]' : 'text-[#ff2a85]'
            }`}>
              {streamState}
            </span>
          </div>

          {/* Background Music Toggle Button */}
          <button
            onClick={handleToggleBgm}
            title={isBgmPlaying ? "Pause Cinematic BGM" : "Play Cinematic BGM"}
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
              isBgmPlaying 
                ? 'bg-[#ff2a85]/15 border-[#ff2a85]/40 text-[#ff2a85] shadow-[0_0_12px_rgba(255,42,133,0.25)]' 
                : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Music className={`w-3.5 h-3.5 ${isBgmPlaying ? 'animate-bounce' : ''}`} />
            <span>{isBgmPlaying ? 'BGM ON' : 'BGM OFF'}</span>
          </button>

          {/* Tactical Sound Controller with Visualizer */}
          <div className="relative">
            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg p-1 space-x-1">
              <button
                onClick={handleToggleSound}
                onMouseEnter={() => setShowVolumeSlider(true)}
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
                className={`p-2 rounded-md transition-all ${
                  isMuted 
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-white/5' 
                    : 'text-[#00f0ff] hover:text-[#ff2a85] hover:bg-white/5'
                }`}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Volume Slider dropdown */}
              {showVolumeSlider && (
                <div 
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  className="absolute right-0 top-12 p-3 rounded-lg bg-[#0b0e17] shadow-xl border border-white/20 flex items-center space-x-2 w-44 z-50 animate-in fade-in"
                >
                  <span className="text-[10px] font-mono text-slate-400">VOL:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-[#ff2a85] cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <span className="text-[10px] font-mono text-[#00f0ff] min-w-[28px] text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
