import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { useState } from 'react'
import { ArrowLeft, Star } from 'lucide-react-native'
import { reviewsApi } from '@/lib/api/reviews'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'

const CRITERIA: { key: keyof Omit<Scores, 'commentaire'>; label: string; desc: string }[] = [
  { key: 'noteQualite', label: 'Qualité', desc: 'Finition, matières, soin du travail' },
  { key: 'noteDelai', label: 'Délai', desc: 'Respect de la date de livraison' },
  { key: 'noteCommunication', label: 'Communication', desc: 'Réactivité et clarté des échanges' },
  { key: 'notePrix', label: 'Rapport qualité/prix', desc: 'Adéquation prix et prestation' },
  { key: 'noteProfessionnalisme', label: 'Professionnalisme', desc: 'Sérieux et savoir-faire' },
]

interface Scores {
  noteQualite: number
  noteDelai: number
  noteCommunication: number
  notePrix: number
  noteProfessionnalisme: number
  commentaire: string
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <Star
            size={30}
            color={n <= value ? '#F59E0B' : colors.border}
            fill={n <= value ? '#F59E0B' : 'transparent'}
            strokeWidth={1.5}
          />
        </TouchableOpacity>
      ))}
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

  const avgScore = scores.noteQualite && scores.noteDelai && scores.noteCommunication && scores.notePrix && scores.noteProfessionnalisme
    ? ((scores.noteQualite + scores.noteDelai + scores.noteCommunication + scores.notePrix + scores.noteProfessionnalisme) / 5).toFixed(1)
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
      Alert.alert('Erreur', 'Impossible de soumettre l\'avis. Vérifiez que la commande est bien livrée.')
    },
  })

  const canSubmit = CRITERIA.every((c) => scores[c.key] > 0)

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Donner un avis</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(60).springify()} style={styles.header}>
            <Text style={styles.artisanName}>{artisanName}</Text>
            {avgScore && (
              <View style={styles.avgRow}>
                <Star size={20} color="#F59E0B" fill="#F59E0B" strokeWidth={1.5} />
                <Text style={styles.avgScore}>{avgScore} / 5</Text>
              </View>
            )}
          </Animated.View>

          {/* Critères */}
          {CRITERIA.map((c, i) => (
            <Animated.View
              key={c.key}
              entering={FadeInUp.delay(100 + i * 60).springify()}
              style={styles.criteriaCard}
            >
              <View style={styles.criteriaHead}>
                <Text style={styles.criteriaLabel}>{c.label}</Text>
                <Text style={styles.criteriaDesc}>{c.desc}</Text>
              </View>
              <StarPicker
                value={scores[c.key]}
                onChange={(v) => setScores((prev) => ({ ...prev, [c.key]: v }))}
              />
            </Animated.View>
          ))}

          {/* Commentaire */}
          <Animated.View entering={FadeInUp.delay(440).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Commentaire (optionnel)</Text>
            <TextInput
              style={styles.textarea}
              value={scores.commentaire}
              onChangeText={(v) => setScores((prev) => ({ ...prev, commentaire: v }))}
              placeholder="Partagez votre expérience avec cet artisan..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(500).springify()}>
            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={!canSubmit || mutation.isPending}
            >
              <Star size={18} color={colors.white} fill={canSubmit ? colors.white : 'transparent'} strokeWidth={2} />
              <Text style={styles.submitBtnText}>
                {mutation.isPending ? 'Envoi...' : 'Publier mon avis'}
              </Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 60 },
  header: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  artisanName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, textAlign: 'center' },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  avgScore: { fontSize: fontSize.lg, fontWeight: '700', color: '#F59E0B' },
  criteriaCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.xl,
    padding: spacing.lg, gap: spacing.md, ...shadow.sm,
  },
  criteriaHead: { gap: 3 },
  criteriaLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  criteriaDesc: { fontSize: fontSize.xs, color: colors.textMuted },
  stars: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  textarea: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, fontSize: fontSize.base, color: colors.text,
    borderWidth: 1.5, borderColor: colors.border, minHeight: 100, ...shadow.sm,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: '#F59E0B', borderRadius: radius.xl, padding: spacing.lg, ...shadow.md,
  },
  submitBtnDisabled: { backgroundColor: colors.border },
  submitBtnText: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
})
