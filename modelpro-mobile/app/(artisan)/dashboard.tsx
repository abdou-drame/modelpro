import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  TrendingUp, ShoppingBag, Star, ChevronRight, AlertCircle,
  BookOpen, CalendarDays, MessageCircle, Crown, User,
} from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { useAuthStore } from '@/lib/store/authStore'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { OrderStatus } from '@/constants/enums'

const AVATAR_FALLBACK = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80'
const HERO_IMAGE = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'neutral', acceptee: 'primary', en_cours: 'primary',
  en_finition: 'warning', prete: 'success', livree: 'success', annulee: 'error',
}

// ── Editorial KPI card ────────────────────────────────────────────────────────
// CA dominant (60% width) + 2 secondary stacked on right

function KpiCard({ stats }: {
  stats: { chiffreAffaires: number; commandesEnCours: number; noteGlobale: number }
}) {
  return (
    <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.kpiCard}>

      {/* Primary — CA */}
      <View style={styles.kpiPrimary}>
        <View style={[styles.kpiIconDot, { backgroundColor: `${colors.success}18` }]}>
          <TrendingUp size={14} color={colors.success} strokeWidth={2} />
        </View>
        <Text style={styles.kpiPrimaryLabel}>Chiffre d'affaires</Text>
        <Text
          style={styles.kpiPrimaryValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {formatPrice(stats.chiffreAffaires ?? 0)}
        </Text>
        <Text style={styles.kpiPrimarySub}>Total cumulé</Text>
      </View>

      <View style={styles.kpiDividerV} />

      {/* Secondary stack */}
      <View style={styles.kpiSecondaryStack}>
        <View style={styles.kpiSecondaryItem}>
          <View style={[styles.kpiIconDot, { backgroundColor: `${colors.primary}18` }]}>
            <ShoppingBag size={12} color={colors.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.kpiSecValue} numberOfLines={1}>
              {stats.commandesEnCours ?? 0}
            </Text>
            <Text style={styles.kpiSecLabel}>En cours</Text>
          </View>
        </View>

        <View style={styles.kpiDividerH} />

        <TouchableOpacity
          style={styles.kpiSecondaryItem}
          onPress={() => router.push('/(artisan)/reviews')}
          accessibilityRole="button"
          accessibilityLabel="Consulter mes avis clients"
        >
          <View style={[styles.kpiIconDot, { backgroundColor: '#F59E0B18' }]}>
            <Star size={12} color="#F59E0B" strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.kpiSecValue} numberOfLines={1}>
              {(stats.noteGlobale ?? 0).toFixed(1)}
            </Text>
            <Text style={styles.kpiSecLabel}>Avis</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

// ── Quick actions — horizontal scroll ─────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Commandes',   icon: ShoppingBag,  route: '/(artisan)/orders',        color: colors.primary, bg: '#F5E6D8' },
  { label: 'Catalogue',   icon: BookOpen,     route: '/(artisan)/catalogue',     color: colors.success, bg: '#D1FAE5' },
  { label: 'Rendez-vous', icon: CalendarDays, route: '/(artisan)/appointments',  color: '#7C3AED',      bg: '#EDE9FE' },
  { label: 'Messages',    icon: MessageCircle,route: '/(artisan)/messages',      color: '#0284C7',      bg: '#E0F2FE' },
  { label: 'Abonnement',  icon: Crown,        route: '/(artisan)/subscription',  color: '#D97706',      bg: '#FEF3C7' },
  { label: 'Profil',      icon: User,         route: '/(artisan)/profile',       color: colors.textSub, bg: colors.bgMuted },
]

function QuickActions() {
  return (
    <Animated.View entering={FadeInUp.delay(340).springify()} style={styles.section}>
      <Text style={styles.sectionTitle}>Accès rapide</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsScroll}
      >
        {QUICK_ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <TouchableOpacity
              key={a.route}
              style={[styles.actionTile, { backgroundColor: a.bg }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <Icon size={24} color={a.color} strokeWidth={1.8} />
              <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </Animated.View>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

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

  const activeOrders = orders?.filter((o) =>
    !['livree', 'annulee'].includes(o.statut)
  ).slice(0, 3) ?? []

  const pendingOrders = orders?.filter((o) => o.statut === 'en_attente') ?? []

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <Image source={{ uri: HERO_IMAGE }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
        {/* Two-stop gradient: subtle top, heavy bottom */}
        <LinearGradient
          colors={['rgba(26,16,5,0.08)', 'rgba(26,16,5,0.78)']}
          locations={[0.2, 1]}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.heroContent}>
          <View style={styles.heroRow}>
            <Image
              source={{ uri: profile?.photoProfil ?? AVATAR_FALLBACK }}
              style={styles.heroAvatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>Bonjour,</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.prenom} {user?.nom}
              </Text>
              {/* Atelier as differentiation anchor — editorial subtitle */}
              {profile?.atelier && (
                <Text style={styles.heroAtelier} numberOfLines={1}>
                  {profile.atelier}
                </Text>
              )}
              {profile && (
                <View style={styles.heroMeta}>
                  <StarRating value={profile.noteMoyenne ?? 0} size={11} />
                  <Text style={styles.heroMetaText}>{(profile.noteMoyenne ?? 0).toFixed(1)}</Text>
                  {profile.localisation ? (
                    <>
                      <Text style={styles.heroDot}>·</Text>
                      <Text style={styles.heroMetaText} numberOfLines={1}>{profile.localisation}</Text>
                    </>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* Pending alert pill */}
          {pendingOrders.length > 0 && (
            <TouchableOpacity
              style={styles.alertPill}
              onPress={() => router.push('/(artisan)/orders')}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`${pendingOrders.length} commandes en attente`}
            >
              <AlertCircle size={14} color={colors.warning} strokeWidth={2.2} />
              <Text style={styles.alertPillText}>
                {pendingOrders.length} commande{pendingOrders.length > 1 ? 's' : ''} en attente
              </Text>
              <ChevronRight size={13} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      {/* ── Editorial KPI card ── floats over hero seam ─────────────────────── */}
      <View style={styles.kpiWrapper}>
        {stats ? (
          <KpiCard stats={stats} />
        ) : (
          <View style={[styles.kpiCard, { height: 100 }]} />
        )}
      </View>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <View style={styles.body}>

        <QuickActions />

        {/* Active orders */}
        {activeOrders.length > 0 && (
          <Animated.View entering={FadeInUp.delay(420).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Commandes actives</Text>
              <TouchableOpacity
                onPress={() => router.push('/(artisan)/orders')}
                accessibilityRole="link"
              >
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: spacing.sm }}>
              {activeOrders.map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => router.push(`/(artisan)/orders/${order.id}`)}
                  activeOpacity={0.88}
                  accessibilityRole="button"
                  accessibilityLabel={`Commande de ${order.client.prenom} ${order.client.nom}`}
                >
                  <View style={styles.orderCardLeft}>
                    <Text style={styles.orderClient} numberOfLines={1}>
                      {order.client.prenom} {order.client.nom}
                    </Text>
                    {order.creation && (
                      <Text style={styles.orderModel} numberOfLines={1}>{order.creation.titre}</Text>
                    )}
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={styles.orderCardRight}>
                    <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
                    {order.prixTotal != null && (
                      <Text style={styles.orderPrice}>{formatPrice(order.prixTotal)}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 80 }} />
      </View>
    </ScrollView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Hero
  hero: { height: 260, justifyContent: 'flex-end', overflow: 'hidden' },
  heroContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroAvatar: {
    width: 50, height: 50, borderRadius: radius.full, marginTop: 2,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.32)',
    backgroundColor: colors.bgMuted,
  },
  heroGreeting: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.2 },
  heroName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  heroAtelier: {
    fontSize: fontSize.sm, color: 'rgba(255,255,255,0.6)',
    fontWeight: '500', letterSpacing: 0.3, marginTop: 1,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  heroMetaText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.55)' },
  heroDot: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.28)' },

  // Alert pill
  alertPill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderRadius: radius.full, alignSelf: 'flex-start',
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
  },
  alertPillText: { fontSize: fontSize.xs, color: colors.white, fontWeight: '600' },

  // KPI card — editorial layout, floats over hero seam
  kpiWrapper: {
    paddingHorizontal: spacing.xl,
    marginTop: -spacing.xl,
    zIndex: 10,
  },
  kpiCard: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    ...shadow.md,
    overflow: 'hidden',
  },
  // Primary KPI — takes ~58% of width
  kpiPrimary: {
    flex: 58, padding: spacing.lg, gap: 4,
    borderRightWidth: 1, borderRightColor: colors.borderLight,
  },
  kpiIconDot: {
    width: 28, height: 28, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  kpiPrimaryLabel: { fontSize: 10, color: colors.textMuted, letterSpacing: 0.3, fontWeight: '500' },
  kpiPrimaryValue: {
    fontSize: fontSize.xl, fontWeight: '800', color: colors.text,
    letterSpacing: -0.5, marginTop: 2,
  },
  kpiPrimarySub: { fontSize: 10, color: colors.textMuted },

  // Vertical divider (handled by borderRight on primary)
  kpiDividerV: { width: 0 },

  // Secondary stack — right column
  kpiSecondaryStack: { flex: 42 },
  kpiSecondaryItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  kpiDividerH: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.md },
  kpiSecValue: { fontSize: fontSize.base, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  kpiSecLabel: { fontSize: 10, color: colors.textMuted, marginTop: 1 },

  // Body
  body: { paddingTop: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.md, paddingHorizontal: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  seeAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },

  // Quick actions — horizontal scroll, tall tiles
  actionsScroll: { paddingLeft: spacing.xl, paddingRight: spacing.md, gap: spacing.sm },
  actionTile: {
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    width: 76, height: 80, borderRadius: radius.xl,
  },
  actionLabel: { fontSize: fontSize.xs, fontWeight: '700', textAlign: 'center' },

  // Orders
  orderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, ...shadow.sm,
  },
  orderCardLeft: { gap: 3, flex: 1, marginRight: spacing.md },
  orderClient: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  orderModel: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic' },
  orderDate: { fontSize: fontSize.xs, color: colors.textMuted },
  orderCardRight: { gap: spacing.xs, alignItems: 'flex-end' },
  orderPrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
})
