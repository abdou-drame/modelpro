import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ShoppingBag, MessageCircle, Calendar, Star, AlertCircle, CreditCard, Bell,
} from 'lucide-react-native'
import { notificationsApi } from '@/lib/api/notifications'
import { formatRelative } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { AppNotification } from '@/lib/api/notifications'
import type { NotificationType } from '@/constants/enums'

const NOTIF_BG = 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=800&q=80'

const NOTIF_META: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  nouvelle_commande: { icon: ShoppingBag, color: colors.primary, bg: '#FEF3E8' },
  statut_commande:   { icon: ShoppingBag, color: '#7C3AED', bg: '#EDE9FE' },
  nouveau_message:   { icon: MessageCircle, color: '#2563EB', bg: '#DBEAFE' },
  nouveau_rdv:       { icon: Calendar, color: colors.success, bg: colors.successLight },
  statut_rdv:        { icon: Calendar, color: '#D97706', bg: colors.warningLight },
  paiement:          { icon: CreditCard, color: colors.success, bg: colors.successLight },
  avis:              { icon: Star, color: '#F59E0B', bg: '#FEF9C3' },
}

function NotifItem({ notif, index }: { notif: AppNotification; index: number }) {
  const meta = NOTIF_META[notif.type] ?? { icon: Bell, color: colors.textSub, bg: colors.bgMuted }
  const Icon = meta.icon

  return (
    <Animated.View entering={FadeInUp.delay(index * 40).springify()}>
      <View style={[styles.item, !notif.lu && styles.itemUnread]}>
        {!notif.lu && <BlurView intensity={45} tint="light" style={StyleSheet.absoluteFill} />}
        {!notif.lu && <View style={styles.itemBorder} />}

        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Icon size={20} color={meta.color} strokeWidth={1.8} />
        </View>

        <View style={styles.notifBody}>
          <Text style={[styles.notifTitle, !notif.lu && styles.notifTitleUnread]}>
            {notif.titre}
          </Text>
          <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
          <Text style={styles.notifTime}>{formatRelative(notif.createdAt)}</Text>
        </View>

        {!notif.lu && <View style={styles.dot} />}
      </View>
    </Animated.View>
  )
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    refetchInterval: 10000,
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = notifications?.filter((n) => !n.lu).length ?? 0

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient colors={[colors.accent, '#2A2A4E']} style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSub}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
            >
              <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.markAllBorder} />
              <Text style={styles.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlashList
        data={notifications ?? []}
        keyExtractor={(item) => String(item.id)}
        estimatedItemSize={90}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item, index }) => <NotifItem notif={item} index={index} />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <Bell size={36} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>Vous serez notifié des mises à jour de vos commandes ici</Text>
            </View>
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    overflow: 'hidden',
    paddingTop: 52,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  headerSub: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  markAllBtn: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  markAllBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  markAllText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white, zIndex: 1 },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    ...shadow.sm,
  },
  itemUnread: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  itemBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: { flex: 1, gap: 3 },
  notifTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  notifTitleUnread: { fontWeight: '700' },
  notifMessage: { fontSize: fontSize.xs, color: colors.textSub, lineHeight: 18 },
  notifTime: { fontSize: fontSize.xs, color: colors.textMuted },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },

  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub, textAlign: 'center', lineHeight: 22 },
})
