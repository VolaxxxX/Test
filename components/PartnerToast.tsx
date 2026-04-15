import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Easing } from 'react-native';
import { useColors } from '@/lib/useColors';

interface Props {
  visible: boolean;
  name: string;
  emoji: string;
  poopEmoji?: string;
  language?: string;
}

export function PartnerToast({ visible, name, emoji, poopEmoji = '💩', language = 'fr' }: Props) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : -100,
        duration: 380,
        easing: visible ? Easing.out(Easing.back(1.3)) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: colors.primaryLight, transform: [{ translateY }], opacity },
      ]}
    >
      <Text style={[styles.text, { color: colors.secondary }]}>
        {poopEmoji} {emoji} {name}{' '}
        {language === 'fr' ? 'est aux toilettes !' : 'is on the toilet!'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 8,
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  text: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
