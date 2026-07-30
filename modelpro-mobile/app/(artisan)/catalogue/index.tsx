import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeInUp } from 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { router } from 'expo-router'
import { Plus, Pencil, Trash2, Scissors, Eye, EyeOff } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { artisanApi } from '@/lib/api/artisan'
import { formatPrice } from '@/lib/utils/format'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/SkeletonCard'
import { colors, spacing, fontSize, radius, shadow, fontFamily } from '@/constants/theme'
import type { MyModel } from '@/lib/api/artisan'

const PLACEHOLDER = 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&q=80'

function ModelItem({ model, onEdit, onDelete, index }: { model: MyModel; onEdit: () => void; onDelete: () => void; index: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 40, 200)).duration(400)} style={styles.card}>
      <Image source={{ uri: model.photoUrl ?? PLACEHOLDER }} style={styles.cardImage} resizeMode="cover" />
      <LinearGradient colors={['transparent', 'rgba(26,17,12,0.8)']} style={styles.cardGradient} />

      <View style={[styles.availBadge, !model.disponible && styles.availBadgeOff]}>
        {model.disponible ? <Eye size={10} color={colors.success} strokeWidth={2} /> : <EyeOff size={10} color={colors.white} strokeWidth={2} />}
        <Text style={[styles.availText, !model.disponible && styles.availTextOff]}>{model.disponible ? 'Visible' : 'Masqué'}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{model.titre}</Text>
          {model.prixEstimatif != null && <Text style={styles.cardPrice}>{formatPrice(model.prixEstimatif)}</Text>}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
            <Pencil size={14} color={colors.white} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDel]} onPress={onDelete}>
            <Trash2 size={14} color={colors.white} strokeWidth={2} />
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
    Alert.alert('Supprimer', `Supprimer "${model.titre}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(model.id) },
    ])
  }

  const total = models?.length ?? 0
  const visible = (models ?? []).filter((m) => m.disponible).length

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mon catalogue</Text>
          <Text style={styles.subtitle}>{total} modèle{total !== 1 ? 's' : ''} • {visible} visible{visible !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(artisan)/catalogue/new')}>
          <Plus size={22} color={colors.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <FlashList
        data={models ?? []}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item, index }) => (
          <View style={{ flex: 1, paddingHorizontal: spacing.xs }}>
            <ModelItem model={item} index={index} onEdit={() => router.push(`/(artisan)/catalogue/${item.id}/edit`)} onDelete={() => handleDelete(item)} />
          </View>
        )}
        ListHeaderComponent={isLoading ? <SkeletonList count={4} type="model" /> : null}
        ListEmptyComponent={isLoading ? null : (
          <EmptyState icon={<Scissors size={40} color={colors.textLight} strokeWidth={1.5} />} title="Catalogue vide" subtitle="Ajoutez votre premier modèle" action={{ label: 'Ajouter', onPress: () => router.push('/(artisan)/catalogue/new') }} />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, fontFamily: fontFamily.serif },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...shadow.sm },

  card: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  cardImage: { width: '100%', aspectRatio: 1 },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },

  availBadge: { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  availBadgeOff: { backgroundColor: 'rgba(0,0,0,0.5)' },
  availText: { fontSize: 10, fontWeight: '600', color: colors.success },
  availTextOff: { color: colors.white },

  cardBody: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end', padding: spacing.md, gap: spacing.sm },
  cardTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.white, lineHeight: 18 },
  cardPrice: { fontSize: fontSize.xs, fontWeight: '600', color: colors.accentLight, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  actionBtnDel: { backgroundColor: 'rgba(155,44,44,0.7)' },
})
