import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeIn, FadeInUp, FadeInDown } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { Scissors, ArrowRight, Star, Shield, Clock } from 'lucide-react-native'
import { colors, spacing, radius, fontSize, fontFamily, shadow } from '@/constants/theme'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function LandingScreen() {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.logoSection}>
            <View style={styles.logoMark}>
              <Scissors size={28} color={colors.accent} strokeWidth={1.5} />
            </View>
            <Text style={styles.logoText}>ModèlePro</Text>
            <Text style={styles.tagline}>L'artisanat d'exception</Text>
          </Animated.View>

          {/* Hero Image */}
          <Animated.View entering={FadeIn.delay(200).duration(800)} style={styles.heroImageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=85' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroImageOverlay} />
          </Animated.View>

          {/* Headline */}
          <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.headlineSection}>
            <Text style={styles.headline}>
              La haute couture{'\n'}sénégalaise
            </Text>
            <Text style={styles.subheadline}>
              Commandez vos créations sur-mesure auprès des meilleurs maîtres artisans du Sénégal
            </Text>
          </Animated.View>
        </View>

        {/* Trust Indicators */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Shield size={18} color={colors.accent} strokeWidth={1.5} />
            <Text style={styles.trustText}>Artisans vérifiés</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Star size={18} color={colors.accent} strokeWidth={1.5} />
            <Text style={styles.trustText}>4.9/5 avis</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustItem}>
            <Clock size={18} color={colors.accent} strokeWidth={1.5} />
            <Text style={styles.trustText}>Suivi temps réel</Text>
          </View>
        </Animated.View>

        {/* CTAs */}
        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/(auth)/register-client')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Commander une création</Text>
            <ArrowRight size={20} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/register-artisan')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Rejoindre comme artisan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.linkBtnText}>Déjà membre ? Se connecter</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(700).duration(400)} style={styles.footer}>
          <Text style={styles.footerText}>
            Couture · Coiffure · Cordonnerie · Bijouterie
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Hero
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.serif,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Hero Image
  heroImageContainer: {
    height: SCREEN_HEIGHT * 0.28,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xxl,
    ...shadow.lg,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 17, 12, 0.15)',
  },

  // Headline
  headlineSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  headline: {
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    color: colors.text,
    fontFamily: fontFamily.serif,
    textAlign: 'center',
    lineHeight: fontSize.xxxl * 1.15,
    letterSpacing: -1,
    marginBottom: spacing.md,
  },
  subheadline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.md * 1.6,
    paddingHorizontal: spacing.md,
  },

  // Trust
  trustSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  trustText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  trustDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },

  // CTAs
  ctaSection: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  primaryBtn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow.md,
  },
  primaryBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryBtn: {
    height: 56,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  linkBtnText: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    letterSpacing: 1,
  },
})
