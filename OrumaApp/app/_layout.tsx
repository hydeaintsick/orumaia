import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import theme from '../src/styles/theme'; // Import custom theme

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme(); // Keep this for now, could integrate with custom theme later
  const navigationTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary, // Use theme color for header
          },
          headerTintColor: theme.colors.buttonText, // Use theme color for header text/icons
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: theme.fontSizes.large,
          },
          contentStyle: {
            backgroundColor: theme.colors.background, // Apply global background
          },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerStyle: { backgroundColor: theme.colors.secondary }, // Different header for modal
            headerTintColor: theme.colors.text,
          }}
        />
        {/* Default options for contact detail screen if not specified in [id].tsx */}
        <Stack.Screen
          name="contact/[id]"
          options={{
            title: "Contact Details", // Default title
            headerBackTitle: "Back",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
