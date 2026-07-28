import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="index" options={{ title: 'Курсы' }} />
      <Tabs.Screen name="articles" options={{ title: 'Статьи' }} />
      <Tabs.Screen name="chats" options={{ title: 'Чаты' }} />
      <Tabs.Screen name="profile" options={{ title: 'Профиль' }} />
    </Tabs>
  );
}
