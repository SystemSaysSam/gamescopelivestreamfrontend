import React from 'react';

export type ReactionType = 'heart' | 'fire' | 'laugh' | 'shock' | 'skull' | 'clap' | 'hype' | 'gaming';

export interface ReactionConfig {
  type: ReactionType;
  label: string;
  char: string;
  gradient: string;
  svg: string;
  defaultCount: number;
}

/**
 * Curated 3D-Style Dimensional Reaction Emojis
 * Glossy, vibrant, polished SVG illustrations with specular reflections and radial depth.
 */
export const REACTION_SVGS: Record<ReactionType, string> = {
  heart: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="hGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ff7eb3"/>
        <stop offset="45%" stop-color="#ff2a85"/>
        <stop offset="90%" stop-color="#c40055"/>
      </radialGradient>
      <linearGradient id="hShine" x1="20%" y1="15%" x2="50%" y2="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="M18 32C18 32 3.5 22.5 3.5 13C3.5 7.5 8 3.5 13.5 3.5C16.8 3.5 18 5.5 18 5.5C18 5.5 19.2 3.5 22.5 3.5C28 3.5 32.5 7.5 32.5 13C32.5 22.5 18 32 18 32Z" fill="url(#hGrad)"/>
    <ellipse cx="11" cy="10" rx="4" ry="2.5" transform="rotate(-30 11 10)" fill="url(#hShine)"/>
  </svg>`,

  fire: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="fGrad" cx="50%" cy="80%" r="75%">
        <stop offset="0%" stop-color="#ffe600"/>
        <stop offset="35%" stop-color="#ff6b00"/>
        <stop offset="85%" stop-color="#e01235"/>
      </radialGradient>
      <radialGradient id="fCore" cx="50%" cy="60%" r="50%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#ffea78"/>
        <stop offset="100%" stop-color="#ff9900" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <path d="M18 3.5C18 3.5 23 11 20 16C23 14 26 10 26 10C26 10 32 18 29 25C26 32 19 33.5 18 33.5C17 33.5 10 32 7 25C4 18 10 10 10 10C10 10 13 14 16 16C13 11 18 3.5 18 3.5Z" fill="url(#fGrad)"/>
    <path d="M18 16C19.5 16 23 20 21 24C19 28 17 28 18 31C16 31 13 28 14 24C15 20 18 16 18 16Z" fill="url(#fCore)"/>
  </svg>`,

  laugh: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="lGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#fff59d"/>
        <stop offset="55%" stop-color="#ffb300"/>
        <stop offset="100%" stop-color="#e65100"/>
      </radialGradient>
    </defs>
    <circle cx="18" cy="18" r="15" fill="url(#lGrad)"/>
    <path d="M9 13C11 11 14 11 15 13M21 13C22 11 25 11 27 13" stroke="#5d2a00" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M10 20C11 26 25 26 26 20C26 20 18 20 10 20Z" fill="#3e1b00"/>
    <path d="M13 20C14 24 22 24 23 20" fill="#ffffff"/>
    <ellipse cx="6" cy="16" rx="2" ry="3.5" fill="#00d4ff" transform="rotate(-15 6 16)"/>
    <ellipse cx="30" cy="16" rx="2" ry="3.5" fill="#00d4ff" transform="rotate(15 30 16)"/>
  </svg>`,

  shock: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#fff59d"/>
        <stop offset="55%" stop-color="#ffb300"/>
        <stop offset="100%" stop-color="#f57c00"/>
      </radialGradient>
    </defs>
    <circle cx="18" cy="18" r="15" fill="url(#sGrad)"/>
    <circle cx="12" cy="14" r="3.2" fill="#3e1b00"/>
    <circle cx="13" cy="13" r="1" fill="#ffffff"/>
    <circle cx="24" cy="14" r="3.2" fill="#3e1b00"/>
    <circle cx="25" cy="13" r="1" fill="#ffffff"/>
    <ellipse cx="18" cy="24" rx="4.5" ry="6" fill="#3e1b00"/>
  </svg>`,

  skull: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="skGrad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="60%" stop-color="#cfd8dc"/>
        <stop offset="100%" stop-color="#78909c"/>
      </radialGradient>
    </defs>
    <path d="M18 4C10 4 6 10 6 18C6 23 10 24 11 26C11 28 12 31 15 31H21C24 31 25 28 25 26C26 24 30 23 30 18C30 10 26 4 18 4Z" fill="url(#skGrad)"/>
    <ellipse cx="13" cy="17" rx="3.5" ry="4.5" fill="#1c252b"/>
    <ellipse cx="23" cy="17" rx="3.5" ry="4.5" fill="#1c252b"/>
    <polygon points="18,21 16.5,24 19.5,24" fill="#37474f"/>
    <line x1="15" y1="28" x2="15" y2="31" stroke="#546e7a" stroke-width="1.8"/>
    <line x1="18" y1="28" x2="18" y2="31" stroke="#546e7a" stroke-width="1.8"/>
    <line x1="21" y1="28" x2="21" y2="31" stroke="#546e7a" stroke-width="1.8"/>
  </svg>`,

  clap: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="cGrad" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffe082"/>
        <stop offset="55%" stop-color="#ffb74d"/>
        <stop offset="100%" stop-color="#f57c00"/>
      </radialGradient>
    </defs>
    <path d="M14 6C13 6 12 7 12 8.5V17L10 15C9 14 7.5 14 6.5 15C5.5 16 5.5 17.5 6.5 18.5L13 25C15 27 18 28 21 28H24C27 28 29 26 29 23V14C29 12.5 28 11.5 26.5 11.5C26 11.5 25.5 11.7 25 12V9.5C25 8 24 7 22.5 7C22 7 21.5 7.2 21 7.5V6C21 4.5 20 3.5 18.5 3.5C17.5 3.5 16.7 4 16.3 4.8C15.8 4.3 15 4 14 4V6Z" fill="url(#cGrad)"/>
    <path d="M5 8L3 6M7 4L7 1M11 6L13 4" stroke="#ffeb3b" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  hype: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="hyGrad" cx="30%" cy="20%" r="80%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="30%" stop-color="#72f8ff"/>
        <stop offset="70%" stop-color="#00bcd4"/>
        <stop offset="100%" stop-color="#00695c"/>
      </radialGradient>
      <filter id="hGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <polygon points="20,2 7,19 17,19 14,34 29,15 19,15" fill="url(#hyGrad)" filter="url(#hGlow)"/>
  </svg>`,

  gaming: `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="gPadGrad" cx="30%" cy="30%" r="75%">
        <stop offset="0%" stop-color="#3d4455"/>
        <stop offset="60%" stop-color="#1e222e"/>
        <stop offset="100%" stop-color="#0f1118"/>
      </radialGradient>
    </defs>
    <path d="M6 13C6 10 10 9 14 9H22C26 9 30 10 30 13C30 18 32 25 30 28C28 31 24 29 22 24L20 22H16L14 24C12 29 8 31 6 28C4 25 6 18 6 13Z" fill="url(#gPadGrad)" stroke="#ff2a85" stroke-width="1.2"/>
    <path d="M12 13V19M9 16H15" stroke="#00f0ff" stroke-width="2" stroke-linecap="round"/>
    <circle cx="23" cy="18" r="1.5" fill="#ff2a85"/>
    <circle cx="26" cy="15" r="1.5" fill="#00ff88"/>
    <circle cx="23" cy="13" r="1.5" fill="#ffe600"/>
    <circle cx="20" cy="15" r="1.5" fill="#00f0ff"/>
  </svg>`
};

export const REACTION_CONFIGS: ReactionConfig[] = [
  { type: 'fire', label: 'Fire', char: '🔥', gradient: '#ff4d00', svg: REACTION_SVGS.fire, defaultCount: 142 },
  { type: 'heart', label: 'Love', char: '❤️', gradient: '#ff2a85', svg: REACTION_SVGS.heart, defaultCount: 98 },
  { type: 'hype', label: 'Hype', char: '⚡', gradient: '#00f0ff', svg: REACTION_SVGS.hype, defaultCount: 86 },
  { type: 'gaming', label: 'Game', char: '🎮', gradient: '#a855f7', svg: REACTION_SVGS.gaming, defaultCount: 64 },
  { type: 'laugh', label: 'Laugh', char: '😂', gradient: '#eab308', svg: REACTION_SVGS.laugh, defaultCount: 42 },
  { type: 'shock', label: 'Shock', char: '😮', gradient: '#f97316', svg: REACTION_SVGS.shock, defaultCount: 31 },
  { type: 'skull', label: 'Dead', char: '💀', gradient: '#94a3b8', svg: REACTION_SVGS.skull, defaultCount: 29 },
  { type: 'clap', label: 'Clap', char: '👏', gradient: '#eab308', svg: REACTION_SVGS.clap, defaultCount: 22 }
];
