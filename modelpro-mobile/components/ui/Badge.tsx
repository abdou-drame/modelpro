import { View, Text } from 'react-native'
import { colors, radius, fontSize } from '@/constants/theme'

interface Props {
  label: string
  variant?: 'primary' | 'success' | 'error' | 'warning' | 'neutral'
  size?: 'sm' | 'md'
}

const variants = {
  primary: { bg: `${colors.accent}20`, text: colors.primary },
  success: { bg: colors.successBg, text: colors.success },
  error: { bg: colors.errorBg, text: colors.error },
  warning: { bg: colors.warningBg, text: colors.warning },
  neutral: { bg: colors.bgMuted, text: colors.textSecondary },
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
        paddingHorizontal: size === 'sm' ? 10 : 14,
        paddingVertical: size === 'sm' ? 4 : 6,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontSize: size === 'sm' ? fontSize.xs : fontSize.sm,
          fontWeight: '600',
          color: v.text,
        }}
      >
        {label}
      </Text>
    </View>
  )
}
