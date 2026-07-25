import { View, Text } from 'react-native'

export default function ArtisanAppointmentsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F4EF', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A2E' }}>Rendez-vous</Text>
      <Text style={{ color: '#6B7280', marginTop: 8 }}>Phase 4 — bientôt disponible</Text>
    </View>
  )
}
