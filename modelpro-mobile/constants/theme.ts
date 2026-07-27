export const colors = {
  primary: '#8B3A0F',
  primaryLight: '#B85C2A',
  primaryDark: '#6B2A08',
  accent: '#1A1005',
  accentSoft: '#2D1F0F',
  bg: '#FAF7F2',
  bgCard: '#FFFFFF',
  bgMuted: '#F2EDE4',
  bgWarm: '#EDE0D0',
  text: '#1A1005',
  textSub: '#7A6A58',
  textMuted: '#B0A090',
  success: '#2D6A4F',
  successLight: '#D1FAE5',
  error: '#C1121F',
  errorLight: '#FEE2E2',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  border: '#E8D9C8',
  borderLight: '#EDE0D0',
  white: '#FFFFFF',
  overlay: 'rgba(26, 16, 5, 0.5)',
} as const

export const radius = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 14,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 7,
  },
} as const
