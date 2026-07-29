import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native'
import { router } from 'expo-router'
import { Phone, MapPin, LogOut, ChevronRight, ShoppingBag, Calendar, MessageCircle, Star, User, ShieldAlert } from 'lucide-react-native'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { useAuthStore } from '@/lib/store/authStore'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const MENU_SECTIONS = [
  {
    items: [
      { icon: ShoppingBag, label: 'Mes commandes', sub: 'Suivi et historique', onPress: () => router.push('/(client)/orders') },
      { icon: Calendar, label: 'Mes rendez-vous', sub: 'RDV chez l\'artisan', onPress: () => router.push('/(client)/appointments') },
    ],
  },
  {
    items: [
      { icon: MessageCircle, label: 'Mes messages', sub: 'Conversations', onPress: () => router.push('/(client)/messages') },
      { icon: ShieldAlert, label: 'Mes réclamations', sub: 'Suivi et litiges', onPress: () => router.push('/(client)/claims') },
      { icon: Star, label: 'Mes avis', sub: 'Notes et commentaires', onPress: () => {} },
    ],
  },
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{user?.prenom} {user?.nom}</Text>
          <View style={styles.rolePill}>
            <User size={10} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.roleText}>Client</Text>
          </View>
        </View>
      </Animated.View>

      {/* Contact info */}
      <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Phone size={14} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.infoLabel}>Téléphone</Text>
          <Text style={styles.infoValue}>{user?.telephone ?? '—'}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <MapPin size={14} color={colors.primary} strokeWidth={2} />
          </View>
          <Text style={styles.infoLabel}>Localisation</Text>
          <Text style={styles.infoValue}>Dakar, Sénégal</Text>
        </View>
      </Animated.View>

      {/* Navigation sections */}
      {MENU_SECTIONS.map((section, si) => (
        <Animated.View
          key={si}
          entering={FadeInUp.delay(140 + si * 60).springify()}
          style={styles.menuCard}
        >
          {section.items.map((item, ii) => (
            <View key={item.label}>
              <TouchableOpacity
                style={styles.menuRow}
                onPress={item.onPress}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <View style={styles.menuIconWrap}>
                  <item.icon size={16} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.menuTextBlock}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
              {ii < section.items.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </Animated.View>
      ))}

      {/* Logout */}
      <Animated.View entering={FadeInUp.delay(280).springify()}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
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

  header: { alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  avatarWrap: { position: 'relative', width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },
  avatarRing: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 2, borderColor: `${colors.primary}28`,
  },
  avatarText: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.white },
  headerText: { alignItems: 'center', gap: spacing.xs },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${colors.primary}14`,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  roleText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase' },

  infoCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingVertical: spacing.xs,
    ...shadow.sm,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm,
  },
  infoIcon: {
    width: 30, height: 30, borderRadius: radius.lg,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted, flex: 1 },
  infoValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  infoDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg },

  menuCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    paddingVertical: spacing.xs,
    ...shadow.sm,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    gap: spacing.md, minHeight: 56,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: radius.lg,
    backgroundColor: `${colors.primary}10`,
    alignItems: 'center', justifyContent: 'center',
  },
  menuTextBlock: { flex: 1, gap: 2 },
  menuLabel: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  menuSub: { fontSize: fontSize.xs, color: colors.textMuted },
  menuDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.errorLight,
    borderRadius: radius.xl, paddingVertical: spacing.md, minHeight: 52,
  },
  logoutText: { fontSize: fontSize.base, fontWeight: '600', color: colors.error },
})
