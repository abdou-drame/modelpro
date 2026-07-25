import { Tabs } from 'expo-router'
import { LayoutDashboard, ShoppingBag, Scissors, Calendar, MessageCircle, UserCircle } from 'lucide-react-native'
import { BlurView } from 'expo-blur'
import { StyleSheet } from 'react-native'
import { colors } from '@/constants/theme'

function TabBarBackground() {
  return <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
}

export default function ArtisanLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="orders/index"
        options={{
          title: 'Commandes',
          tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="catalogue/index"
        options={{
          title: 'Catalogue',
          tabBarIcon: ({ color }) => <Scissors size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="appointments/index"
        options={{
          title: 'Rendez-vous',
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <MessageCircle size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <UserCircle size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="catalogue/new" options={{ href: null }} />
      <Tabs.Screen name="catalogue/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="messages/[orderId]" options={{ href: null }} />
    </Tabs>
  )
}
