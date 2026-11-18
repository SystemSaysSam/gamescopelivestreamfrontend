/**
 * GameScope Live — Centralized Public Frontend Configuration
 */

// Dynamically determine default backend URL:
// When accessed from localhost or 127.0.0.1, automatically target local backend (http://localhost:5000).
// When accessed from production domains (e.g. live.5tart.sbs), automatically target production backend (https://gamescopeserver.5tart.sbs).
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const resolvedApiUrl = isLocalhost 
  ? (import.meta.env.VITE_DEV_API_URL || 'http://localhost:5000')
  : (import.meta.env.VITE_API_URL || 'https://gamescopeserver.5tart.sbs');

const resolvedSocketUrl = isLocalhost 
  ? (import.meta.env.VITE_DEV_SOCKET_URL || 'http://localhost:5000')
  : (import.meta.env.VITE_SOCKET_URL || 'https://gamescopeserver.5tart.sbs');

export const config = {
  // Backend REST API Base URL
  apiUrl: resolvedApiUrl.replace(/\/+$/, ''),

  // Socket.IO Realtime Gateway URL
  socketUrl: resolvedSocketUrl.replace(/\/+$/, ''),

  // Web Push VAPID Public Key for desktop push subscriptions
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BILYFQOGxZH2AL1jRHABY3nuiZYjzCdKUUjSVTSFI_biD8hvsaoPuC0aFrCkQlUu79fUyxsahNp-7loeCT8clbM',

  // Client Build Version
  clientVersion: '1.0.0'
};

export * from './assets';
