import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { colors, radius, fontSize, spacing, shadow } from '@/constants/theme'
import { formatRelative } from '@/lib/utils/format'
import type { Message } from '@/lib/api/messages'

interface Props {
  message: Message
  isMine: boolean
  index: number
}

export function MessageBubble({ message, isMine, index }: Props) {
  // Cap animation delay so long lists don't stall
  const delay = Math.min(index * 30, 300)

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).springify()}
      style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}
    >
      {message.photoUrl ? (
        <TouchableOpacity
          activeOpacity={0.88}
          style={[styles.photoBubble, isMine ? styles.photoBubbleMine : styles.photoBubbleTheirs]}
          accessibilityRole="button"
          accessibilityLabel={message.texte ? `Photo : ${message.texte}` : 'Photo jointe'}
        >
          <Image source={{ uri: message.photoUrl }} style={styles.photo} resizeMode="cover" />
          {message.texte ? (
            <View style={styles.photoCaption}>
              <View style={styles.photoCaptionBg} />
              <Text style={styles.photoCaptionText} numberOfLines={2}>
                {message.texte}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View
          style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
          accessible
          accessibilityLabel={message.texte ?? ''}
        >
          <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
            {message.texte}
          </Text>
        </View>
      )}

      <Text style={[styles.time, isMine ? styles.timeRight : styles.timeLeft]}>
        {formatRelative(message.createdAt)}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginVertical: spacing.xs,
    maxWidth: '78%',
  },
  rowRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  rowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  // Text bubbles
  bubble: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
    ...shadow.sm,
  },
  bubbleTheirs: {
    backgroundColor: colors.bgCard,
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },

  text: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  textMine: {
    color: colors.white,
  },
  textTheirs: {
    color: colors.text,
  },

  // Photo bubbles
  photoBubble: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  photoBubbleMine: {
    borderBottomRightRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  photoBubbleTheirs: {
    borderBottomLeftRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photo: {
    width: 220,
    height: 260,
    backgroundColor: colors.bgMuted,
  },
  photoCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    overflow: 'hidden',
  },
  photoCaptionBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 16, 5, 0.62)',
  },
  photoCaptionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    lineHeight: 18,
    zIndex: 1,
  },

  // Timestamps
  time: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 3,
  },
  timeRight: { marginRight: spacing.xs },
  timeLeft: { marginLeft: spacing.xs },
})
