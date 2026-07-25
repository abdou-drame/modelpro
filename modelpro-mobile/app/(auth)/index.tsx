import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native'
import { router } from 'expo-router'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { colors, spacing, fontSize, radius } from '@/constants/theme'

const BG = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80'

export default function WelcomeScreen() {
  return (
    <ImageBackground source={{ uri: BG }} style={styles.container} resizeMode="cover">
      <LinearGradient
        colors={['rgba(26,26,46,0.35)', 'rgba(26,26,46,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <Text style={styles.logo}>ModèlePro</Text>
        <Text style={styles.tagline}>
          La couture artisanale,{'\n'}à portée de main
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Bouton client — solide */}
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(auth)/register-client')}
          activeOpacity={0.88}
        >
          <Text style={styles.btnPrimaryText}>Je cherche un artisan</Text>
        </TouchableOpacity>

        {/* Bouton artisan — glass */}
        <TouchableOpacity
          style={styles.btnGlass}
          onPress={() => router.push('/(auth)/register-artisan')}
          activeOpacity={0.85}
        >
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <View style={styles.btnGlassBorder} />
          <Text style={styles.btnGlassText}>Je suis artisan</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginLink}>
            Déjà un compte ?{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.xxl,
    paddingTop: 80,
    paddingBottom: 56,
  },
  header: { gap: spacing.lg },
  logo: {
    fontSize: fontSize.xxxl + 4,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -1.5,
  },
  tagline: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.white,
    lineHeight: 32,
  },
  actions: { gap: spacing.md },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: fontSize.base + 1,
    fontWeight: '700',
  },
  btnGlass: {
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    overflow: 'hidden',
  },
  btnGlassBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnGlassText: {
    color: colors.white,
    fontSize: fontSize.base + 1,
    fontWeight: '600',
    zIndex: 1,
  },
  loginLink: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
})
