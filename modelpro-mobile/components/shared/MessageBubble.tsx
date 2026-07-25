import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { BlurView } from 'expo-blur'
import { colors, radius, fontSize, spacing } from '@/constants/theme'
import { formatRelative } from '@/lib/utils/format'
import type { Message } from '@/lib/api/messages'

interface Props {
  message: Message
  isMine: boolean
  index: number
}

export function MessageBubble({ message, isMine, index }: Props) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 30).springify()}
      style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}
    >
      {message.photoUrl ? (
        <TouchableOpacity activeOpacity={0.9} style={[styles.photoBubble, isMine && styles.photoBubbleMine]}>
          <Image source={{ uri: message.photoUrl }} style={styles.photo} resizeMode="cover" />
          {isMine && <View style={styles.photoBubbleBorder} />}
          {message.contenu ? (
            <View style={styles.photoCaption}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={styles.photoCaptionText}>{message.contenu}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : (
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          {!isMine && (
            <>
              <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.bubbleGlassBorder} />
            </>
          )}
          <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
            {message.contenu}
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
  bubble: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    overflow: 'hidden',
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleTheirs: {
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderBottomLeftRadius: radius.sm,
  },
  bubbleGlassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
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
  photoBubble: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderBottomLeftRadius: radius.sm,
  },
  photoBubbleMine: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.sm,
  },
  photoBubbleBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.primary,
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
  photoCaptionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    zIndex: 1,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 3,
  },
  timeRight: { marginRight: spacing.xs },
  timeLeft: { marginLeft: spacing.xs },
})
