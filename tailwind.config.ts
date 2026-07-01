import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Glacier core surfaces
        glacier: {
          base:           '#0C111B',
          panel:          '#161D2B',
          elevated:       '#1B2436',
          border:         'rgba(255,255,255,0.08)',
          'border-strong':'rgba(255,255,255,0.14)',
        },
        // Glacier text
        'gl-text':      '#F4F6FA',
        'gl-secondary': '#9AA4B8',
        'gl-faint':     '#6B7588',
        // Glacier accent
        'gl-cyan':      '#3FC6F0',
        'gl-cyan-soft': 'rgba(63,198,240,0.14)',
        'gl-on-cyan':   '#04212E',
        // Status — Glacier variants
        healthy: {
          DEFAULT:       '#36D399',
          soft:          'rgba(54,211,153,0.14)',
          card:          'rgba(54,211,153,0.14)',
          badge:         'rgba(54,211,153,0.14)',
          'badge-text':  '#36D399',
        },
        watch: {
          DEFAULT:       '#F0A93F',
          soft:          'rgba(240,169,63,0.14)',
          card:          'rgba(240,169,63,0.14)',
          badge:         'rgba(240,169,63,0.14)',
          'badge-text':  '#F0A93F',
        },
        critical: {
          DEFAULT:       '#F0596B',
          soft:          'rgba(240,89,107,0.14)',
          card:          'rgba(240,89,107,0.14)',
          badge:         'rgba(240,89,107,0.14)',
          'badge-text':  '#F0596B',
        },
        // AI card
        ai: {
          bg:   'rgba(63,198,240,0.14)',
          text: '#3FC6F0',
          icon: '#3FC6F0',
        },
        // Legacy aliases — keep so nothing breaks during transition
        brand: {
          action:         '#3FC6F0',
          'action-shadow':'rgba(63,198,240,0.25)',
        },
        bg: {
          base:   '#0C111B',
          card:   '#161D2B',
          header: '#0C111B',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          track:   'rgba(255,255,255,0.06)',
        },
        text: {
          primary:   '#F4F6FA',
          'on-dark': '#F4F6FA',
          secondary: '#9AA4B8',
          muted:     'rgba(255,255,255,0.36)',
          inactive:  '#6B7588',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
