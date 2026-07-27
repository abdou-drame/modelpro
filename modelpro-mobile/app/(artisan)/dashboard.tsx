import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import {
  TrendingUp, ShoppingBag, Star, ChevronRight, AlertCircle,
} from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { useAuthStore } from '@/lib/store/authStore'
import { StarRating } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { formatPrice, formatDate, ORDER_STATUS_LABELS } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { OrderStatus } from '@/constants/enums'

const { width } = Dimensions.get('window')
const HERO = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80'

const STATUS_VARIANT: Record<OrderStatus, 'neutral' | 'primary' | 'success' | 'error' | 'warning'> = {
  en_attente: 'neutral', acceptee: 'primary', en_cours: 'primary',
  en_finition: 'warning', prete: 'success', livree: 'success', annulee: 'error',
}

function StatCard({ label, value, sub, icon: Icon, color, delay }: {
  label: string; value: string; sub?: string
  icon: any; color: string; delay: number
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={styles.statCard}>
      <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.statBorder} />
      <View style={[styles.statIconBox, { backgroundColor: `${color}18` }]}>
        <Icon size={20} color={color} strokeWidth={1.8} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </Animated.View>
  )
}

export default function ArtisanDashboard() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['artisan-stats'],
    queryFn: () => artisanApi.stats().then((r) => r.data),
    refetchInterval: 30000,
  })

  const { data: profile } = useQuery({
    queryKey: ['artisan-profile'],
    queryFn: () => artisanApi.getProfile().then((r) => r.data),
  })

  const { data: orders } = useQuery({
    queryKey: ['artisan-orders'],
    queryFn: () => artisanApi.orders().then((r) => r.data),
  })

  const activeOrders = orders?.filter((o) =>
    !['livree', 'annulee'].includes(o.statut)
  ).slice(0, 3) ?? []

  const pendingOrders = orders?.filter((o) => o.statut === 'en_attente') ?? []

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero header */}
      <View style={styles.hero}>
        <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(26,26,46,0.3)', 'rgba(26,26,46,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.heroContent}>
          <View style={styles.heroRow}>
            <Image
              source={{ uri: profile?.photoProfil ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' }}
              style={styles.heroAvatar}
            />
            <View style={styles.heroText}>
              <Text style={styles.heroGreeting}>Bonjour,</Text>
              <Text style={styles.heroName}>{user?.prenom} {user?.nom}</Text>
              {profile && (
                <View style={styles.heroRating}>
                  <StarRating value={profile.notemoyenne ?? 0} size={12} />
                  <Text style={styles.heroRatingText}>{(profile.notemoyenne ?? 0).toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Alerte commandes en attente */}
          {pendingOrders.length > 0 && (
            <TouchableOpacity
              style={styles.alertBar}
              onPress={() => router.push('/(artisan)/orders')}
            >
              <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.alertBorder} />
              <AlertCircle size={16} color={colors.warning} strokeWidth={2} />
              <Text style={styles.alertText}>
                {pendingOrders.length} commande{pendingOrders.length > 1 ? 's' : ''} en attente de réponse
              </Text>
              <ChevronRight size={14} color="rgba(255,255,255,0.7)" strokeWidth={2} />
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>

      <View style={styles.body}>
        {/* Stats grid */}
        {stats && (
          <View style={styles.statsGrid}>
            <StatCard
              label="Chiffre d'affaires"
              value={formatPrice(stats.chiffreAffaires ?? 0)}
              sub="Total"
              icon={TrendingUp}
              color={colors.success}
              delay={100}
            />
            <StatCard
              label="Commandes"
              value={String(stats.commandesEnCours ?? 0)}
              sub="En cours"
              icon={ShoppingBag}
              color={colors.primary}
              delay={160}
            />
            <StatCard
              label="Note"
              value={(stats.noteGlobale ?? 0).toFixed(1)}
              sub="Moyenne"
              icon={Star}
              color="#F59E0B"
              delay={220}
            />
          </View>
        )}

        {/* Commandes actives */}
        {activeOrders.length > 0 && (
          <Animated.View entering={FadeInUp.delay(340).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Commandes actives</Text>
              <TouchableOpacity onPress={() => router.push('/(artisan)/orders')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>

            {activeOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/(artisan)/orders/${order.id}`)}
                activeOpacity={0.88}
              >
                <View style={styles.orderCardLeft}>
                  <Text style={styles.orderClient}>
                    {order.client.prenom} {order.client.nom}
                  </Text>
                  {order.creation && (
                    <Text style={styles.orderModel} numberOfLines={1}>{order.creation.titre}</Text>
                  )}
                  <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                </View>
                <View style={styles.orderCardRight}>
                  <Badge label={ORDER_STATUS_LABELS[order.statut]} variant={STATUS_VARIANT[order.statut]} />
                  {order.prixTotal && (
                    <Text style={styles.orderPrice}>{formatPrice(order.prixTotal)}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Raccourcis */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={styles.shortcuts}>
            {[
              { label: 'Catalogue', sub: 'Gérer mes modèles', route: '/(artisan)/catalogue', color: colors.primary },
              { label: 'Rendez-vous', sub: 'Voir mes RDV', route: '/(artisan)/appointments', color: colors.success },
            ].map((s) => (
              <TouchableOpacity
                key={s.route}
                style={styles.shortcutCard}
                onPress={() => router.push(s.route as any)}
                activeOpacity={0.88}
              >
                <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
                <View style={styles.shortcutBorder} />
                <Text style={[styles.shortcutLabel, { color: s.color }]}>{s.label}</Text>
                <Text style={styles.shortcutSub}>{s.sub}</Text>
                <ChevronRight size={16} color={s.color} strokeWidth={2} style={{ marginTop: 'auto' as any }} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 80 }} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: { height: 300, justifyContent: 'flex-end', overflow: 'hidden' },
  heroContent: { padding: spacing.xl, gap: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroAvatar: {
    width: 56, height: 56, borderRadius: radius.full,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  heroText: { gap: 3 },
  heroGreeting: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.6)' },
  heroName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  heroRating: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  heroRatingText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)' },
  alertBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderRadius: radius.lg, padding: spacing.md, overflow: 'hidden',
  },
  alertBorder: {
    ...StyleSheet.absoluteFill, borderRadius: radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  alertText: { flex: 1, fontSize: fontSize.sm, color: colors.white, fontWeight: '500' },

  body: { padding: spacing.xl, gap: spacing.xl },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
  },
  statCard: {
    width: (width - spacing.xl * 2 - spacing.md) / 2,
    borderRadius: radius.xl, padding: spacing.lg,
    overflow: 'hidden', gap: spacing.sm, ...shadow.sm,
  },
  statBorder: {
    ...StyleSheet.absoluteFill, borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
  },
  statIconBox: {
    width: 40, height: 40, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  statLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  statSub: { fontSize: fontSize.xs, color: colors.textMuted },

  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  seeAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },

  orderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.lg, ...shadow.sm,
  },
  orderCardLeft: { gap: 3, flex: 1 },
  orderClient: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  orderModel: { fontSize: fontSize.sm, color: colors.textSub, fontStyle: 'italic' },
  orderDate: { fontSize: fontSize.xs, color: colors.textMuted },
  orderCardRight: { gap: spacing.xs, alignItems: 'flex-end' },
  orderPrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },

  shortcuts: { flexDirection: 'row', gap: spacing.md },
  shortcutCard: {
    flex: 1, borderRadius: radius.xl, padding: spacing.lg,
    overflow: 'hidden', gap: 4, minHeight: 100, ...shadow.sm,
  },
  shortcutBorder: {
    ...StyleSheet.absoluteFill, borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
  },
  shortcutLabel: { fontSize: fontSize.base, fontWeight: '800' },
  shortcutSub: { fontSize: fontSize.xs, color: colors.textSub },
})
