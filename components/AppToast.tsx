import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type ToastType = "success" | "error" | "info";

interface Props {
  visible: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
  bottom?: number;
}

export function AppToast({
  visible,
  message,
  type = "info",
  onClose,
  duration = 1500,
  bottom = 42,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 6,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => onCloseRef.current());
    }, duration);

    return () => clearTimeout(t);
  }, [duration, message, opacity, translateY, type, visible]);

  if (!visible) return null;

  const iconName =
    type === "success"
      ? "checkmark-circle"
      : type === "error"
        ? "alert-circle"
        : "information-circle";
  const iconColor =
    type === "success" ? "#d7ffdc" : type === "error" ? "#ffd8d8" : "#dce9ff";

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom, opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.card}>
        <Ionicons name={iconName} size={15} color={iconColor} />
        <Text style={styles.text} numberOfLines={1}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  card: {
    maxWidth: "82%",
    borderRadius: 999,
    backgroundColor: "rgba(20,20,20,0.92)",
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
