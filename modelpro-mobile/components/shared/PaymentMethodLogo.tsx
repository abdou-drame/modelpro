import { View, Text, StyleSheet, Image } from 'react-native'
import { Banknote, Smartphone, Zap } from 'lucide-react-native'
import { colors } from '@/constants/theme'
import type { PaymentMethod } from '@/constants/enums'

interface PaymentMethodLogoProps {
  method: PaymentMethod | string
  size?: number
}

// Images / Logos officiels des moyens de paiement au Sénégal
const LOGO_URLS: Partial<Record<PaymentMethod, string>> = {
  wave: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Wave_logo.svg/320px-Wave_logo.svg.png',
  orange_money: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/320px-Orange_logo.svg.png',
  free_money: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Free_logo.svg/320px-Free_logo.svg.png',
}

export function PaymentMethodLogo({ method, size = 44 }: PaymentMethodLogoProps) {
  if (method === 'wave') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#1DC4FF' }]}>
        <Image
          source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Wave_Logo.png/320px-Wave_Logo.png' }}
          style={{ width: size * 0.7, height: size * 0.7, borderRadius: 4 }}
          resizeMode="contain"
          defaultSource={{ uri: LOGO_URLS.wave }}
        />
      </View>
    )
  }

  if (method === 'orange_money') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#FF6600' }]}>
        <View style={styles.omBadge}>
          <Text style={[styles.omText, { fontSize: size * 0.32 }]}>om</Text>
        </View>
      </View>
    )
  }

  if (method === 'free_money') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#E2001A' }]}>
        <Text style={[styles.freeText, { fontSize: size * 0.35 }]}>free</Text>
      </View>
    )
  }

  // Espèces / Cash
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#10B981' }]}>
      <Banknote size={size * 0.55} color="#FFFFFF" strokeWidth={2} />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  omBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  omText: {
    color: '#FF6600',
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  freeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
})
