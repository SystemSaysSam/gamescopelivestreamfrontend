/**
 * GameScope Live — Centralized Asset Configuration
 * 
 * Commonly reused static assets, branding artwork, posters, audio, and media.
 * Supports configurable VITE_ASSET_BASE_URL for future cloud/CDN migration
 * while preserving the exact current local paths by default.
 */

const BASE_URL = (import.meta.env.VITE_ASSET_BASE_URL || '').replace(/\/$/, '');

const getAssetUrl = (relativePath: string): string => {
  if (BASE_URL) {
    return `${BASE_URL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
  }
  return relativePath;
};

export const ASSETS = {
  branding: {
    favicon: getAssetUrl('/favicon.svg'),
    logoShieldIcon: 'hud-shield', // Handled via HudShield component
  },
  posters: {
    gta6Desktop: getAssetUrl('/assets/gta6poster.jpg'),
    gta6Mobile: getAssetUrl('/assets/gta6postermobile.jpg'),
  },
  video: {
    cityNeonLoop: getAssetUrl('/assets/CityNeonLoop.mp4'),
  },
  audio: {
    bgmLoadingScreen: getAssetUrl('/audio/loadingscreenbgm.mp3'),
    sfx: {
      buttonClick: getAssetUrl('/audio/sfx/button-click.wav'),
      buttonHover: getAssetUrl('/audio/sfx/button-hover.wav'),
      markerSelect: getAssetUrl('/audio/sfx/marker-select.wav'),
      navTransition: getAssetUrl('/audio/sfx/nav-transition.wav'),
      popupOpen: getAssetUrl('/audio/sfx/popup-open.wav'),
    }
  }
} as const;
