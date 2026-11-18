# gamescopelivestreamfrontend

Production public livestream frontend for **GameScope Live** — built with React 18, Vite, TypeScript, TailwindCSS, GSAP, and Socket.IO.

---

## Overview

- **Interactive Livestream Viewer**: Responsive YouTube stream viewport with dynamic active/inactive screen overlays.
- **Realtime Community Chat**: Integrated GameScope chat with GTA-inspired identity assignment, message reactions, admin pinned comments, and user timeout enforcement.
- **YouTube Live Chat Fallback**: Visual fallback for active YouTube livestreams with adaptive audience capacity management.
- **Live Polling**: Dual-source polling engine supporting both GameScope admin polls and YouTube live polls.
- **Arcade Runner**: Built-in 2D runner minigame with client physics simulation and server-validated anti-cheat leaderboard.
- **Web Push Notifications**: Service worker integration for VAPID push notifications (event transitions, reminder countdowns, and operational broadcasts).

---

## Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your endpoints:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBKr3qBUYIHBQFLXYp5Nksh8U
```

---

## Development & Build

```bash
# Install dependencies
npm install

# Start local Vite development server (port 5174)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```
