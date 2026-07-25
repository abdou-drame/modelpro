import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { router } from 'expo-router'

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>ModèlePro</Text>
        <Text style={styles.tagline}>
          La couture artisanale,{'\n'}à portée de main
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/(auth)/register-client')}
        >
          <Text style={styles.btnPrimaryText}>Je cherche un artisan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/(auth)/register-artisan')}
        >
          <Text style={styles.btnSecondaryText}>Je suis artisan</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginLink}>
            Déjà un compte ?{' '}
            <Text style={{ color: '#C9762B', fontWeight: '600' }}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'space-between',
    padding: 32,
    paddingTop: 80,
    paddingBottom: 56,
  },
  header: {
    gap: 16,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: '#C9762B',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '500',
    color: '#F7F4EF',
    lineHeight: 32,
  },
  actions: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#C9762B',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F7F4EF',
  },
  btnSecondaryText: {
    color: '#F7F4EF',
    fontSize: 17,
    fontWeight: '600',
  },
  loginLink: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 15,
    marginTop: 8,
  },
})
