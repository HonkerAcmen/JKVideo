import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { useDownloadStore } from "../store/downloadStore";
import { useSettingsStore } from "../store/settingsStore";
import { useFollowingStore } from "../store/followingStore";
import { MiniPlayer } from "../components/MiniPlayer";
import * as Sentry from "@sentry/react-native";
import { ErrorBoundary } from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  enabled: !__DEV__,
  tracesSampleRate: 0.05,
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? "production",
});

function RootLayout() {
  const restore = useAuthStore((s) => s.restore);
  const loadDownloads = useDownloadStore((s) => s.loadFromStorage);
  const restoreSettings = useSettingsStore((s) => s.restore);
  const restoreFollowing = useFollowingStore((s) => s.restore);

  useEffect(() => {
    restore();
    loadDownloads();
    restoreSettings();
    restoreFollowing();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <ErrorBoundary
          fallback={
            <Text style={{ padding: 32, textAlign: "center" }}>
              发生错误，请重启 App
            </Text>
          }
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="video"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="live"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
              }}
            />
            <Stack.Screen
              name="downloads"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="settings"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="me"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="favorites"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="following"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <Stack.Screen
              name="user/[mid]"
              options={{
                animation: "slide_from_right",
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
          </Stack>
        </ErrorBoundary>
        <MiniPlayer />
      </View>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
