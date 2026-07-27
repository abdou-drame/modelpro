import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useState } from 'react'
import { ArrowLeft, Star } from 'lucide-react-native'
import { reviewsApi } from '@/lib/api/reviews'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const CRITERIA: { key: keyof Omit<Scores, 'commentaire'>; label: string; desc: string }[] = [
  { key: 'noteQualite',          label: 'Qualité',              desc: 'Finition, matières, soin du travail' },
  { key: 'noteDelai',            label: 'Délai',                desc: 'Respect de la date de livraison' },
  { key: 'noteCommunication',    label: 'Communication',        desc: 'Réactivité et clarté des échanges' },
  { key: 'notePrix',             label: 'Rapport qualité/prix', desc: 'Adéquation prix et prestation' },
  { key: 'noteProfessionnalisme', label: 'Professionnalisme',   desc: 'Sérieux et savoir-faire' },
]

const STAR_LABELS = ['', 'Décevant', 'Passable', 'Bien', 'Très bien', 'Excellent']
const STAR_AMBER = '#D97706'

interface Scores {
  noteQualite: number
  noteDelai: number
  noteCommunication: number
  notePrix: number
  noteProfessionnalisme: number
  commentaire: string
}

function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number
  onChange: (v: number) => void
  label: string
}) {
  return (
    <View style={styles.starPickerRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          style={styles.starTouch}
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${n} étoile${n > 1 ? 's' : ''} — ${STAR_LABELS[n]}`}
          accessibilityState={{ selected: n === value }}
        >
          <Star
            size={34}
            color={n <= value ? STAR_AMBER : colors.border}
            fill={n <= value ? STAR_AMBER : 'transparent'}
            strokeWidth={1.5}
          />
        </TouchableOpacity>
      ))}
      {value > 0 && (
        <Text style={styles.starHint}>{STAR_LABELS[value]}</Text>
      )}
    </View>
  )
}

export default function ReviewScreen() {
  const { artisanId, artisanName, orderId } = useLocalSearchParams<{
    artisanId: string; artisanName: string; orderId: string
  }>()

  const [scores, setScores] = useState<Scores>({
    noteQualite: 0,
    noteDelai: 0,
    noteCommunication: 0,
    notePrix: 0,
    noteProfessionnalisme: 0,
    commentaire: '',
  })

  const avgScore = CRITERIA.every((c) => scores[c.key] > 0)
    ? ((scores.noteQualite + scores.noteDelai + scores.noteCommunication + scores.notePrix + scores.noteProfessionnalisme) / 5)
    : null

  const mutation = useMutation({
    mutationFn: () => reviewsApi.create({
      artisanId: Number(artisanId),
      noteQualite: scores.noteQualite,
      noteDelai: scores.noteDelai,
      noteCommunication: scores.noteCommunication,
      notePrix: scores.notePrix,
      noteProfessionnalisme: scores.noteProfessionnalisme,
      commentaire: scores.commentaire || undefined,
    }),
    onSuccess: () => {
      Alert.alert('Avis publié', 'Merci pour votre retour !', [
        { text: 'OK', onPress: () => router.back() },
      ])
    },
    onError: () => {
      Alert.alert('Erreur', "Impossible de soumettre l'avis. Vérifiez que la commande est bien livrée.")
    },
  })

  const canSubmit = CRITERIA.every((c) => scores[c.key] > 0)

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Nav */}
        <View style={styles.navBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Donner un avis</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Artisan header */}
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.artisanHeader}>
            <Text style={styles.artisanPrompt}>Votre expérience avec</Text>
            <Text style={styles.artisanName}>{artisanName}</Text>
            {avgScore !== null && (
              <View style={styles.avgPill}>
                <Star size={14} color={STAR_AMBER} fill={STAR_AMBER} strokeWidth={1.5} />
                <Text style={styles.avgScore}>{avgScore.toFixed(1)}</Text>
                <Text style={styles.avgLabel}>/ 5</Text>
              </View>
            )}
          </Animated.View>

          {/* Criteria cards */}
          {CRITERIA.map((c, i) => (
            <Animated.View
              key={c.key}
              entering={FadeInUp.delay(100 + i * 60).springify()}
              style={[styles.criteriaCard, scores[c.key] > 0 && styles.criteriaCardFilled]}
            >
              <View style={styles.criteriaTop}>
                <Text style={styles.criteriaLabel}>{c.label}</Text>
                <Text style={styles.criteriaDesc}>{c.desc}</Text>
              </View>
              <StarPicker
                value={scores[c.key]}
                onChange={(v) => setScores((prev) => ({ ...prev, [c.key]: v }))}
                label={c.label}
              />
            </Animated.View>
          ))}

          {/* Comment */}
          <Animated.View entering={FadeInUp.delay(440).springify()} style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Commentaire <Text style={styles.optionalTag}>(optionnel)</Text></Text>
            <TextInput
              style={styles.textarea}
              value={scores.commentaire}
              onChangeText={(v) => setScores((prev) => ({ ...prev, commentaire: v }))}
              placeholder="Partagez votre expérience avec cet artisan..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Commentaire sur l'artisan"
            />
          </Animated.View>

          {/* Submit */}
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            {!canSubmit && (
              <Text style={styles.submitHint}>
                Notez les {CRITERIA.length} critères pour publier votre avis.
              </Text>
            )}
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit || mutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Publier mon avis"
              accessibilityState={{ disabled: !canSubmit || mutation.isPending }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={canSubmit ? colors.white : colors.textMuted} size="small" />
              ) : (
                <>
                  <Star
                    size={18}
                    color={canSubmit ? colors.white : colors.textMuted}
                    fill={canSubmit ? colors.white : 'transparent'}
                    strokeWidth={2}
                  />
                  <Text style={[styles.submitBtnText, !canSubmit && styles.submitBtnTextDisabled]}>
                    Publier mon avis
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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

  scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 60 },

  artisanHeader: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  artisanPrompt: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  artisanName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  avgPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  avgScore: { fontSize: fontSize.base, fontWeight: '800', color: '#92400E' },
  avgLabel: { fontSize: fontSize.sm, color: '#92400E', opacity: 0.7 },

  criteriaCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  criteriaCardFilled: {
    borderColor: `${colors.primary}30`,
    backgroundColor: `${colors.primary}05`,
  },
  criteriaTop: { gap: 2 },
  criteriaLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  criteriaDesc: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },

  starPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  starTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starHint: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: spacing.xs,
  },

  commentSection: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  optionalTag: { fontSize: fontSize.sm, fontWeight: '400', color: colors.textMuted },
  textarea: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: spacing.lg,
    fontSize: fontSize.base,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 110,
    lineHeight: 24,
    ...shadow.sm,
  },

  submitHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#D97706',
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    ...shadow.md,
  },
  submitBtnDisabled: { backgroundColor: colors.bgMuted },
  submitBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  submitBtnTextDisabled: { color: colors.textMuted },
})
