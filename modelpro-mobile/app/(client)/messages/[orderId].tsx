import {
  View, Text, Image, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, useEffect } from 'react'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, Send, Image as ImageIcon } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { messagesApi } from '@/lib/api/messages'
import { ordersApi } from '@/lib/api/orders'
import { useAuthStore } from '@/lib/store/authStore'
import { MessageBubble } from '@/components/shared/MessageBubble'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const CHAT_BG = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'

export default function ChatScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const id = Number(orderId)
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const listRef = useRef<FlatList>(null)
  const [text, setText] = useState('')
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; name: string; type: string } | null>(null)

  // Polling 5s
  const { data: messages } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messagesApi.orderMessages(id).then((r) => r.data),
    refetchInterval: 5000,
  })

  // Infos commande pour le header
  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => ordersApi.myOrders().then((r) => r.data),
  })
  const order = orders?.find((o) => o.id === id)

  const sendMutation = useMutation({
    mutationFn: () => messagesApi.send(id, text || undefined, pendingPhoto ?? undefined),
    onSuccess: () => {
      setText('')
      setPendingPhoto(null)
      queryClient.invalidateQueries({ queryKey: ['messages', id] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const name = asset.uri.split('/').pop() ?? 'photo.jpg'
      setPendingPhoto({ uri: asset.uri, name, type: 'image/jpeg' })
    }
  }

  // Scroll au bas à chaque nouveau message
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
      {/* Background texture */}
      <Image source={{ uri: CHAT_BG }} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.bgOverlay} />

      {/* Header glass */}
      <View style={styles.header}>
        <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.headerBorder} />
        <TouchableOpacity onPress={() => router.replace('/(client)/messages')} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        {order && (
          <View style={styles.headerInfo}>
            <Image
              source={{ uri: order.artisan.photoProfil ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' }}
              style={styles.headerAvatar}
            />
            <View>
              <Text style={styles.headerName}>{order.artisan.nomAtelier}</Text>
              <Text style={styles.headerSub}>Commande #{id}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item, index }) => (
          <MessageBubble
            message={item}
            isMine={item.sender.id === user?.id}
            index={index}
          />
        )}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Preview photo sélectionnée */}
      {pendingPhoto && (
        <View style={styles.photoPreviewBar}>
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
          <Image source={{ uri: pendingPhoto.uri }} style={styles.photoPreviewThumb} />
          <Text style={styles.photoPreviewText}>Photo jointe</Text>
          <TouchableOpacity onPress={() => setPendingPhoto(null)}>
            <Text style={styles.photoRemove}>Retirer</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barre de saisie glass */}
      <View style={styles.inputBar}>
        <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.inputBarBorder} />

        <TouchableOpacity onPress={pickPhoto} style={styles.photoBtn}>
          <ImageIcon size={22} color={colors.textSub} strokeWidth={1.8} />
        </TouchableOpacity>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Votre message..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          onPress={() => sendMutation.mutate()}
          disabled={!canSend || sendMutation.isPending}
          style={[styles.sendBtn, canSend && styles.sendBtnActive]}
        >
          {sendMutation.isPending
            ? <ActivityIndicator size="small" color={colors.white} />
            : <Send size={18} color={canSend ? colors.white : colors.textMuted} strokeWidth={2} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFill as any, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(247,244,239,0.88)' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
    zIndex: 10,
  },
  headerBorder: {
    ...StyleSheet.absoluteFill,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  headerAvatar: { width: 36, height: 36, borderRadius: radius.full, backgroundColor: colors.bgMuted },
  headerName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  headerSub: { fontSize: fontSize.xs, color: colors.textMuted },

  messagesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: 20,
  },

  photoPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  photoPreviewThumb: { width: 40, height: 40, borderRadius: radius.md },
  photoPreviewText: { flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: '500' },
  photoRemove: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  inputBarBorder: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
  },
  photoBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.primary,
  },
})
