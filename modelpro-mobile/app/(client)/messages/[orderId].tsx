import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, useEffect } from 'react'
import { ArrowLeft, Send, Paperclip, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { messagesApi } from '@/lib/api/messages'
import { ordersApi } from '@/lib/api/orders'
import { useAuthStore } from '@/lib/store/authStore'
import { MessageBubble } from '@/components/shared/MessageBubble'
import { colors, spacing, fontSize, radius, shadow, fontWeight } from '@/constants/theme'
import type { OrderStatus } from '@/constants/enums'

// ─── Order status label & color ───────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  en_cours: 'En cours',
  en_finition: 'En finition',
  prete: 'Prête',
  livree: 'Livrée',
  annulee: 'Annulée',
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  en_attente: { bg: colors.warningLight, text: colors.warning },
  acceptee: { bg: colors.successLight, text: colors.success },
  en_cours: { bg: '#DBEAFE', text: '#1D4ED8' },
  en_finition: { bg: '#EDE9FE', text: '#6D28D9' },
  prete: { bg: colors.successLight, text: colors.success },
  livree: { bg: colors.bgMuted, text: colors.textSub },
  annulee: { bg: colors.errorLight, text: colors.error },
}

// ─── Date separator ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <View style={sep.wrapper}>
      <View style={sep.line} />
      <Text style={sep.label}>{label}</Text>
      <View style={sep.line} />
    </View>
  )
}

const sep = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  label: { fontSize: fontSize.xs, color: colors.textMuted },
})

// ─── Photo preview bar ────────────────────────────────────────────────────────

function PhotoPreviewBar({
  uri,
  onRemove,
}: {
  uri: string
  onRemove: () => void
}) {
  return (
    <View style={preview.bar}>
      <Image source={{ uri }} style={preview.thumb} />
      <Text style={preview.label}>Photo jointe</Text>
      <TouchableOpacity
        onPress={onRemove}
        style={preview.removeBtn}
        accessibilityRole="button"
        accessibilityLabel="Retirer la photo"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={16} color={colors.error} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  )
}

const preview = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgMuted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.bgMuted,
  },
  label: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '500',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

// ─── Main chat screen ─────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const id = Number(orderId)
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const listRef = useRef<FlatList>(null)
  const [text, setText] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<{
    uri: string
    name: string
    type: string
  } | null>(null)

  // ── Polling 5s — preserved exactly ─────────────────────────────────────────
  const { data: messages } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagesApi.orderMessages(id).then((r) => r.data),
    refetchInterval: 5000,
  })

  // ── Order info for header ───────────────────────────────────────────────────
  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.myOrders().then((r) => r.data),
  })
  const order = orders?.find((o) => o.id === id)
  const statusInfo = order ? STATUS_COLORS[order.statut] : null

  // ── Send mutation ───────────────────────────────────────────────────────────
  const sendMutation = useMutation({
    mutationFn: () => messagesApi.send(id, text || undefined, pendingPhoto ?? undefined),
    onSuccess: () => {
      setText('')
      setPendingPhoto(null)
      queryClient.invalidateQueries({ queryKey: ['messages', id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  // ── Image picker ────────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const name = asset.uri.split('/').pop() ?? 'photo.jpg'
      setPendingPhoto({ uri: asset.uri, name, type: 'image/jpeg' })
    }
  }

  // ── Auto-scroll to bottom on new messages ───────────────────────────────────
  useEffect(() => {
    if (messages?.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages?.length])

  const canSend = text.trim().length > 0 || pendingPhoto !== null

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace('/(client)/messages')}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour aux messages"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        {order ? (
          <View style={styles.headerInfo}>
            <Image
              source={{
                uri:
                  order.artisan.photoProfil ??
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
              }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerText}>
              <Text style={styles.headerName} numberOfLines={1}>
                {order.artisan.atelier}
              </Text>
              <View style={styles.headerMeta}>
                <Text style={styles.headerOrderNum}>Commande #{id}</Text>
                {statusInfo && (
                  <View
                    style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}
                    accessibilityLabel={`Statut : ${STATUS_LABELS[order.statut]}`}
                  >
                    <Text style={[styles.statusText, { color: statusInfo.text }]}>
                      {STATUS_LABELS[order.statut]}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatarPlaceholder} />
            <View style={styles.headerText}>
              <Text style={styles.headerName}>Commande #{id}</Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Messages list ──────────────────────────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={messages ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item, index }) => (
          <MessageBubble
            message={item}
            isMine={item.sender?.id === user?.id}
            index={index}
          />
        )}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>
              Démarrez la conversation avec cet artisan
            </Text>
          </View>
        }
      />

      {/* ── Pending photo preview ──────────────────────────────────────────── */}
      {pendingPhoto && (
        <PhotoPreviewBar
          uri={pendingPhoto.uri}
          onRemove={() => setPendingPhoto(null)}
        />
      )}

      {/* ── Input bar ─────────────────────────────────────────────────────── */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          onPress={pickPhoto}
          style={styles.attachBtn}
          accessibilityRole="button"
          accessibilityLabel="Joindre une photo"
        >
          <Paperclip size={20} color={colors.textSub} strokeWidth={1.8} />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Votre message..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={500}
          accessibilityLabel="Champ de saisie du message"
        />

        <TouchableOpacity
          onPress={() => sendMutation.mutate()}
          disabled={!canSend || sendMutation.isPending}
          style={[styles.sendBtn, canSend ? styles.sendBtnActive : styles.sendBtnInactive]}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
        >
          {sendMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Send
              size={18}
              color={canSend ? colors.white : colors.textMuted}
              strokeWidth={2}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
    ...shadow.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    borderWidth: 1.5,
    borderColor: colors.border,
    flexShrink: 0,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  headerName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  headerOrderNum: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },

  // Messages
  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyChatText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing.md,
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
    ...shadow.md,
  },
  sendBtnInactive: {
    backgroundColor: colors.bgMuted,
  },
})
