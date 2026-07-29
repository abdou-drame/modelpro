export const colors = {
  primary: '#8B3A0F',
  primaryLight: '#C06634',
  primaryDark: '#5C2307',
  accent: '#120B05',
  accentSoft: '#24150A',
  gold: '#D4AF37',
  goldLight: '#FEF3C7',
  bg: '#FAF8F5',
  bgCard: '#FFFFFF',
  bgMuted: '#F4EFE6',
  bgWarm: '#EBDDCB',
  text: '#120B05',
  textSub: '#6E5D4C',
  textMuted: '#A89684',
  success: '#1B4D3E',
  successLight: '#D1FAE5',
  error: '#B91C1C',
  errorLight: '#FEE2E2',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  border: '#E6D7C3',
  borderLight: '#F0E5D8',
  white: '#FFFFFF',
  overlay: 'rgba(18, 11, 5, 0.55)',
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 999,
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
} as const

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
}

export const shadow = {
  sm: {
    shadowColor: '#8B3A0F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#120B05',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#120B05',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 8,
  },
} as const
