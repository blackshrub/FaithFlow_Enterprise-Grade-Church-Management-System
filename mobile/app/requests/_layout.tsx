/**
 * Requests Layout - Shared navigation for request forms
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function RequestsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="accept-jesus" />
      <Stack.Screen name="baptism" />
      <Stack.Screen name="child-dedication" />
      <Stack.Screen name="holy-matrimony" />
    </Stack>
  );
}
