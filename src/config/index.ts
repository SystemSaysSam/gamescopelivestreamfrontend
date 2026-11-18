/**
 * GameScope Live — Centralized Public Frontend Configuration
 */

// Dynamically determine default backend URL: localhost for local dev, gamescopeserver.5tart.sbs for production
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const defaultBackendUrl = isLocalhost 
  ? 'http://localhost:5000' 
  : 'https://gamescopeserver.5tart.sbs';

export const config = {
  // Backend REST API Base URL
  apiUrl: (import.meta.env.VITE_API_URL || defaultBackendUrl).replace(/\/+$/, ''),

  // Socket.IO Realtime Gateway URL
  socketUrl: (import.meta.env.VITE_SOCKET_URL || defaultBackendUrl).replace(/\/+$/, ''),

  // Web Push VAPID Public Key for desktop push subscriptions
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BILYFQOGxZH2AL1jRHABY3nuiZYjzCdKUUjSVTSFI_biD8hvsaoPuC0aFrCkQlUu79fUyxsahNp-7loeCT8clbM',

  // Client Build Version
  clientVersion: '1.0.0'
};

export * from './assets';
