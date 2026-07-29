export const colors = {
  primary: '#D4AF37',       // Metallic Gold
  primaryLight: '#FBBF24',  // Bright Gold
  primaryDark: '#B89222',   // Deep Antique Gold
  accent: '#D4AF37',        // Gold Accent
  accentSoft: '#242424',    // Dark Slate
  gold: '#D4AF37',          // Metallic Gold Accent
  goldLight: '#FFFBEB',     // Soft Gold Tint
  bg: '#0A0A0A',            // Deep Noir Black Background
  bgCard: '#141414',        // Luxury Dark Charcoal Cards
  bgMuted: '#1E1E1E',       // Soft Dark Muted Containers
  bgWarm: '#121212',        // Dark Warm Background
  text: '#FFFFFF',          // Pure White Primary Text
  textSub: '#E5E7EB',       // Soft Silver Secondary Text
  textMuted: '#9CA3AF',     // Muted Slate Text
  success: '#10B981',       // Emerald Green
  successLight: 'rgba(16, 185, 129, 0.15)',
  error: '#EF4444',         // Ruby Red
  errorLight: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',       // Amber
  warningLight: 'rgba(245, 158, 11, 0.15)',
  border: '#D4AF37',        // Metallic Gold Border
  borderLight: '#2D2D2D',   // Dark Border
  white: '#FFFFFF',         // Pure White
  overlay: 'rgba(0, 0, 0, 0.85)',
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
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 9,
  },
} as const
