import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { ArrowLeft, Star, MessageSquare, Award, Clock, MessageCircle, DollarSign, Briefcase } from 'lucide-react-native'
import { artisanApi } from '@/lib/api/artisan'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

function NoteBar({ label, value, icon: Icon }: { label: string; value: number | null; icon: any }) {
  if (!value) return null
  const pct = Math.round((value / 5) * 100)
  return (
    <View style={styles.subNoteRow}>
      <View style={styles.subNoteLabelBox}>
        <Icon size={12} color={colors.primary} strokeWidth={2} />
        <Text style={styles.subNoteLabel}>{label}</Text>
      </View>
      <View style={styles.subNoteTrack}>
        <View style={[styles.subNoteFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.subNoteValue}>{value}/5</Text>
    </View>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d)
}

export default function ArtisanReviewsScreen() {
  const { data: reviews = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['artisan-reviews'],
    queryFn: () => artisanApi.getReviews().then((r) => r.data),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  })

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.note || 0), 0) / reviews.length).toFixed(1)
    : '0.0'

  return (
    <View style={styles.container}>
      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Avis clients</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[colors.primary]} />
        }
      >
        {/* Rating summary banner */}
        <Animated.View entering={FadeInUp.delay(40).springify()} style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryAvg}>{avgRating}</Text>
            <View style={styles.summaryStarsRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  color={i < Math.round(Number(avgRating)) ? '#F59E0B' : colors.border}
                  fill={i < Math.round(Number(avgRating)) ? '#F59E0B' : 'none'}
                />
              ))}
            </View>
            <Text style={styles.summaryCount}>
              {reviews.length} avis reçu{reviews.length > 1 ? 's' : ''}
            </Text>
          </View>
        </Animated.View>

        {/* List of reviews */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Chargement des avis...</Text>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <MessageSquare size={36} color={colors.textMuted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Aucun avis reçu</Text>
            <Text style={styles.emptyDesc}>
              Les avis de vos clients apparaîtront ici après la livraison de leurs commandes.
            </Text>
          </View>
        ) : (
          reviews.map((rev, index) => {
            const clientName = rev.client
              ? `${rev.client.prenom ?? ''} ${rev.client.nom ?? ''}`.trim() || 'Client'
              : 'Client'
            const initials = rev.client
              ? `${rev.client.prenom?.[0] ?? ''}${rev.client.nom?.[0] ?? ''}`.toUpperCase()
              : '?'

            return (
              <Animated.View
                key={rev.id}
                entering={FadeInUp.delay(index * 60).springify()}
                style={styles.reviewCard}
              >
                {/* Header review */}
                <View style={styles.reviewHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={styles.clientMeta}>
                    <Text style={styles.clientName}>{clientName}</Text>
                    <Text style={styles.reviewDate}>{formatDate(rev.createdAt)}</Text>
                  </View>
                  <View style={styles.starsBadge}>
                    <Star size={13} color="#F59E0B" fill="#F59E0B" />
                    <Text style={styles.starsBadgeText}>{rev.note}/5</Text>
                  </View>
                </View>

                {/* Comment */}
                {rev.commentaire ? (
                  <Text style={styles.commentText}>{rev.commentaire}</Text>
                ) : null}

                {/* Sub-ratings */}
                <View style={styles.subNotesBox}>
                  <NoteBar label="Qualité" value={rev.noteQualite} icon={Award} />
                  <NoteBar label="Délai" value={rev.noteDelai} icon={Clock} />
                  <NoteBar label="Communication" value={rev.noteCommunication} icon={MessageCircle} />
                  <NoteBar label="Prix" value={rev.notePrix} icon={DollarSign} />
                  <NoteBar label="Professionnalisme" value={rev.noteProfessionnalisme} icon={Briefcase} />
                </View>
              </Animated.View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 52,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },

  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 100 },

  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryMain: { alignItems: 'center', gap: spacing.xs },
  summaryAvg: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -1 },
  summaryStarsRow: { flexDirection: 'row', gap: 4, marginVertical: 2 },
  summaryCount: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },

  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, color: colors.textMuted },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: spacing.sm },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.bgMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  emptyDesc: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', maxWidth: 260 },

  reviewCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  clientMeta: { flex: 1, gap: 2 },
  clientName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  reviewDate: { fontSize: fontSize.xs, color: colors.textMuted },

  starsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  starsBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: '#D97706' },

  commentText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 22,
    backgroundColor: colors.bgMuted,
    padding: spacing.md,
    borderRadius: radius.lg,
  },

  subNotesBox: { gap: 6, paddingTop: spacing.xs },
  subNoteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  subNoteLabelBox: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 120 },
  subNoteLabel: { fontSize: fontSize.xs, color: colors.textSub, fontWeight: '500' },
  subNoteTrack: { flex: 1, height: 6, backgroundColor: colors.bgMuted, borderRadius: 3, overflow: 'hidden' },
  subNoteFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  subNoteValue: { fontSize: fontSize.xs, fontWeight: '700', color: colors.text, width: 28, textAlign: 'right' },
})
