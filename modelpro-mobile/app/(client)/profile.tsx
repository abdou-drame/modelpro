import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { router } from 'expo-router'
import { Phone, MapPin, LogOut, ChevronRight, ShoppingBag, Calendar, MessageCircle, Star } from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

export default function ClientProfileScreen() {
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Voulez-vous vous déconnecter ?')) return
      await clearAuth()
      router.replace('/(auth)/login')
      return
    }
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            await clearAuth()
            router.replace('/(auth)/login')
          },
        },
      ]
    )
  }

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '?'

  const menuItems = [
    { icon: ShoppingBag, label: 'Mes commandes', onPress: () => router.push('/(client)/orders') },
    { icon: Calendar, label: 'Mes rendez-vous', onPress: () => router.push('/(client)/appointments') },
    { icon: MessageCircle, label: 'Mes messages', onPress: () => router.push('/(client)/messages') },
    { icon: Star, label: 'Mes avis', onPress: () => {} },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View entering={FadeInUp.delay(0).springify()} style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.prenom} {user?.nom}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Client</Text>
        </View>
      </Animated.View>

      {/* Info card */}
      <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.card}>
        <View style={styles.infoRow}>
          <Phone size={16} color={colors.primary} strokeWidth={1.8} />
          <Text style={styles.infoText}>{user?.telephone ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <MapPin size={16} color={colors.primary} strokeWidth={1.8} />
          <Text style={styles.infoText}>Dakar, Sénégal</Text>
        </View>
      </Animated.View>

      {/* Menu */}
      <Animated.View entering={FadeInUp.delay(180).springify()} style={styles.card}>
        {menuItems.map((item, i) => (
          <View key={item.label}>
            <TouchableOpacity style={styles.menuRow} onPress={item.onPress} accessibilityRole="button">
              <View style={styles.menuLeft}>
                <item.icon size={18} color={colors.text} strokeWidth={1.8} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.8} />
            </TouchableOpacity>
            {i < menuItems.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Animated.View>

      {/* Logout */}
      <Animated.View entering={FadeInUp.delay(260).springify()}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} accessibilityRole="button">
          <LogOut size={18} color={colors.error} strokeWidth={1.8} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 60, paddingBottom: 100, gap: spacing.lg },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: colors.white },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  roleBadge: {
    backgroundColor: colors.primaryLight + '22',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.sm,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  infoText: { fontSize: fontSize.base, color: colors.text },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuLabel: { fontSize: fontSize.base, color: colors.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  logoutText: { fontSize: fontSize.base, fontWeight: '600', color: colors.error },
})
