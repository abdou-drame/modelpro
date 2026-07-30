import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import {
  ShoppingBag, MessageCircle, Calendar, Star, AlertCircle, CreditCard, Bell, Check,
} from 'lucide-react-native'
import { notificationsApi } from '@/lib/api/notifications'
import { formatRelative } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { AppNotification } from '@/lib/api/notifications'
import type { NotificationType } from '@/constants/enums'

const NOTIF_META: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  nouveau_message:  { icon: MessageCircle, color: '#2563EB',       bg: '#DBEAFE' },
  demande_rdv:      { icon: Calendar,      color: colors.success,  bg: colors.successLight },
  rdv_statut:       { icon: Calendar,      color: colors.warning,  bg: colors.warningLight },
  commande_statut:  { icon: ShoppingBag,   color: colors.primary,  bg: `${colors.primary}18` },
  rappel:           { icon: AlertCircle,   color: colors.warning,  bg: colors.warningLight },
  notation:         { icon: Star,          color: '#D97706',       bg: '#FEF9C3' },
  paiement:         { icon: CreditCard,    color: colors.success,  bg: colors.successLight },
}

function NotifItem({ notif, index }: { notif: AppNotification; index: number }) {
  const meta = NOTIF_META[notif.type] ?? { icon: Bell, color: colors.textSub, bg: colors.bgMuted }
  const Icon = meta.icon

  return (
    <Animated.View entering={FadeInUp.delay(index * 40).springify()}>
      <View style={[styles.item, !notif.lu && styles.itemUnread]}>
        {!notif.lu && <View style={styles.unreadAccent} />}

        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Icon size={20} color={meta.color} strokeWidth={1.8} />
        </View>

        <View style={styles.notifBody}>
          <Text style={[styles.notifTitle, !notif.lu && styles.notifTitleUnread]}>
            {notif.titre}
          </Text>
          <Text style={styles.notifMessage} numberOfLines={2}>{notif.description}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 ? (
              <Text style={styles.headerSub}>
                {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={styles.headerSubEmpty}>Tout est à jour</Text>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Marquer toutes les notifications comme lues"
            >
              <Check size={14} color={colors.primary} strokeWidth={2.5} />
              <Text style={styles.markAllText}>Tout lire</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlashList
        data={notifications ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item, index }) => <NotifItem notif={item} index={index} />}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyIconBox}>
                <Bell size={32} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>
                Vous serez notifié des mises à jour de vos commandes ici.
              </Text>
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
    paddingTop: 52,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  headerSubEmpty: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  markAllText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  itemUnread: {
    backgroundColor: `${colors.primary}07`,
    borderColor: `${colors.primary}25`,
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
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

  empty: {
    alignItems: 'center',
    paddingTop: 72,
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    textAlign: 'center',
    lineHeight: 22,
  },
})
