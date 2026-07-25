import { View, Text } from 'react-native'

export default function ArtisanMessagesScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F4EF', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A2E' }}>Messages</Text>
      <Text style={{ color: '#6B7280', marginTop: 8 }}>Phase 3 — bientôt disponible</Text>
    </View>
  )
}
