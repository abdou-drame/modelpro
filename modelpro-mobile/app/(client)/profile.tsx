import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { router } from 'expo-router'
import { Phone, MapPin, LogOut, ChevronRight, ShoppingBag, Calendar, MessageCircle, Star, User, ShieldAlert } from 'lucide-react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'

const MENU_ITEMS = [
  { icon: ShoppingBag, label: 'Mes commandes', route: '/(client)/orders' },
  { icon: Calendar, label: 'Mes rendez-vous', route: '/(client)/appointments' },
  { icon: MessageCircle, label: 'Mes messages', route: '/(client)/messages' },
  { icon: ShieldAlert, label: 'Mes réclamations', route: '/(client)/claims' },
  { icon: Star, label: 'Mes avis', route: null },
]

export default function ClientProfileScreen() {
  const { user, clearAuth } = useAuthStore()

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Voulez-vous vous déconnecter ?')) return
      await clearAuth()
      router.replace('/(auth)/login')
      return
    }
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: async () => { await clearAuth(); router.replace('/(auth)/login') } },
    ])
  }

  const initials = user ? `${user.prenom[0]}${user.nom[0]}`.toUpperCase() : '?'

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.prenom} {user?.nom}</Text>
          <View style={styles.roleBadge}>
            <User size={12} color={colors.accent} strokeWidth={2} />
            <Text style={styles.roleText}>Client</Text>
          </View>
        </Animated.View>

        {/* Contact */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.card}>
          <View style={styles.infoRow}>
            <Phone size={16} color={colors.accent} strokeWidth={1.5} />
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{user?.telephone ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.accent} strokeWidth={1.5} />
            <Text style={styles.infoLabel}>Localisation</Text>
            <Text style={styles.infoValue}>Dakar</Text>
          </View>
        </Animated.View>

        {/* Menu */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.card}>
          {MENU_ITEMS.map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={() => item.route && router.push(item.route as any)}
                disabled={!item.route}
                activeOpacity={0.8}
              >
                <View style={styles.menuIcon}>
                  <item.icon size={18} color={colors.primary} strokeWidth={1.5} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <ChevronRight size={18} color={colors.textLight} strokeWidth={1.5} />
              </TouchableOpacity>
              {i < MENU_ITEMS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <LogOut size={18} color={colors.error} strokeWidth={1.5} />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </Animated.View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingTop: 60, paddingBottom: 100, gap: spacing.lg },

  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.md },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.white },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.accent}15`, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  roleText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.accent, textTransform: 'uppercase' },

  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  infoLabel: { flex: 1, fontSize: fontSize.sm, color: colors.textMuted },
  infoValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },

  menuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  menuIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.bgMuted, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: fontSize.md, fontWeight: '500', color: colors.text },

  divider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.errorBg, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.error },
  logoutText: { fontSize: fontSize.md, fontWeight: '600', color: colors.error },
})
