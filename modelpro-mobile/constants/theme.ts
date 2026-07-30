import { Platform } from 'react-native'

// ══════════════════════════════════════════════════════════════════════════════
// ModèlePro Design System v3 — Luxury African Artisan Aesthetic
// Editorial elegance. Warm ivory + deep espresso + caramel gold.
// Inspired by high-end fashion magazines and luxury craft brands.
// ══════════════════════════════════════════════════════════════════════════════

export const colors = {
  // ── Core Brand ──
  primary: '#2D1810',           // Deep espresso brown — main brand
  primaryLight: '#4A3228',      // Lighter espresso
  primarySoft: '#F5E6D8',       // Soft primary bg (legacy compat)
  accent: '#D4A574',            // Warm caramel gold — luxury accent
  accentLight: '#E8C9A0',       // Light caramel
  accentDark: '#B8956A',        // Deep caramel

  // ── Backgrounds ──
  bg: '#F8F5F0',                // Warm ivory — main background
  bgCard: '#FFFFFF',            // Pure white cards
  bgElevated: '#FFFDFB',        // Slightly warm white
  bgMuted: '#F0EBE3',           // Muted warm gray
  bgDark: '#1A110C',            // Rich dark for contrast sections

  // ── Text ──
  text: '#1A110C',              // Near black with warmth
  textSecondary: '#5C4A42',     // Warm medium brown
  textSub: '#5C4A42',           // Alias for textSecondary (legacy compat)
  textMuted: '#8B7B73',         // Muted brown
  textLight: '#B5A79F',         // Light placeholder
  textInverse: '#F8F5F0',       // Light text on dark

  // ── Semantic ──
  success: '#2E6B4F',           // Deep forest green
  successBg: '#E8F3ED',
  successLight: '#A7D5B8',      // Light green (legacy compat)
  error: '#9B2C2C',             // Deep burgundy red
  errorBg: '#FDF2F2',
  errorLight: '#E8B4B4',        // Light error (legacy compat)
  warning: '#92610E',           // Deep amber
  warningBg: '#FEF8E7',
  warningLight: '#F5D98A',      // Light warning (legacy compat)

  // ── Borders ──
  border: '#E5DED6',            // Warm border
  borderLight: '#F0EBE3',       // Subtle border
  borderDark: '#D4CCC3',        // Emphasis border

  // ── Utilities ──
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(26, 17, 12, 0.7)',
  overlayLight: 'rgba(26, 17, 12, 0.4)',
  shimmer: '#E8E2DA',
  gold: '#D4A574',              // Alias for accent (legacy compat)
  bgWarm: '#F5E6D8',            // Warm bg (legacy compat)
  gradientDark: '#1A110C',      // Gradient dark end (legacy compat)
} as const

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
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
  base: 14,   // legacy compat
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  display: 42,
} as const

export const lineHeight = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
} as const

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
}

export const fontFamily = {
  serif: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  sans: Platform.OS === 'ios' ? 'System' : 'Roboto',
}

// Warm-tinted shadows for luxury feel
export const shadow = {
  xs: {
    shadowColor: '#2D1810',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#2D1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#2D1810',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2D1810',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: '#2D1810',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 12,
  },
  // Accent glow for CTAs
  glow: {
    shadowColor: '#D4A574',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
} as const
