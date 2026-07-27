import { ReactNode } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { colors, radius } from '@/constants/theme'

interface Props {
  children: ReactNode
  intensity?: number
  tint?: 'light' | 'dark' | 'default' | 'extraLight' | 'prominent' | 'systemUltraThinMaterial' | 'systemThinMaterial' | 'systemMaterial' | 'systemThickMaterial' | 'systemChromeMaterial'
  style?: ViewStyle
  borderColor?: string
}

export function GlassCard({
  children,
  intensity = 60,
  tint = 'light',
  style,
  borderColor = 'rgba(255,255,255,0.25)',
}: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={[styles.border, { borderColor }]} />
      {children}
    </View>
  )
}

// Variante sombre pour les overlays sur photos
export function GlassDark({
  children,
  intensity = 40,
  style,
}: Omit<Props, 'tint' | 'borderColor'>) {
  return (
    <View style={[styles.wrapper, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.border, { borderColor: 'rgba(255,255,255,0.12)' }]} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.xl,
    borderWidth: 1,
    pointerEvents: 'none',
  },
})
