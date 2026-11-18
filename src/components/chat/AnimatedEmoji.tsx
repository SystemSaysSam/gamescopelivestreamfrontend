import React from 'react';

export type AnimatedEmojiType = 
  | 'fire'
  | 'heart'
  | 'laugh'
  | 'shock'
  | 'skull'
  | 'clap'
  | 'lightning'
  | 'party';

export interface AnimatedEmojiItem {
  id: AnimatedEmojiType;
  token: string;
  label: string;
  fallbackUnicode: string;
}

export const ANIMATED_EMOJIS: AnimatedEmojiItem[] = [
  { id: 'fire', token: ':anim-fire:', label: 'Animated Fire', fallbackUnicode: '🔥' },
  { id: 'heart', token: ':anim-heart:', label: 'Animated Heart', fallbackUnicode: '❤️' },
  { id: 'laugh', token: ':anim-laugh:', label: 'Animated Laugh', fallbackUnicode: '😂' },
  { id: 'shock', token: ':anim-shock:', label: 'Animated Shocked', fallbackUnicode: '😱' },
  { id: 'skull', token: ':anim-skull:', label: 'Animated Skull', fallbackUnicode: '💀' },
  { id: 'clap', token: ':anim-clap:', label: 'Animated Applause', fallbackUnicode: '👏' },
  { id: 'lightning', token: ':anim-lightning:', label: 'Animated Lightning', fallbackUnicode: '⚡' },
  { id: 'party', token: ':anim-party:', label: 'Animated Celebration', fallbackUnicode: '🎉' }
];

interface AnimatedEmojiProps {
  type: AnimatedEmojiType;
  className?: string;
}

export const AnimatedEmoji: React.FC<AnimatedEmojiProps> = ({ type, className = 'w-[19px] h-[19px]' }) => {
  switch (type) {
    case 'fire':
      return (
        <span 
          role="img" 
          aria-label="animated fire" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[flameDance_0.9s_ease-in-out_infinite_alternate]">
            <path
              d="M16 2C13.5 6 11 9.5 11 13.5C11 15.5 11.8 17.2 13 18.4C11.5 16.8 11 14.8 11 12.5C8.2 15 6.5 18.8 6.5 22.8C6.5 27.5 10.5 30 16 30C21.5 30 25.5 27.5 25.5 22.8C25.5 16.5 20.5 10.5 16 2Z"
              fill="#ff2a85"
            />
            <path
              d="M16 9C14.5 12 12.8 14.5 12.8 17.5C12.8 19 13.4 20.2 14.2 21C13.2 19.8 12.8 18.2 12.8 16.5C10.8 18.2 9.5 21 9.5 24C9.5 27.5 12.4 29 16 29C19.6 29 22.5 27.5 22.5 24C22.5 19.2 19.2 15 16 9Z"
              fill="#ffaa00"
            />
            <path
              d="M16 18C15 19.5 14.2 21 14.2 22.5C14.2 23.5 14.6 24.2 15 24.8C14.5 24 14.2 23 14.2 22C13 23 12 24.5 12 26C12 28 13.8 28.5 16 28.5C18.2 28.5 20 28 20 26C20 23.5 18 21.2 16 18Z"
              fill="#ffffff"
            />
          </svg>
        </span>
      );

    case 'heart':
      return (
        <span 
          role="img" 
          aria-label="animated heart" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[heartPulse_0.8s_ease-in-out_infinite]">
            <path
              d="M16 28S4 20 4 11A7 7 0 0 1 16 6.5A7 7 0 0 1 28 11C28 20 16 28 16 28Z"
              fill="#ff2a85"
            />
            <circle cx="10" cy="11" r="2.5" fill="#ffffff" fillOpacity="0.6" />
          </svg>
        </span>
      );

    case 'laugh':
      return (
        <span 
          role="img" 
          aria-label="animated laugh" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[laughRock_0.7s_ease-in-out_infinite_alternate]">
            <circle cx="16" cy="16" r="14" fill="#ffaa00" />
            <path d="M7 11C9 13.5 11 13.5 12 11" stroke="#261b00" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M20 11C21 13.5 23 13.5 25 11" stroke="#261b00" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M8 17C9 23 23 23 24 17Z" fill="#781122" />
            <path d="M11 20C12 23 20 23 21 20Z" fill="#ff2a85" />
            <path d="M4 14C3 15 3 17 4 18C5 18 5 16 4 14Z" fill="#00f0ff" />
            <path d="M28 14C29 15 29 17 28 18C27 18 27 16 28 14Z" fill="#00f0ff" />
          </svg>
        </span>
      );

    case 'shock':
      return (
        <span 
          role="img" 
          aria-label="animated shock" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[shockShake_0.6s_ease-in-out_infinite_alternate]">
            <circle cx="16" cy="16" r="14" fill="#00f0ff" />
            <ellipse cx="11" cy="13" rx="3.5" ry="4.5" fill="#ffffff" />
            <circle cx="11" cy="13" r="1.5" fill="#07090e" />
            <ellipse cx="21" cy="13" rx="3.5" ry="4.5" fill="#ffffff" />
            <circle cx="21" cy="13" r="1.5" fill="#07090e" />
            <ellipse cx="16" cy="22" rx="4" ry="5.5" fill="#07090e" />
          </svg>
        </span>
      );

    case 'skull':
      return (
        <span 
          role="img" 
          aria-label="animated skull" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[skullGlitch_1.2s_steps(2,start)_infinite]">
            <path d="M6 14C6 8.5 10.5 4 16 4C21.5 4 26 8.5 26 14C26 18.5 23.5 21 21 23V27H11V23C8.5 21 6 18.5 6 14Z" fill="#e2e8f0" />
            <ellipse cx="11.5" cy="14" rx="3" ry="3.5" fill="#ff2a85" />
            <ellipse cx="20.5" cy="14" rx="3" ry="3.5" fill="#00f0ff" />
            <polygon points="16,17.5 14.5,20 17.5,20" fill="#0b0e17" />
            <line x1="13" y1="24" x2="13" y2="27" stroke="#0b0e17" strokeWidth="1.5" />
            <line x1="16" y1="24" x2="16" y2="27" stroke="#0b0e17" strokeWidth="1.5" />
            <line x1="19" y1="24" x2="19" y2="27" stroke="#0b0e17" strokeWidth="1.5" />
          </svg>
        </span>
      );

    case 'clap':
      return (
        <span 
          role="img" 
          aria-label="animated applause" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[clapBounce_0.6s_ease-in-out_infinite]">
            <path d="M13 18L7 12C5.5 10.5 7.5 8.5 9 10L17 18" stroke="#ffaa00" strokeWidth="3" strokeLinecap="round" />
            <path d="M19 18L25 12C26.5 10.5 24.5 8.5 23 10L15 18" stroke="#ffaa00" strokeWidth="3" strokeLinecap="round" />
            <circle cx="16" cy="8" r="1.5" fill="#ffffff" />
            <line x1="16" y1="3" x2="16" y2="5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="5" x2="13.5" y2="6.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="20" y1="5" x2="18.5" y2="6.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      );

    case 'lightning':
      return (
        <span 
          role="img" 
          aria-label="animated lightning" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[lightningFlash_0.7s_infinite]">
            <polygon points="18,2 6,17 15,17 13,30 27,13 18,13" fill="#ffaa00" />
            <polygon points="17,6 9,16 15,16 13,25 23,14 17,14" fill="#ffffff" />
          </svg>
        </span>
      );

    case 'party':
      return (
        <span 
          role="img" 
          aria-label="animated party" 
          className={`inline-flex items-center justify-center align-middle mx-0.5 select-none ${className}`}
        >
          <svg viewBox="0 0 32 32" fill="none" className="w-full h-full animate-[partySpin_1s_ease-in-out_infinite_alternate]">
            <polygon points="5,27 25,18 18,7" fill="#ffaa00" />
            <polygon points="7,25 16,12 12,20" fill="#ff2a85" />
            <circle cx="24" cy="7" r="1.5" fill="#00f0ff" />
            <circle cx="28" cy="14" r="1.2" fill="#00ff88" />
            <circle cx="19" cy="4" r="1" fill="#ff2a85" />
            <path d="M22 10C24 9 26 11 28 9" stroke="#00f0ff" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M19 12C20 14 22 13 24 15" stroke="#ffaa00" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </span>
      );

    default:
      return null;
  }
};

/**
 * Message text parser: replaces animated emoji tokens (e.g. :anim-fire:)
 * with actual AnimatedEmoji components, while leaving regular text and unicode emojis intact.
 */
export const parseMessageWithAnimatedEmojis = (text: string): React.ReactNode => {
  if (!text) return null;

  // Regex matching tokens like :anim-fire:, :anim-heart:, etc.
  const regex = /(:anim-(?:fire|heart|laugh|shock|skull|clap|lightning|party):)/g;
  const parts = text.split(regex);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) => {
    const match = ANIMATED_EMOJIS.find(item => item.token === part);
    if (match) {
      return <AnimatedEmoji key={index} type={match.id} />;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};
