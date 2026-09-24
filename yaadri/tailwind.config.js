/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(--c-${v}) / <alpha-value>)`
export default {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { bg: c('bg'), bg2: c('bg2'), surface: c('surface'), ink: c('ink'), dim: c('dim'), glow: c('glow'), orchid: c('orchid'), tea: c('tea'), danger: c('danger'), onglow: c('onglow') },
      fontFamily: {
        display: ['"Baloo 2"', '"Noto Sans Devanagari"', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
        body: ['"Atkinson Hyperlegible"', '"Noto Sans Devanagari"', '"Noto Sans Bengali"', 'system-ui', 'sans-serif'],
      },
      boxShadow: { lantern: '0 0 0 1px rgb(var(--c-glow) / .35), 0 8px 40px -8px rgb(var(--c-glow) / .45)' },
      keyframes: {
        sway: { '0%,100%': { transform: 'rotate(-1.6deg)' }, '50%': { transform: 'rotate(1.6deg)' } },
        drift: { '0%,100%': { transform: 'translateX(-2%)' }, '50%': { transform: 'translateX(2%)' } },
        pulseRing: { '0%': { transform: 'scale(.9)', opacity: '.55' }, '100%': { transform: 'scale(1.5)', opacity: '0' } },
        dot: { '0%,80%,100%': { transform: 'translateY(0)', opacity: '.4' }, '40%': { transform: 'translateY(-6px)', opacity: '1' } },
        flutter: { '0%,100%': { transform: 'rotate(0deg)' }, '50%': { transform: 'rotate(14deg)' } },
      },
      animation: {
        sway: 'sway 7s ease-in-out infinite',
        drift: 'drift 14s ease-in-out infinite',
        pulseRing: 'pulseRing 1.8s ease-out infinite',
        dot: 'dot 1.1s ease-in-out infinite',
        flutter: 'flutter .5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
