import React from 'react';

interface GameIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Tactical Ballistic Armor Shield — GameScope Logo Icon
 */
export const HudShield: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M12 2L4 5V11C4 16.5 7.5 21 12 22C16.5 21 20 16.5 20 11V5L12 2Z" />
    <path d="M12 6V18" strokeOpacity="0.4" />
    <path d="M8 10L12 14L16 10" strokeOpacity="0.6" />
  </svg>
);

/**
 * Tactical Navigational Radar
 */
export const HudRadar: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" strokeOpacity="0.4" />
    <polygon points="12,5 14,12 12,19 10,12" fill="currentColor" fillOpacity="0.25" />
    <line x1="12" y1="3" x2="12" y2="5" stroke="#F276B9" />
    <line x1="12" y1="19" x2="12" y2="21" />
    <line x1="3" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
);

/**
 * Tactical Live Broadcast Satellite / Signal
 */
export const HudSignal: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M4.93 19.07A10 10 0 0 1 4.93 4.93" />
    <path d="M7.76 16.24A6 6 0 0 1 7.76 7.76" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.48" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

/**
 * Tactical Crosshair
 */
export const HudCrosshair: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="8" strokeOpacity="0.4" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.3" />
    <line x1="12" y1="2" x2="12" y2="7" />
    <line x1="12" y1="17" x2="12" y2="22" />
    <line x1="2" y1="12" x2="7" y2="12" />
    <line x1="17" y1="12" x2="22" y2="12" />
  </svg>
);

/**
 * Tactical Bounty / Contract Reward / Vice Bucks
 */
export const HudCoin: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="currentColor" fillOpacity="0.15" />
    <path d="M12 6V18" stroke="#ffaa00" />
    <path d="M15 9H10C8.9 9 8 9.9 8 11C8 12.1 8.9 13 10 13H14C15.1 13 16 13.9 16 15C16 16.1 15.1 17 14 17H9" stroke="#ffaa00" />
  </svg>
);

/**
 * Tactical Hype Flame
 */
export const HudFlame: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="currentColor" fillOpacity="0.2"/>
  </svg>
);

/**
 * Tactical Gamepad / Arcade
 */
export const HudGamepad: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <rect x="2" y="6" width="20" height="12" rx="4" />
    <line x1="6" y1="12" x2="10" y2="12" />
    <line x1="8" y1="10" x2="8" y2="14" />
    <circle cx="15" cy="13" r="1" fill="currentColor" />
    <circle cx="18" cy="11" r="1" fill="currentColor" />
  </svg>
);

/**
 * Tactical Trophy / Hall of Fame
 */
export const HudTrophy: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M6 9H3C2.4 9 2 8.6 2 8V5C2 4.4 2.4 4 3 4H6" />
    <path d="M18 9H21C21.6 9 22 8.6 22 8V5C22 4.4 21.6 4 21 4H18" />
    <path d="M6 4H18V10C18 13.3 15.3 16 12 16C8.7 16 6 13.3 6 10V4Z" fill="currentColor" fillOpacity="0.15"/>
    <path d="M12 16V19" />
    <path d="M8 21H16" />
  </svg>
);

/**
 * Premium Rockstar-Inspired Bold Gaming Icons Pack
 */

export const GamingFlame: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <path d="M12 2C10.5 4.5 9 6.8 9 9.5C9 10.8 9.5 12 10.3 12.8C9.4 11.7 9 10.3 9 8.8C7.2 10.6 6 13.2 6 16C6 19.3 8.7 22 12 22C15.3 22 18 19.3 18 16C18 11.5 14.5 7.5 12 2ZM12 20C10.3 20 9 18.7 9 17C9 15.3 10.2 13.8 11.5 13C11.2 13.9 11.3 14.9 11.8 15.6C12.3 16.3 13.1 16.7 14 16.7C14.6 16.7 15 16.4 15 16.4C14.8 18.4 13.6 20 12 20Z" />
  </svg>
);

export const GamingLightning: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <polygon points="13,2 4,13 11,13 9,22 20,10 13,10" />
  </svg>
);

export const GamingSkull: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <path d="M12 2C6.5 2 2 6.5 2 12C2 15.3 3.6 18.2 6 20V22H18V20C20.4 18.2 22 15.3 22 12C22 6.5 17.5 2 12 2ZM8 14C6.9 14 6 13.1 6 12C6 10.9 6.9 10 8 10C9.1 10 10 10.9 10 12C10 13.1 9.1 14 8 14ZM12 16L11 18H13L12 16ZM16 14C14.9 14 14 13.1 14 12C14 10.9 14.9 10 16 10C17.1 10 18 10.9 18 12C18 13.1 17.1 14 16 14Z" />
  </svg>
);

export const GamingCrown: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <polygon points="2,7 6,19 18,19 22,7 15,12 12,4 9,12" />
  </svg>
);

export const GamingDiamond: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <polygon points="6,3 18,3 22,9 12,22 2,9" />
  </svg>
);

export const GamingRocket: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

export const GamingTrophy: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <path d="M19 4h-2V3c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1v1H5c-1.1 0-2 .9-2 2v2c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.76 2.74 3.21 3.42V18H8c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1h-2.6v-1.64c1.45-.68 2.58-1.92 3.21-3.42C17.08 12.63 19 10.55 19 8V6c0-1.1-.9-2-2-2zM5 8V6h2v3.82C5.84 9.4 5 8.79 5 8zm14 0c0 .79-.84 1.4-2 1.82V6h2v2z" />
  </svg>
);

export const GamingMedal: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <circle cx="12" cy="14" r="7" />
    <polygon points="12,11 13.5,14 16.5,14.5 14.2,16.7 14.8,20 12,18.4 9.2,20 9.8,16.7 7.5,14.5 10.5,14" fill="#000" fillOpacity="0.3" />
    <polygon points="6,2 9,2 10,7 7,7" />
    <polygon points="18,2 15,2 14,7 17,7" />
    <polygon points="10,2 14,2 13,6 11,6" fillOpacity="0.6" />
  </svg>
);

export const GamingTarget: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <circle cx="12" cy="12" r="4" fill="currentColor" />
  </svg>
);

export const GamingChevron: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className} {...props}>
    <polyline points="7 15 12 10 17 15" />
    <polyline points="7 9 12 4 17 9" />
  </svg>
);

export const GamingEnergy: React.FC<GameIconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} className={className} {...props}>
    <path d="M7 4h10c.55 0 1 .45 1 1v14c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1zM9 2h6v2H9V2zm4 5l-4 6h3l-1 5 4-6h-3l1-5z" />
  </svg>
);
