import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { MiniPlayer } from '../components/MiniPlayer';

export default function RootLayout() {
  const restore = useAuthStore(s => s.restore);

  useEffect(() => {
    restore();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
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
        </Stack>
        <MiniPlayer />
      </View>
    </SafeAreaProvider>
  );
}
