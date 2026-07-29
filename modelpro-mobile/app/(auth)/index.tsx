import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { router } from 'expo-router'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { Crown, User, Scissors } from 'lucide-react-native'

export default function WelcomeScreen() {
  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInUp.duration(500)} style={styles.container}>
        
        {/* Header Logo */}
        <View style={styles.headerLogoRow}>
          <View style={styles.logoBox}>
            <Crown size={24} color="#C05A2B" strokeWidth={2} />
          </View>
          <Text style={styles.brandTitle}>ModèlePro</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.surtitre}>BIENVENUE</Text>
          <Text style={styles.mainTitle}>La haute couture{'\n'}sur-mesure</Text>
          <Text style={styles.subtitle}>
            Connectez-vous directement avec les meilleurs maîtres tailleurs du Sénégal ou développez votre atelier.
          </Text>
        </View>

        {/* Actions Choice */}
        <View style={styles.actions}>
          {/* Bouton Client */}
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/(auth)/register-client')}
            activeOpacity={0.88}
          >
            <User size={18} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.btnPrimaryText}>Je cherche un artisan</Text>
          </TouchableOpacity>

          {/* Bouton Artisan */}
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push('/(auth)/register-artisan')}
            activeOpacity={0.85}
          >
            <Scissors size={18} color="#1A1005" strokeWidth={2} />
            <Text style={styles.btnSecondaryText}>Je suis un artisan</Text>
          </TouchableOpacity>

          {/* Lien Se connecter */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLinkBold}>Se connecter</Text>
            </TouchableOpacity>
          </View>
        </View>

      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  container: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 40,
  },
  logoBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1005',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  heroSection: {
    marginBottom: 40,
  },
  surtitre: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C05A2B',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1005',
    letterSpacing: -0.8,
    lineHeight: 44,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#7A6A58',
    lineHeight: 22,
  },
  actions: {
    gap: 16,
  },
  btnPrimary: {
    height: 54,
    backgroundColor: '#C05A2B',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#C05A2B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSecondary: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E2D9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1005',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loginText: {
    fontSize: 14,
    color: '#7A6A58',
  },
  loginLinkBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1005',
  },
})
