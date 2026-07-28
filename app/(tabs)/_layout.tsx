import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

type IoniconName = keyof typeof Ionicons.glyphMap;

function NewChatButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/chat/new')}
      hitSlop={12}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="create-outline" size={24} color="#2563eb" />
    </Pressable>
  );
}

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true, tabBarActiveTintColor: '#2563eb' }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Курсы', tabBarIcon: tabIcon('school', 'school-outline') }}
      />
      <Tabs.Screen
        name="articles"
        options={{ title: 'Статьи', tabBarIcon: tabIcon('newspaper', 'newspaper-outline') }}
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
