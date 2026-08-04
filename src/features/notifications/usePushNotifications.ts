import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter, type Router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthContext';

import { getActiveChat } from './activeChat';
import { fetchCourseSlugById, savePushToken } from './api';

// Foreground display policy: suppress a chat notification for the chat that's
// already open; otherwise show a banner.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { type?: string; chatId?: string };
    const suppressed =
      data?.type === 'chat_message' && !!data.chatId && data.chatId === getActiveChat();
    return {
      shouldShowBanner: !suppressed,
      shouldShowList: !suppressed,
      shouldPlaySound: !suppressed,
      shouldSetBadge: false,
    };
  },
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // push works only on physical devices

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    // Available only in a dev/production build (not Expo Go without EAS config).
    console.warn('No EAS projectId — push token unavailable until a dev build.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

async function handleDeepLink(data: unknown, router: Router) {
  if (!data || typeof data !== 'object') return;
  const payload = data as {
    type?: string;
    chatId?: string;
    courseId?: string;
    slug?: string;
    clubId?: string;
    stream_id?: string;
  };
  if (payload.type === 'chat_message' && payload.chatId) {
    router.push(`/chat/${payload.chatId}`);
  } else if (payload.type === 'course_purchase' && payload.courseId) {
    try {
      const slug = await fetchCourseSlugById(String(payload.courseId));
      if (slug) router.push(`/course/${slug}`);
    } catch {
      // ignore — the notification just won't deep-link
    }
  } else if (payload.type === 'new_course' && payload.slug) {
    router.push(`/course/${payload.slug}`);
  } else if (payload.type === 'new_article' && payload.slug) {
    router.push(`/article/${payload.slug}`);
  } else if (payload.type === 'club_post' && payload.clubId) {
    router.push(`/club/${payload.clubId}`);
  } else if (payload.type === 'club_chat' && payload.clubId) {
    router.push(`/club/${payload.clubId}?tab=chat`);
  } else if (payload.type === 'live_started' && payload.stream_id) {
    router.push(`/streams/${payload.stream_id}`);
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();

  // Register the device token whenever a user is signed in.
  useEffect(() => {
    if (!user) return;
    registerForPushNotificationsAsync()
      .then((token) => (token ? savePushToken(user.id, token) : undefined))
      .catch((e) => console.warn('push token registration failed', e));
  }, [user]);

  // Deep-link on notification tap (running app) and on cold start.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleDeepLink(response.notification.request.content.data, router);
    });
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleDeepLink(response.notification.request.content.data, router);
    });
    return () => sub.remove();
  }, [router]);
}
