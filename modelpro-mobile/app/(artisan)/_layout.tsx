import { Tabs } from 'expo-router'
import { LayoutDashboard, ShoppingBag, Scissors, Calendar, MessageCircle } from 'lucide-react-native'

export default function ArtisanLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C9762B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F3F4F6',
          paddingBottom: 8,
          height: 60,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: 'Commandes',
          tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="catalogue/index"
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ color }) => <Scissors size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments/index"
        options={{
          title: 'Rendez-vous',
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} />,
        }}
      />
    </Tabs>
  )
}
