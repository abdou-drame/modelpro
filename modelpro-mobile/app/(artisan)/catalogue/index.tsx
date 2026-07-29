import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Plus, Pencil, Trash2, Scissors, Eye, EyeOff } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { artisanApi } from '@/lib/api/artisan'
import { formatPrice } from '@/lib/utils/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { colors, spacing, fontSize, radius, shadow } from '@/constants/theme'
import type { MyModel } from '@/lib/api/artisan'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'

function ModelItem({ model, onEdit, onDelete, index }: {
  model: MyModel; onEdit: () => void; onDelete: () => void; index: number
}) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()} style={styles.card}>
      <Image
        source={{ uri: model.photoUrl ?? PLACEHOLDER }}
        style={styles.cardImage}
        resizeMode="cover"
        accessibilityLabel={`Photo du modèle ${model.titre}`}
      />
      <LinearGradient
        colors={['transparent', 'rgba(26,16,5,0.82)']}
        style={styles.cardGradient}
      />

      {/* Availability pill */}
      <View style={[styles.availBadge, !model.disponible && styles.availBadgeOff]}>
        {model.disponible
          ? <Eye size={11} color={colors.success} strokeWidth={2.5} />
          : <EyeOff size={11} color={colors.textMuted} strokeWidth={2.5} />
        }
        <Text style={[styles.availText, !model.disponible && styles.availTextOff]}>
          {model.disponible ? 'Visible' : 'Masqué'}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{model.titre}</Text>
          {model.prixEstimatif != null && (
            <Text style={styles.cardPrice}>{formatPrice(model.prixEstimatif)}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`Modifier ${model.titre}`}
          >
            <Pencil size={14} color={colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDelete]}
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Supprimer ${model.titre}`}
          >
            <Trash2 size={14} color={colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )
}

export default function ArtisanCatalogueScreen() {
  const queryClient = useQueryClient()

  const { data: models, isLoading } = useQuery({
    queryKey: ['my-models'],
    queryFn: () => artisanApi.myModels().then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => artisanApi.deleteModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-models'] }),
  })

  const handleDelete = (model: MyModel) => {
    Alert.alert(
      'Supprimer le modèle',
      `Supprimer "${model.titre}" ? Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(model.id) },
      ]
    )
  }

  const visibleCount = (models ?? []).filter((m) => m.disponible).length
  const totalCount = models?.length ?? 0

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Mon catalogue</Text>
          <Text style={styles.count}>{totalCount} modèle{totalCount !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(artisan)/catalogue/new')}
          accessibilityRole="button"
          accessibilityLabel="Ajouter un nouveau modèle"
        >
          <Plus size={22} color={colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {totalCount > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <View style={[styles.statDot, { backgroundColor: colors.success }]} />
            <Text style={styles.statText}>{visibleCount} visible{visibleCount !== 1 ? 's' : ''}</Text>
          </View>
          {totalCount - visibleCount > 0 && (
            <View style={styles.statChip}>
              <View style={[styles.statDot, { backgroundColor: colors.textMuted }]} />
              <Text style={styles.statText}>{totalCount - visibleCount} masqué{totalCount - visibleCount !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      )}

      <FlashList
        data={models ?? []}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        estimatedItemSize={240}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => (
          <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
            <ModelItem
              model={item}
              index={index}
              onEdit={() => router.push(`/(artisan)/catalogue/${item.id}/edit`)}
              onDelete={() => handleDelete(item)}
            />
          </View>
        )}
        ListHeaderComponent={isLoading ? <SkeletonList count={4} type="model" /> : null}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon={<Scissors size={36} color={colors.textMuted} strokeWidth={1.5} />}
              title="Catalogue vide"
              subtitle="Ajoutez votre premier modèle pour le rendre visible aux clients"
              action={{ label: 'Ajouter un modèle', onPress: () => router.push('/(artisan)/catalogue/new') }}
            />
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 52,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: { gap: 2 },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  count: { fontSize: fontSize.sm, color: colors.textMuted },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.bgMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  statDot: { width: 7, height: 7, borderRadius: radius.full },
  statText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textSub },

  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E2D9',
    ...shadow.md,
  },
  cardImage: { width: '100%', aspectRatio: 1 },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },

  availBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availBadgeOff: { backgroundColor: 'rgba(0,0,0,0.4)' },
  availText: { fontSize: 10, fontWeight: '700', color: colors.success },
  availTextOff: { color: 'rgba(255,255,255,0.7)' },

  cardBody: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white, lineHeight: 18 },
  cardPrice: { fontSize: fontSize.xs, color: colors.primaryLight, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDelete: { backgroundColor: 'rgba(193,18,31,0.6)' },
})
