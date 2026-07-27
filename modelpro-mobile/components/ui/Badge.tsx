import { View, Text } from 'react-native'
import { colors, radius, fontSize } from '@/constants/theme'

interface Props {
  label: string
  variant?: 'primary' | 'success' | 'error' | 'warning' | 'neutral'
  size?: 'sm' | 'md'
}

const variants = {
  primary: { bg: '#F5E6D8', text: colors.primary },
  success: { bg: colors.successLight, text: colors.success },
  error: { bg: colors.errorLight, text: colors.error },
  warning: { bg: colors.warningLight, text: colors.warning },
  neutral: { bg: colors.bgMuted, text: colors.textSub },
}

export function Badge({ label, variant = 'neutral', size = 'sm' }: Props) {
  const v = variants[variant]
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        backgroundColor: v.bg,
        borderRadius: radius.full,
        paddingHorizontal: size === 'sm' ? 8 : 12,
        paddingVertical: size === 'sm' ? 3 : 5,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
          fontWeight: '600',
          color: v.text,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  )
}
