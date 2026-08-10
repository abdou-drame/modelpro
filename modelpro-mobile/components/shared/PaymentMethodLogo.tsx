import { View, Text, StyleSheet } from 'react-native'
import Svg, { Path, Circle, Ellipse } from 'react-native-svg'
import { Banknote } from 'lucide-react-native'
import type { PaymentMethod } from '@/constants/enums'

interface PaymentMethodLogoProps {
  method: PaymentMethod | string
  size?: number
}

// Wave et Orange Money sont reconstruits en SVG vectoriel pour reproduire fidèlement
// leurs vrais logos (mascotte pingouin Wave, flèches d'échange Orange Money) — rendu
// net à toute taille, garanti hors-ligne, sans dépendre d'une image distante.
export function PaymentMethodLogo({ method, size = 44 }: PaymentMethodLogoProps) {
  if (method === 'wave') {
    return (
      <View style={[styles.badge, { width: size, height: size, borderRadius: size * 0.28, backgroundColor: '#1DC8FF' }]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Bras qui salue */}
          <Path d="M42 62 C 29 60 22 51 20 34" stroke="#0A0A0A" strokeWidth={13} strokeLinecap="round" fill="none" />
          {/* Corps + tête */}
          <Path
            d="M50 20 C 37 20 29 31 29 46 L 29 75 C 29 85 38 92 50 92 C 62 92 71 85 71 75 L 71 46 C 71 31 63 20 50 20 Z"
            fill="#0A0A0A"
          />
          {/* Pieds */}
          <Ellipse cx="41" cy="91" rx="7.5" ry="4.5" fill="#FF8A00" />
          <Ellipse cx="59" cy="91" rx="7.5" ry="4.5" fill="#FF8A00" />
          {/* Ventre */}
          <Ellipse cx="50" cy="68" rx="15" ry="20" fill="#FFFFFF" />
          {/* Yeux */}
          <Circle cx="43" cy="35" r="3.4" fill="#FFFFFF" />
          <Circle cx="58" cy="35" r="3.4" fill="#FFFFFF" />
          {/* Bec */}
          <Ellipse cx="50.5" cy="42" rx="8" ry="4" fill="#FF8A00" />
        </Svg>
      </View>
    )
  }

  if (method === 'orange_money') {
    return (
      <View style={[styles.badge, styles.omBadge, { width: size, height: size, borderRadius: size * 0.28 }]}>
        <Svg width={size * 0.6} height={size * 0.32} viewBox="0 0 100 55">
          {/* Flèche noire (envoi) */}
          <Path d="M18 38 L36 18" stroke="#111111" strokeWidth={10} strokeLinecap="round" />
          <Path d="M26 18 L37 18 L37 29" stroke="#111111" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Flèche orange (réception) */}
          <Path d="M82 17 L64 37" stroke="#FF7900" strokeWidth={10} strokeLinecap="round" />
          <Path d="M74 37 L63 37 L63 26" stroke="#FF7900" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
        <Text style={[styles.omOrange, { fontSize: size * 0.2 }]}>Orange</Text>
        <Text style={[styles.omMoney, { fontSize: size * 0.15 }]}>Money</Text>
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
  omBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F0EAE0',
    gap: 1,
  },
  omOrange: {
    color: '#111111',
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  omMoney: {
    color: '#111111',
    fontWeight: '600',
    marginTop: -2,
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
