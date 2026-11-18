/**
 * GameScope Live — Tactical HUD Operative Avatars & Callsign Generation Pools
 */

import { UserGender, UserIdentity } from '../types';

export const AVATAR_SVGS = {
  cyberHelmet: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#111624"/>
    <circle cx="20" cy="18" r="9" stroke="#00f0ff" stroke-width="2" fill="#182033"/>
    <path d="M14 18H26" stroke="#00f0ff" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M12 28C12 23.5817 15.5817 20 20 20C24.4183 20 28 23.5817 28 28" stroke="#ff2a85" stroke-width="2" stroke-linecap="round"/>
    <circle cx="20" cy="18" r="2" fill="#00ff88"/>
  </svg>`,
  
  tacticalVisor: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#141021"/>
    <path d="M10 16L20 12L30 16V22L20 26L10 22V16Z" stroke="#ff2a85" stroke-width="2" fill="#201533"/>
    <line x1="12" y1="18" x2="28" y2="18" stroke="#00f0ff" stroke-width="2"/>
    <path d="M14 27C14 24 16.5 22 20 22C23.5 22 26 24 26 27" stroke="#00f0ff" stroke-width="1.8"/>
  </svg>`,

  reconScout: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#0d181c"/>
    <circle cx="20" cy="17" r="8" stroke="#00ff88" stroke-width="2" fill="#132629"/>
    <circle cx="17" cy="16" r="2" fill="#00f0ff"/>
    <circle cx="23" cy="16" r="2" fill="#00f0ff"/>
    <path d="M11 29C12.5 24 16 22 20 22C24 22 27.5 24 29 29" stroke="#00ff88" stroke-width="2"/>
    <path d="M17 10L20 7L23 10" stroke="#ffaa00" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  neonPhantom: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#1f0f1c"/>
    <path d="M12 14C12 14 16 11 20 11C24 11 28 14 28 14V22C28 26.4 20 29 20 29C20 29 12 26.4 12 22V14Z" stroke="#ff2a85" stroke-width="2" fill="#2d1328"/>
    <circle cx="17" cy="19" r="1.5" fill="#00f0ff"/>
    <circle cx="23" cy="19" r="1.5" fill="#00f0ff"/>
    <line x1="16" y1="23" x2="24" y2="23" stroke="#ffaa00" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  outlawPilot: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" rx="10" fill="#1a1c12"/>
    <circle cx="20" cy="18" r="9" stroke="#ffaa00" stroke-width="2" fill="#292613"/>
    <rect x="13" y="15" width="14" height="6" rx="2" fill="#00f0ff" fill-opacity="0.8"/>
    <path d="M13 28C14 24 17 22 20 22C23 22 26 24 27 28" stroke="#ffaa00" stroke-width="2"/>
  </svg>`
};

export const NAME_POOLS: Record<UserGender, string[]> = {
  male: [
    'CrazyTommy',
    'CuteCJ',
    'SilentTrevor',
    'LuckyLamar',
    'WildFranklin',
    'ChillNiko',
    'DarkMichael',
    'HappyLamar',
    'SwiftJason',
    'FearlessClaude',
    'GoldenRoman',
    'NeonSweet'
  ],
  female: [
    'BraveLucia',
    'NeonCatalina',
    'SolarisCandy',
    'VelvetMercedes',
    'SirenKendl',
    'ElectraTracey',
    'FrostyAmanda',
    'SilentMallorie',
    'WildPaige',
    'CrimsonAsuka'
  ],
  unspecified: [
    'CyberTrevor',
    'AtomicLamar',
    'GhostNiko',
    'ZeroTommy',
    'QuantumClaude',
    'AeroFranklin',
    'NeonMichael',
    'CosmicPavel'
  ]
};

export const COLOR_POOL = [
  '#00f0ff', // Cyan
  '#ff2a85', // Magenta
  '#00ff88', // Green
  '#ffaa00', // Amber
  '#9d4edd', // Purple
  '#38bdf8'  // Sky
];

export const generateIdentity = (gender: UserGender): UserIdentity => {
  const names = NAME_POOLS[gender];
  const username = names[Math.floor(Math.random() * names.length)];
  const avatarKeys = Object.keys(AVATAR_SVGS) as (keyof typeof AVATAR_SVGS)[];
  const avatarKey = avatarKeys[Math.floor(Math.random() * avatarKeys.length)];
  const color = COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];

  return {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    username,
    avatarSeed: avatarKey,
    avatarSvg: AVATAR_SVGS[avatarKey],
    color,
    badge: 'OPERATIVE'
  };
};
