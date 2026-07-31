/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F5F6FC',
        surface: '#FFFFFF',
        surface2: '#F1F2FA',
        border: '#EAEBF5',
        ink: '#171A2B',
        mist: '#8A8FA6',
        primary: '#5B4FE9',
        'primary-dark': '#4536D1',
        'primary-light': '#8B7FFF',
        lime: '#B9FF66',
        success: '#22C55E',
        warning: '#FF6B57',
        info: '#4EA8FF',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        xl2: '20px',
        xl3: '28px',
      },
      boxShadow: {
        soft: '0 8px 24px -8px rgba(23,22,73,0.10)',
        card: '0 4px 16px -4px rgba(23,22,73,0.08)',
        glow: '0 0 0 1px rgba(91,79,233,0.25), 0 8px 28px -6px rgba(91,79,233,0.35)',
        nav: '0 -4px 24px -8px rgba(23,22,73,0.12)',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #6C5FF0 0%, #4536D1 100%)',
        'lime-gradient': 'linear-gradient(135deg, #C6FF66 0%, #8FE64A 100%)',
        'auth-gradient': 'linear-gradient(160deg, #5B4FE9 0%, #8B7FFF 45%, #B9FF66 100%)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'sheet-up': 'sheet-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
