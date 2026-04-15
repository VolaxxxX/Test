import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';
import type { TextStyle } from 'react-native';

interface Props {
  value: number;
  style?: TextStyle | TextStyle[];
  duration?: number;
  decimals?: number;
  suffix?: string;
}

export function AnimatedNumber({ value, style, duration = 900, decimals = 0, suffix = '' }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplayed(v));
    Animated.timing(anim, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
  }, [value]);

  return (
    <Text style={style}>
      {displayed.toFixed(decimals)}{suffix}
    </Text>
  );
}
