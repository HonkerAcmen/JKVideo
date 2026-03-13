import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

const BAR_COUNT = 3;
const BAR_HEIGHT = 8;

export function LivePulse() {
  const anims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={pulseStyles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            pulseStyles.bar,
            {
              transform: [{ scaleY: anim }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export const pulseStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: BAR_HEIGHT,
    gap: 1,
  },
  bar: {
    width: 2,
    height: BAR_HEIGHT,
    backgroundColor: "#fff",
    borderRadius: 1,
  },
});
