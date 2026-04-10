import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '@/constants/Colors';

interface Props {
  active: boolean;
  size?: number;
}

export function PoopAnimation({ active, size = 80 }: Props) {
  const bounce = useRef(new Animated.Value(0)).current;
  const squish = useRef(new Animated.Value(1)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      // Continuous bounce
      const bounceFx = Animated.loop(
        Animated.sequence([
          Animated.spring(bounce, { toValue: -14, useNativeDriver: true, tension: 80, friction: 5 }),
          Animated.spring(bounce, { toValue: 0, useNativeDriver: true, tension: 80, friction: 5 }),
        ])
      );
      // Squish on land
      const squishFx = Animated.loop(
        Animated.sequence([
          Animated.timing(squish, { toValue: 1.15, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(squish, { toValue: 0.88, duration: 120, useNativeDriver: true }),
          Animated.timing(squish, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );
      // Sparkles
      const sparkleFx = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
            Animated.delay(600),
          ])
        );
      // Glow pulse
      const glowFx = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ])
      );

      bounceFx.start();
      squishFx.start();
      sparkleFx(sparkle1, 0).start();
      sparkleFx(sparkle2, 300).start();
      sparkleFx(sparkle3, 600).start();
      glowFx.start();

      return () => {
        bounceFx.stop();
        squishFx.stop();
        bounce.setValue(0);
        squish.setValue(1);
        sparkle1.setValue(0);
        sparkle2.setValue(0);
        sparkle3.setValue(0);
        glow.setValue(0);
      };
    } else {
      bounce.setValue(0);
      squish.setValue(1);
      glow.setValue(0);
    }
  }, [active]);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.6] });

  return (
    <View style={[styles.wrapper, { width: size * 2, height: size * 2 }]}>
      {/* Glow ring */}
      {active && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: size * 1.4,
              height: size * 1.4,
              borderRadius: size * 0.7,
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
      )}

      {/* Sparkles */}
      {active && (
        <>
          <Animated.Text style={[styles.sparkle, { opacity: sparkle1, top: '5%', right: '18%', fontSize: size * 0.28 }]}>✨</Animated.Text>
          <Animated.Text style={[styles.sparkle, { opacity: sparkle2, top: '15%', left: '12%', fontSize: size * 0.22 }]}>💫</Animated.Text>
          <Animated.Text style={[styles.sparkle, { opacity: sparkle3, bottom: '20%', right: '10%', fontSize: size * 0.2 }]}>⭐</Animated.Text>
        </>
      )}

      {/* Poop emoji with bounce & squish */}
      <Animated.Text
        style={[
          styles.poop,
          {
            fontSize: size,
            transform: [
              { translateY: bounce },
              { scaleX: active ? squish.interpolate({ inputRange: [0.88, 1, 1.15], outputRange: [1.12, 1, 0.9] }) : 1 },
              { scaleY: squish },
            ],
          },
        ]}
      >
        💩
      </Animated.Text>

      {/* Steam / smell lines when active */}
      {active && (
        <View style={styles.steamRow}>
          <Text style={[styles.steam, { marginRight: 6 }]}>💨</Text>
          <Text style={styles.steam}>🌫️</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    backgroundColor: Colors.accent,
  },
  poop: { zIndex: 2 },
  sparkle: { position: 'absolute', zIndex: 3 },
  steamRow: {
    flexDirection: 'row',
    marginTop: 4,
    zIndex: 3,
  },
  steam: { fontSize: 18, opacity: 0.7 },
});
