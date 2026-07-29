export const colors = {
  primary: '#C05A2B',       // Terracotta / Marron Chaud
  primaryLight: '#D87A4A',  // Light Terracotta
  primaryDark: '#9C431D',   // Deep Terracotta
  accent: '#1A1005',        // Dark Charcoal Text
  accentSoft: '#FAF8F5',    // Light Cream Background
  gold: '#B8860B',          // Warm Gold Accent
  goldLight: '#FEF3C7',     // Soft Gold Tint
  bg: '#FAF8F5',            // Fond d'écran crème très clair (#FAF8F5)
  bgCard: '#FFFFFF',        // Fond blanc pur pour les cartes (#FFFFFF)
  bgMuted: '#F4EFEA',       // Subtile crème/gris clair pour conteneurs
  bgWarm: '#EFE7DC',        // Fond chaud
  text: '#1A1005',          // Texte principal Sombre (#1A1005)
  textSub: '#7A6A58',       // Texte secondaire Marron/Gris (#7A6A58)
  textMuted: '#A89684',     // Texte discret (#A89684)
  success: '#2E7D32',       // Vert succès
  successLight: '#E8F5E9',  // Vert clair
  error: '#9E2A2B',         // Rouge bordeaux erreur (#9E2A2B)
  errorLight: '#FFF1F1',    // Rouge clair
  warning: '#C97A14',       // Ambre avertissement
  warningLight: '#FEF9C3',  // Ambre clair
  border: '#E8E2D9',        // Bordure subtile gris clair (#E8E2D9)
  borderLight: '#F0EADF',   // Bordure très douce
  white: '#FFFFFF',         // Blanc pur
  overlay: 'rgba(26, 16, 5, 0.45)',
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 16,
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
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 6,
  },
} as const
