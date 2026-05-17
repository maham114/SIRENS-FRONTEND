import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

export function StepFrame({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={[styles.container, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
