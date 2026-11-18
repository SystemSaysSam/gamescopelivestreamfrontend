/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'stream-wide': '1600px', // Exact breakpoint required: 14" laptops stack; >=1600px side-by-side
      },
      colors: {
        background: {
          DEFAULT: '#07080b',
          subtle: '#0c0e14',
          card: '#111520',
          elevated: '#171c2b',
        },
        neon: {
          green: '#00ff88',
          'green-glow': '#00ff8840',
          cyan: '#00f0ff',
          'cyan-glow': '#00f0ff40',
          pink: '#ff2a85',
          'pink-vice': '#F276B9',
          amber: '#ffaa00',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(0, 240, 255, 0.3)',
          'pink-glow': 'rgba(255, 42, 133, 0.25)',
        }
      },
      fontFamily: {
        gaming: ['"Rajdhani"', 'sans-serif'],
        display: ['"Orbitron"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
        'border-spin': 'borderSpin 4s linear infinite',
        'radar-sweep': 'radarSweep 3s linear infinite',
        'ambient-1': 'ambientMove1 18s ease-in-out infinite alternate',
        'ambient-2': 'ambientMove2 24s ease-in-out infinite alternate',
        'ambient-3': 'ambientMove3 20s ease-in-out infinite alternate',
      },
      keyframes: {
        ambientMove1: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(100px, 60px) scale(1.12)' },
          '100%': { transform: 'translate(-50px, 110px) scale(0.95)' },
        },
        ambientMove2: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-110px, -70px) scale(1.15)' },
          '100%': { transform: 'translate(70px, -50px) scale(0.92)' },
        },
        ambientMove3: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(-80px, 80px) scale(1.08)' },
          '100%': { transform: 'translate(90px, -60px) scale(1.02)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        borderSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
};
