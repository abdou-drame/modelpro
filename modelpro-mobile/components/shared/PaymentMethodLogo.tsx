import { View, Text, StyleSheet } from 'react-native'
import { Banknote } from 'lucide-react-native'
import type { PaymentMethod } from '@/constants/enums'

interface PaymentMethodLogoProps {
  method: PaymentMethod | string
  size?: number
}

// Badges dessinés localement (pas d'image distante) pour les moyens de paiement
// mobile money sénégalais — garantit un rendu correct même hors-ligne, et évite
// tout risque de logo erroné (ex. confondre Free FAI français avec Free Money Sénégal).
export function PaymentMethodLogo({ method, size = 44 }: PaymentMethodLogoProps) {
  if (method === 'wave') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#1DC8FF' }]}>
        <Text style={[styles.waveText, { fontSize: size * 0.26 }]}>wave</Text>
      </View>
    )
  }

  if (method === 'orange_money') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#FF7900' }]}>
        <Text style={[styles.omOrange, { fontSize: size * 0.24 }]}>orange</Text>
        <Text style={[styles.omMoney, { fontSize: size * 0.16 }]}>money</Text>
      </View>
    )
  }

  if (method === 'free_money') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#CE0500' }]}>
        <Text style={[styles.freeText, { fontSize: size * 0.28 }]}>free</Text>
        <Text style={[styles.freeMoney, { fontSize: size * 0.14 }]}>MONEY</Text>
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
  waveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  omOrange: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  omMoney: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: -1,
  },
  freeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.4,
  },
  freeMoney: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: -1,
  },
})
