import {
  View, Text, Image, TouchableOpacity, StyleSheet, Alert,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { router } from 'expo-router'
import { Plus, Pencil, Trash2, Scissors } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { artisanApi } from '@/lib/api/artisan'
import { formatPrice } from '@/lib/utils/format'
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
      />
      <LinearGradient
        colors={['transparent', 'rgba(26,26,46,0.7)']}
        style={styles.cardGradient}
      />
      {!model.disponible && (
        <View style={styles.unavailableBadge}>
          <Text style={styles.unavailableText}>Indisponible</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>{model.titre}</Text>
          {model.prixEstimatif != null && (
            <Text style={styles.cardPrice}>{formatPrice(model.prixEstimatif)}</Text>
          )}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <Pencil size={15} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDelete]} onPress={onDelete}>
            <Trash2 size={15} color={colors.white} strokeWidth={2} />
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mon catalogue</Text>
          <Text style={styles.count}>{models?.length ?? 0} modèle{(models?.length ?? 0) > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/(artisan)/catalogue/new')}
        >
          <Plus size={22} color={colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <FlashList
        data={models ?? []}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        estimatedItemSize={200}
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
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Scissors size={48} color={colors.border} strokeWidth={1.5} />
              <Text style={styles.emptyTitle}>Catalogue vide</Text>
              <Text style={styles.emptySub}>Ajoutez votre premier modèle pour commencer</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(artisan)/catalogue/new')}
              >
                <Plus size={18} color={colors.white} strokeWidth={2.5} />
                <Text style={styles.emptyBtnText}>Ajouter un modèle</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 52, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  count: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },
  card: {
    borderRadius: radius.xl, overflow: 'hidden',
    backgroundColor: colors.accent, ...shadow.md,
  },
  cardImage: { width: '100%', aspectRatio: 3 / 4 },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  unavailableBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  unavailableText: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  cardBody: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  cardPrice: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: {
    width: 30, height: 30, borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDelete: { backgroundColor: 'rgba(193,18,31,0.7)' },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  emptySub: { fontSize: fontSize.md, color: colors.textSub, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  emptyBtnText: { color: colors.white, fontWeight: '600', fontSize: fontSize.base },
})
