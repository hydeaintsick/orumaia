import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

// import Colors from '@/constants/Colors'; // Using custom theme instead
// import { useColorScheme } from '@/components/useColorScheme'; // Potentially remove if not directly used for Colors
import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import theme from '../../../src/styles/theme'; // Import custom theme, path is from app/(tabs)

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  // const colorScheme = useColorScheme(); // Kept for now, but tint is directly from theme

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary, // Use theme color
        tabBarInactiveTintColor: theme.colors.lightText, // Use theme color
        tabBarStyle: {
          backgroundColor: theme.colors.cardBackground, // Use theme color for tab bar background
          borderTopColor: theme.colors.borderColor,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontSizes.small,
        },
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        // TODO: Potential for advanced animation: Custom tab bar icon animations on focus/blur using Reanimated or Lottie.
        // Example: Icon could scale, rotate, or switch to a different Lottie animation.
      }}>
      <Tabs.Screen
        name="index" // This now correctly points to app/(tabs)/index.tsx
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings" // This will look for app/(tabs)/settings.tsx
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
