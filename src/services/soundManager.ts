/**
 * GameScope Live — Audio Engine
 * Media Audio Only: Background Music & Livestream Audio.
 * 
 * Rules:
 * 1. Stream State STARTING & LIVE: Background music volume smoothly transitions to 0.00 (silent).
 * 2. Stream State BREAK, ENDED, UPCOMING: Background music smoothly restores to normal volume (1.00 multiplier).
 * 3. User Preference Rule: If user has NOT turned on music (or turned it off), it stays OFF in all states.
 *    The automatic volume transitions apply ONLY if the user has music turned on.
 */

import { SoundEffectType, StreamState } from '../types';

const BGM_URL = '/audio/loadingscreenbgm.mp3';

class SoundManager {
  private static instance: SoundManager;
  private bgmAudio: HTMLAudioElement | null = null;
  private isBgmPlaying: boolean = false;
  
  // User's explicit preference: defaults to false (OFF) until user turns on music
  private userWantsBgm: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.75;
  private listeners: Array<() => void> = [];

  // Stream state volume multiplier: 1.00 (UPCOMING, BREAK, ENDED) -> 0.00 (STARTING, LIVE, MUTED)
  private currentStreamState: StreamState = 'UPCOMING';
  private currentMultiplier: number = 1.0;
  private targetMultiplier: number = 1.0;
  private animFrameId: number | null = null;
  private transitionStartTime: number = 0;
  private transitionStartMultiplier: number = 1.0;
  private readonly TRANSITION_DURATION_MS: number = 2500; // 2.5s cinematic smooth transition

  private constructor() {
    try {
      const savedUserBgm = localStorage.getItem('gamescope_user_bgm_enabled');
      if (savedUserBgm !== null) {
        this.userWantsBgm = savedUserBgm === 'true';
      } else {
        // If user has not turned on music, default to OFF
        this.userWantsBgm = false;
      }
      const savedMute = localStorage.getItem('gamescope_live_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      } else {
        this.isMuted = false;
      }
      const savedVol = localStorage.getItem('gamescope_live_volume');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol);
      }
    } catch {}

    if (typeof window !== 'undefined') {
      this.initBgm();
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private initBgm() {
    try {
      if (!this.bgmAudio) {
        this.bgmAudio = new Audio(BGM_URL);
        this.bgmAudio.loop = true;
        this.bgmAudio.preload = 'auto';
      }
      this.applyEffectiveVolume();
      // If user had previously turned on music, play according to stream state
      if (this.userWantsBgm && !this.isMuted) {
        if (this.currentStreamState !== 'LIVE' && this.currentStreamState !== 'STARTING') {
          this.playBgm();
        }
      }
    } catch (e) {
      console.warn('Failed to initialize BGM audio:', e);
    }
  }

  private applyEffectiveVolume() {
    if (!this.bgmAudio) return;
    
    if (this.isMuted || !this.userWantsBgm) {
      this.bgmAudio.volume = 0;
    } else {
      // Normal full volume is volume * 0.45; multiplied by state multiplier (1.00 in UPCOMING/BREAK/ENDED, 0.00 in STARTING/LIVE)
      const target = this.volume * 0.45 * this.currentMultiplier;
      this.bgmAudio.volume = Math.max(0, Math.min(1, target));
    }
  }

  /**
   * Responds to stream state changes with smooth 2.5s volume transitions.
   * - STARTING & LIVE: Smoothly reduces volume to 0.00.
   * - BREAK & ENDED (and UPCOMING): Smoothly restores volume to normal (1.00).
   * - RULE: If user has NOT turned on music (or turned it off), it stays OFF in all states.
   */
  public onStreamStateChange(state: StreamState) {
    this.currentStreamState = state;

    // Rule: If user has not turned on music, it stays turned off
    if (!this.userWantsBgm || this.isMuted) {
      this.targetMultiplier = 0.00;
      this.currentMultiplier = 0.00;
      if (this.bgmAudio && !this.bgmAudio.paused) {
        this.bgmAudio.pause();
      }
      this.applyEffectiveVolume();
      this.notify();
      return;
    }

    // If user has turned on music, apply automatic transitions:
    let target = 0.00;
    if (state === 'STARTING' || state === 'LIVE') {
      // Slowly music should go to 0 volume
      target = 0.00;
    } else if (state === 'BREAK' || state === 'ENDED' || state === 'UPCOMING') {
      // Once it's BREAK or ENDED, it comes back up at normal volume
      target = 1.00;
      if (this.bgmAudio && this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }
    }

    this.transitionToMultiplier(target);
  }

  private transitionToMultiplier(target: number) {
    if (Math.abs(this.targetMultiplier - target) < 0.001) {
      this.applyEffectiveVolume();
      this.notify();
      return;
    }

    this.targetMultiplier = target;
    this.transitionStartMultiplier = this.currentMultiplier;
    this.transitionStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (typeof requestAnimationFrame === 'undefined') {
      this.currentMultiplier = target;
      this.applyEffectiveVolume();
      this.notify();
      return;
    }

    const step = (now: number) => {
      const elapsed = now - this.transitionStartTime;
      const progress = Math.min(1, Math.max(0, elapsed / this.TRANSITION_DURATION_MS));
      
      // Smooth cosine easing (easeInOut)
      const ease = (1 - Math.cos(progress * Math.PI)) / 2;
      this.currentMultiplier = this.transitionStartMultiplier + (this.targetMultiplier - this.transitionStartMultiplier) * ease;

      this.applyEffectiveVolume();

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(step);
      } else {
        this.currentMultiplier = this.targetMultiplier;
        this.applyEffectiveVolume();
        this.animFrameId = null;
        this.notify();
      }
    };

    this.animFrameId = requestAnimationFrame(step);
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch {}
    });
  }

  public getIsMuted(): boolean {
    return this.isMuted || !this.userWantsBgm;
  }

  public getUserWantsBgm(): boolean {
    return this.userWantsBgm && !this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentMultiplier(): number {
    return this.currentMultiplier;
  }

  public getIsBgmPlaying(): boolean {
    return this.userWantsBgm && !this.isMuted;
  }

  public isEffectiveMuted(): boolean {
    return this.isMuted || !this.userWantsBgm;
  }

  public toggleMute(): boolean {
    if (this.getIsMuted()) {
      this.setMuted(false);
      return false;
    } else {
      this.setMuted(true);
      return true;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.userWantsBgm = !muted;
    try {
      localStorage.setItem('gamescope_live_muted', String(muted));
      localStorage.setItem('gamescope_user_bgm_enabled', String(!muted));
    } catch {}

    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (muted) {
      this.targetMultiplier = 0.00;
      this.currentMultiplier = 0.00;
      this.isBgmPlaying = false;
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
    } else {
      if (this.currentStreamState === 'LIVE' || this.currentStreamState === 'STARTING') {
        this.targetMultiplier = 0.00;
        this.currentMultiplier = 0.00;
      } else {
        this.targetMultiplier = 1.00;
        this.currentMultiplier = 1.00;
      }
      this.isBgmPlaying = true;
      if (!this.bgmAudio) {
        this.initBgm();
      } else if (this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }
    }

    this.applyEffectiveVolume();
    this.notify();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('gamescope_live_volume', String(this.volume));
    } catch {}

    if (this.volume > 0 && (this.isMuted || !this.userWantsBgm)) {
      this.isMuted = false;
      this.userWantsBgm = true;
      this.isBgmPlaying = true;
      if (this.currentStreamState === 'LIVE' || this.currentStreamState === 'STARTING') {
        this.currentMultiplier = 0.00;
        this.targetMultiplier = 0.00;
      } else {
        this.currentMultiplier = 1.00;
        this.targetMultiplier = 1.00;
      }
      try {
        localStorage.setItem('gamescope_live_muted', 'false');
        localStorage.setItem('gamescope_user_bgm_enabled', 'true');
      } catch {}
      if (this.bgmAudio && this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }
    } else if (this.volume === 0) {
      this.isMuted = true;
      this.isBgmPlaying = false;
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
    }

    this.applyEffectiveVolume();
    this.notify();
  }

  public playBgm() {
    if (!this.bgmAudio) {
      this.initBgm();
    }
    if (!this.bgmAudio) return;

    this.userWantsBgm = true;
    this.isMuted = false;
    this.isBgmPlaying = true;
    try {
      localStorage.setItem('gamescope_user_bgm_enabled', 'true');
      localStorage.setItem('gamescope_live_muted', 'false');
    } catch {}

    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Set correct multiplier based on stream state
    if (this.currentStreamState === 'STARTING' || this.currentStreamState === 'LIVE') {
      this.currentMultiplier = 0.00;
      this.targetMultiplier = 0.00;
    } else {
      this.currentMultiplier = 1.00;
      this.targetMultiplier = 1.00;
    }

    this.applyEffectiveVolume();

    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isBgmPlaying = true;
          this.notify();
        })
        .catch(() => {
          const resumeOnInteract = () => {
            if (this.bgmAudio && this.userWantsBgm && !this.isMuted) {
              this.bgmAudio.play().then(() => {
                this.isBgmPlaying = true;
                this.notify();
              }).catch(() => {});
            }
            window.removeEventListener('click', resumeOnInteract);
            window.removeEventListener('keydown', resumeOnInteract);
            window.removeEventListener('touchstart', resumeOnInteract);
          };
          window.addEventListener('click', resumeOnInteract, { once: true });
          window.addEventListener('keydown', resumeOnInteract, { once: true });
          window.addEventListener('touchstart', resumeOnInteract, { once: true });
        });
    }

    this.notify();
  }

  public pauseBgm() {
    this.userWantsBgm = false;
    this.isMuted = true;
    this.isBgmPlaying = false;
    try {
      localStorage.setItem('gamescope_user_bgm_enabled', 'false');
      localStorage.setItem('gamescope_live_muted', 'true');
    } catch {}

    if (this.animFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.targetMultiplier = 0.00;
    this.currentMultiplier = 0.00;

    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.applyEffectiveVolume();
    }
    this.notify();
  }

  public toggleBgm(): boolean {
    if (this.getIsBgmPlaying()) {
      this.pauseBgm();
      return false;
    } else {
      this.playBgm();
      return true;
    }
  }

  /**
   * UI Sound Effects permanently disabled per professional livestreaming requirements.
   * Retained as a clean no-op so callers do not break.
   */
  public playSfx(_type?: SoundEffectType): void {
    // Intentionally no-op
  }
}

export const soundManager = SoundManager.getInstance();

if (typeof window !== 'undefined') {
  (window as any).soundManager = soundManager;
}
