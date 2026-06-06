export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          from: '#6366F1',
          to: '#8B5CF6',
          DEFAULT: '#6366F1',
        },
        sidebar: '#0F172A',
        'bg-base': '#F0F2FF',
        'accent-gold': '#F59E0B',
        'accent-cyan': '#06B6D4',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(99,102,241,0.08)',
        'glass-lg': '0 20px 40px rgba(99,102,241,0.14)',
        glow: '0 0 20px rgba(99,102,241,0.4)',
      },
      backdropBlur: {
        xl: '20px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.35s ease forwards',
      },
    },
  },
  plugins: [],
}
