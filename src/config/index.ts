/**
 * GameScope Live — Centralized Public Frontend Configuration
 */

export const config = {
  // Backend REST API Base URL
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, ''),

  // Socket.IO Realtime Gateway URL
  socketUrl: (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, ''),

  // Web Push VAPID Public Key for desktop push subscriptions
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BILYFQOGxZH2AL1jRHABY3nuiZYjzCdKUUjSVTSFI_biD8hvsaoPuC0aFrCkQlUu79fUyxsahNp-7loeCT8clbM',

  // Client Build Version
  clientVersion: '1.0.0'
};

export * from './assets';
