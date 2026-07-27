/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf6f0',
          100: '#fae8d8',
          200: '#f4ccaa',
          300: '#eba875',
          400: '#e0843d',
          500: '#c9762b',
          600: '#8b3a0f',
          700: '#6e2e0b',
          800: '#58250a',
          900: '#3d1907',
        },
        surface: {
          DEFAULT: '#faf7f2',
          card:    '#ffffff',
          muted:   '#f0ebe3',
          border:  '#e8d9c8',
        },
        ink: {
          DEFAULT: '#1a1005',
          sub:     '#7a6a58',
          muted:   '#b0a090',
        },
        success: '#2d6a4f',
        warning: '#d97706',
        danger:  '#c1121f',
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px', DEFAULT: '6px', md: '8px',
        lg: '12px', xl: '16px', '2xl': '20px',
      },
      boxShadow: {
        card:   '0 1px 4px 0 rgba(139,58,15,0.06), 0 4px 16px 0 rgba(139,58,15,0.04)',
        lifted: '0 4px 24px 0 rgba(139,58,15,0.10), 0 1px 4px 0 rgba(139,58,15,0.06)',
        glow:   '0 0 0 3px rgba(201,118,43,0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer:   { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        shimmer:   'shimmer 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
