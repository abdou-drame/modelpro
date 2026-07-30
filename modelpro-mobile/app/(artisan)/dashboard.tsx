import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import {
  TrendingUp, ShoppingBag, Star, ChevronRight, AlertCircle,
  BookOpen, CalendarDays, MessageCircle, Crown, User, Bell,
} from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { useAuthStore } from '@/lib/store/authStore'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'
import type { OrderStatus } from '@/constants/enums'

const AVATAR_FALLBACK = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'neutral', acceptee: 'primary', en_cours: 'primary',
  en_finition: 'warning', prete: 'success', livree: 'success', annulee: 'error',
}

function KpiCard({ stats }: { stats: { chiffreAffaires: number; commandesEnCours: number; noteGlobale: number } }) {
  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.kpiCard}>
      <View style={styles.kpiItem}>
        <View style={[styles.kpiIcon, { backgroundColor: `${colors.success}15` }]}>
          <TrendingUp size={18} color={colors.success} strokeWidth={1.5} />
        </View>
        <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{formatPrice(stats.chiffreAffaires ?? 0)}</Text>
        <Text style={styles.kpiLabel}>Chiffre d'affaires</Text>
      </View>

      <View style={styles.kpiDivider} />

      <View style={styles.kpiItem}>
        <View style={[styles.kpiIcon, { backgroundColor: `${colors.primary}15` }]}>
          <ShoppingBag size={18} color={colors.primary} strokeWidth={1.5} />
        </View>
        <Text style={styles.kpiValue}>{stats.commandesEnCours ?? 0}</Text>
        <Text style={styles.kpiLabel}>En cours</Text>
      </View>

      <View style={styles.kpiDivider} />

      <TouchableOpacity style={styles.kpiItem} onPress={() => router.push('/(artisan)/reviews')}>
        <View style={[styles.kpiIcon, { backgroundColor: `${colors.accent}15` }]}>
          <Star size={18} color={colors.accent} strokeWidth={1.5} />
        </View>
        <Text style={styles.kpiValue}>{(stats.noteGlobale ?? 0).toFixed(1)}</Text>
        <Text style={styles.kpiLabel}>Note</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const QUICK_ACTIONS = [
  { label: 'Commandes', icon: ShoppingBag, route: '/(artisan)/orders', color: colors.primary, bg: colors.bgMuted },
  { label: 'Catalogue', icon: BookOpen, route: '/(artisan)/catalogue', color: colors.success, bg: '#D1FAE520' },
  { label: 'RDV', icon: CalendarDays, route: '/(artisan)/appointments', color: '#7C3AED', bg: '#EDE9FE20' },
  { label: 'Messages', icon: MessageCircle, route: '/(artisan)/messages', color: '#0284C7', bg: '#E0F2FE20' },
  { label: 'Abo', icon: Crown, route: '/(artisan)/subscription', color: colors.accent, bg: `${colors.accent}15` },
  { label: 'Profil', icon: User, route: '/(artisan)/profile', color: colors.textMuted, bg: colors.bgMuted },
]

function QuickActions() {
  return (
    <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.section}>
      <Text style={styles.sectionTitle}>Accès rapide</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionsScroll}>
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <TouchableOpacity key={a.route} style={styles.actionTile} onPress={() => router.push(a.route as any)} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                <Icon size={20} color={a.color} strokeWidth={1.5} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </Animated.View>
  )
}

export default function ArtisanDashboard() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['artisan-stats'],
    queryFn: () => artisanApi.stats().then((r) => r.data),
    refetchInterval: 10000,
  })

  const { data: profile } = useQuery({
    queryKey: ['artisan-profile'],
    queryFn: () => artisanApi.getProfile().then((r) => r.data),
  })

  const { data: orders } = useQuery({
    queryKey: ['artisan-orders'],
    queryFn: () => artisanApi.orders().then((r) => r.data),
    refetchInterval: 10000,
  })

  const activeOrders = orders?.filter((o) => !['livree', 'annulee'].includes(o.statut)).slice(0, 3) ?? []
  const pendingOrders = orders?.filter((o) => o.statut === 'en_attente') ?? []
  const prenom = user?.prenom ?? 'Artisan'

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topBar}>
            <View style={styles.avatarRow}>
              <Image source={{ uri: profile?.photoProfil ?? AVATAR_FALLBACK }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Bonjour {prenom}</Text>
                {profile?.atelier && <Text style={styles.atelier} numberOfLines={1}>{profile.atelier}</Text>}
                {profile && (
                  <View style={styles.metaRow}>
                    <StarRating value={profile.noteMoyenne ?? 0} size={12} />
                    <Text style={styles.metaText}>{(profile.noteMoyenne ?? 0).toFixed(1)}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/(artisan)/notifications')}>
              <Bell size={22} color={colors.text} strokeWidth={1.5} />
              {pendingOrders.length > 0 && <View style={styles.bellDot} />}
            </TouchableOpacity>
          </View>

          {/* Alert */}
          {pendingOrders.length > 0 && (
            <Animated.View entering={FadeInDown.delay(50).duration(300)}>
              <TouchableOpacity style={styles.alertBanner} onPress={() => router.push('/(artisan)/orders')} activeOpacity={0.85}>
                <AlertCircle size={16} color={colors.warning} strokeWidth={2} />
                <Text style={styles.alertText}>{pendingOrders.length} commande{pendingOrders.length > 1 ? 's' : ''} en attente</Text>
                <ChevronRight size={16} color={colors.textMuted} strokeWidth={2} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {/* KPI */}
        {stats && <KpiCard stats={stats} />}

        {/* Quick Actions */}
        <QuickActions />

        {/* Active Orders */}
        {activeOrders.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Commandes actives</Text>
              <TouchableOpacity onPress={() => router.push('/(artisan)/orders')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: spacing.sm }}>
              {activeOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => router.push(`/(artisan)/orders/${order.id}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderClient} numberOfLines={1}>{order.client.prenom} {order.client.nom}</Text>
                    {order.creation && <Text style={styles.orderModel} numberOfLines={1}>{order.creation.titre}</Text>}
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
                    {order.prixTotal != null && <Text style={styles.orderPrice}>{formatPrice(order.prixTotal)}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },

  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.md },
  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  avatar: { width: 52, height: 52, borderRadius: radius.full, backgroundColor: colors.bgMuted, borderWidth: 2, borderColor: colors.border },
  greeting: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  atelier: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  bellBtn: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  bellDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningBg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning },
  alertText: { flex: 1, fontSize: fontSize.sm, fontWeight: '500', color: colors.text },

  kpiCard: { flexDirection: 'row', backgroundColor: colors.bgCard, marginHorizontal: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  kpiItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
  kpiIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  kpiValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  kpiLabel: { fontSize: fontSize.xs, color: colors.textMuted },
  kpiDivider: { width: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },

  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  seeAll: { fontSize: fontSize.sm, color: colors.accent, fontWeight: '600' },

  actionsScroll: { gap: spacing.md },
  actionTile: { alignItems: 'center', gap: spacing.xs },
  actionIcon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.xs, fontWeight: '500', color: colors.textMuted },

  orderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  orderLeft: { flex: 1, gap: 2, marginRight: spacing.md },
  orderClient: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  orderModel: { fontSize: fontSize.sm, color: colors.textMuted, fontStyle: 'italic' },
  orderDate: { fontSize: fontSize.xs, color: colors.textLight },
  orderRight: { alignItems: 'flex-end', gap: spacing.xs },
  orderPrice: { fontSize: fontSize.sm, fontWeight: '600', color: colors.accent },
})
