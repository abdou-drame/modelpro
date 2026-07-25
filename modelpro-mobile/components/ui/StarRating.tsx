import { View } from 'react-native'
import { Star } from 'lucide-react-native'
import { colors } from '@/constants/theme'

interface Props {
  value: number
  size?: number
  max?: number
}

export function StarRating({ value, size = 14, max = 5 }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          color={colors.primary}
          fill={i < Math.round(value) ? colors.primary : 'transparent'}
          strokeWidth={1.5}
        />
      ))}
    </View>
  )
}
