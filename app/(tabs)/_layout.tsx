import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

function NewChatButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/chat/new')}
      hitSlop={12}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="create-outline" size={24} color={colors.primary} />
    </Pressable>
  );
}

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  // Edge-to-edge (Expo SDK 54) draws behind the Android system nav bar, so the tab bar
  // must reserve the bottom safe-area inset or the system buttons overlap the tabs.
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.hairline,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
        },
        headerStyle: { backgroundColor: colors.card, shadowColor: 'transparent', elevation: 0 },
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Курсы', tabBarIcon: tabIcon('school', 'school-outline') }}
      />
      <Tabs.Screen
        name="articles"
        options={{ title: 'Статьи', tabBarIcon: tabIcon('newspaper', 'newspaper-outline') }}
      />
      <Tabs.Screen
        name="people"
        options={{ title: 'Люди', tabBarIcon: tabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Чаты',
          tabBarIcon: tabIcon('chatbubble-ellipses', 'chatbubble-ellipses-outline'),
          headerRight: () => <NewChatButton />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Профиль', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
