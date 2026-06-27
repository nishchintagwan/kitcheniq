import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          action: '#7C3AED',
          'action-shadow': 'rgba(124,58,237,0.3)',
        },
        bg: {
          base: '#FFFAF5',
          card: '#FFFFFF',
          header: '#0D0A14',
        },
        border: {
          DEFAULT: '#EDE8F5',
          track: '#F5F0FA',
        },
        text: {
          primary: '#1A1A1A',
          'on-dark': '#FFFFFF',
          secondary: '#888888',
          muted: 'rgba(255,255,255,0.36)',
          inactive: '#BBBBBB',
        },
        healthy: {
          DEFAULT: '#00DC82',
          card: '#003D20',
          badge: '#F0FBF5',
          'badge-text': '#00A36C',
        },
        watch: {
          DEFAULT: '#FBB924',
          card: '#3D2000',
          badge: '#FFF8EC',
          'badge-text': '#F59E0B',
        },
        critical: {
          DEFAULT: '#FF505F',
          card: '#3D0008',
          badge: '#FFF5F6',
          'badge-text': '#FF505F',
        },
        ai: {
          bg: '#F5F0FA',
          text: '#5B21B6',
          icon: '#7C3AED',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
