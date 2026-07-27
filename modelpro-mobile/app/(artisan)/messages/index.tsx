import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { MessageCircle } from 'lucide-react-native'
import { BlurView } from 'expo-blur'
import { messagesApi } from '@/lib/api/messages'
import { useAuthStore } from '@/lib/store/authStore'
import { formatRelative } from '@/lib/utils/format'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { Conversation } from '@/lib/api/messages'

const BG = 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80'

function ConversationItem({ conv, userId, index }: { conv: Conversation; userId: number; index: number }) {
  const name = `${conv.client.user.prenom} ${conv.client.user.nom}`
  const avatar = conv.client.photoProfil
  const lastMsg = conv.dernierMessage
  const isLastMine = lastMsg?.expediteurId === userId
  const preview = lastMsg?.texte ?? (lastMsg?.photoUrl ? 'Photo' : '—')

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <TouchableOpacity
        style={styles.item}
        onPress={() => router.push(`/(artisan)/messages/${conv.orderId}`)}
        activeOpacity={0.88}
      >
        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.itemBorder} />
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: avatar ?? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80' }}
            style={styles.avatar}
          />
          {conv.nonLus > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conv.nonLus > 9 ? '9+' : conv.nonLus}</Text>
            </View>
          )}
        </View>
        <View style={styles.itemBody}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
            {lastMsg && <Text style={styles.itemTime}>{formatRelative(lastMsg.createdAt)}</Text>}
          </View>
          <Text style={[styles.itemPreview, conv.nonLus > 0 && styles.itemPreviewUnread]} numberOfLines={1}>
            {isLastMine ? `Vous : ${preview}` : preview}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function ArtisanMessagesScreen() {
  const { user } = useAuthStore()
  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.conversations().then((r) => r.data),
    refetchInterval: 5000,
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: BG }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
        <View style={styles.headerOverlay} />
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>{conversations?.length ?? 0} conversation{(conversations?.length ?? 0) > 1 ? 's' : ''}</Text>
      </View>
      <FlashList
        data={conversations ?? []}
        keyExtractor={(item) => String(item.orderId)}
        estimatedItemSize={80}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item, index }) => (
          <ConversationItem conv={item} userId={user?.id ?? 0} index={index} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MessageCircle size={36} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Aucun message</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { height: 140, justifyContent: 'flex-end', padding: spacing.xl, overflow: 'hidden' },
  headerOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(26,26,46,0.6)' },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderRadius: radius.xl, padding: spacing.md, overflow: 'hidden', ...shadow.sm,
  },
  itemBorder: {
    ...StyleSheet.absoluteFill, borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: radius.full, backgroundColor: colors.bgMuted },
  unreadBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18,
    borderRadius: radius.full, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: colors.white,
  },
  unreadText: { fontSize: 10, fontWeight: '700', color: colors.white },
  itemBody: { flex: 1, gap: 3 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flex: 1 },
  itemTime: { fontSize: fontSize.xs, color: colors.textMuted },
  itemPreview: { fontSize: fontSize.sm, color: colors.textSub },
  itemPreviewUnread: { color: colors.text, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
})
