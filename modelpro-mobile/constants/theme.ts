export const colors = {
  primary: '#D4AF37',       // Metallic Gold
  primaryLight: '#FBBF24',  // Bright Gold
  primaryDark: '#B89222',   // Deep Antique Gold
  accent: '#0D0D0D',        // Noir Onyx
  accentSoft: '#1A1A1A',    // Soft Black
  gold: '#D4AF37',          // Metallic Gold Accent
  goldLight: '#FFFBEB',     // Soft Gold Tint
  bg: '#FAFAFA',            // Pure Clean White Background
  bgCard: '#FFFFFF',        // Crisp White Cards
  bgMuted: '#F4F4F5',       // Subtle Muted Gray
  bgWarm: '#0D0D0D',        // Deep Black Container
  text: '#0D0D0D',          // Pure Black Text
  textSub: '#4B5563',       // Dark Charcoal Subtext
  textMuted: '#9CA3AF',     // Muted Slate Text
  success: '#10B981',       // Emerald Green
  successLight: '#D1FAE5',  // Soft Green
  error: '#EF4444',         // Ruby Red
  errorLight: '#FEE2E2',    // Soft Red
  warning: '#F59E0B',       // Amber
  warningLight: '#FEF3C7',   // Soft Amber
  border: '#D4AF37',        // Metallic Gold Border
  borderLight: '#E5E7EB',   // Subtle White/Gray Border
  white: '#FFFFFF',         // Pure White
  overlay: 'rgba(13, 13, 13, 0.75)',
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
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0D0D0D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 8,
  },
} as const
