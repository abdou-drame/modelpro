import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { MessageCircle } from 'lucide-react-native'
import { messagesApi } from '@/lib/api/messages'
import { useAuthStore } from '@/lib/store/authStore'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { formatRelative } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow, fontWeight } from '@/constants/theme'
import type { Conversation } from '@/lib/api/messages'

// ─── Conversation item ────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  userId,
  index,
}: {
  conv: Conversation
  userId: number
  index: number
}) {
  const name = conv.artisan.atelier
  const avatar = conv.artisan.photoProfil
  const lastMsg = conv.dernierMessage
  const isLastMine = lastMsg?.expediteurId === userId
  const hasUnread = conv.nonLus > 0
  const preview = lastMsg?.contenu ?? (lastMsg?.photoUrl ? 'Photo' : '—')

  return (
    <Animated.View entering={FadeInUp.delay(index * 55).springify()}>
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push(`/(client)/messages/${conv.orderId}`)}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`Conversation avec ${name}. ${hasUnread ? `${conv.nonLus} message${conv.nonLus > 1 ? 's' : ''} non lu${conv.nonLus > 1 ? 's' : ''}.` : ''}`}
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <Image
            source={{
              uri:
                avatar ??
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
            }}
            style={styles.avatar}
          />
          {hasUnread && (
            <View style={styles.unreadDot} accessibilityLabel={`${conv.nonLus} non lus`} />
          )}
        </View>

        {/* Body */}
        <View style={styles.itemBody}>
          <View style={styles.itemHeader}>
            <Text
              style={[styles.itemName, hasUnread && styles.itemNameUnread]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {lastMsg && (
              <Text style={styles.itemTime}>{formatRelative(lastMsg.createdAt)}</Text>
            )}
          </View>

          <View style={styles.previewRow}>
            <Text
              style={[styles.itemPreview, hasUnread && styles.itemPreviewUnread]}
              numberOfLines={1}
            >
              {isLastMine ? `Vous : ${preview}` : preview}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {conv.nonLus > 9 ? '9+' : conv.nonLus}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Screen header ────────────────────────────────────────────────────────────

function ListHeader({ count }: { count: number }) {
  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.listHeader}>
      <Text style={styles.listHeaderTitle}>Messages</Text>
      <Text style={styles.listHeaderSub}>
        {count} conversation{count > 1 ? 's' : ''}
      </Text>
    </Animated.View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { user } = useAuthStore()

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.conversations().then((r: any) => r.data),
    refetchInterval: 5000,
  })

  const count = conversations?.length ?? 0

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <FlashList
        data={conversations ?? []}
        keyExtractor={(item) => String(item.orderId)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          isLoading ? (
            <SkeletonList count={5} type="message" />
          ) : (
            <ListHeader count={count} />
          )
        }
        renderItem={({ item, index }) => (
          <ConversationItem conv={item} userId={user?.id ?? 0} index={index} />
        )}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={<MessageCircle size={36} color={colors.textMuted} strokeWidth={1.5} />}
              title="Aucun message"
              subtitle="Vos conversations apparaîtront ici après votre première commande"
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // List layout
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  separator: {
    height: spacing.sm,
  },

  // Section header
  listHeader: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  listHeaderTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    letterSpacing: -0.5,
  },
  listHeaderSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Conversation row
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 72,
    ...shadow.sm,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  unreadDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bgCard,
  },

  // Body
  itemBody: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  itemNameUnread: {
    fontWeight: fontWeight.bold,
  },
  itemTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flexShrink: 0,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemPreview: {
    fontSize: fontSize.sm,
    color: colors.textSub,
    flex: 1,
  },
  itemPreviewUnread: {
    color: colors.text,
    fontWeight: fontWeight.medium,
  },

  // Unread badge (count)
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    flexShrink: 0,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
})
