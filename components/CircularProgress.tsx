import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  percent: number;      // 0–100
  size?: number;
  fillColor: string;
  bgColor: string;
  centerValue: string;
  centerLabel?: string;
  labelColor?: string;
}

const TOTAL_DOTS = 60;

/**
 * Dot-ring circular progress.
 * 60 dots arranged in a circle — reliable on both iOS and Android,
 * no overflow/clip issues.
 */
export function CircularProgress({
  percent,
  size = 110,
  fillColor,
  bgColor,
  centerValue,
  centerLabel,
  labelColor,
}: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const dotSize = Math.max(5, Math.round(size * 0.075));
  const radius = size / 2 - dotSize / 2 - 1;
  const filledDots = Math.round((p / 100) * TOTAL_DOTS);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: TOTAL_DOTS }, (_, i) => {
        const angle = (i / TOTAL_DOTS) * 2 * Math.PI - Math.PI / 2; // top = 0
        const x = size / 2 + radius * Math.cos(angle) - dotSize / 2;
        const y = size / 2 + radius * Math.sin(angle) - dotSize / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: i < filledDots ? fillColor : bgColor,
            }}
          />
        );
      })}

      <Text style={{ fontSize: size * 0.145, fontWeight: '800', color: labelColor ?? fillColor, textAlign: 'center' }}>
        {centerValue}
      </Text>
      {centerLabel ? (
        <Text style={{ fontSize: size * 0.079, color: labelColor ?? fillColor, opacity: 0.65, textAlign: 'center', maxWidth: size * 0.58 }}>
          {centerLabel}
        </Text>
      ) : null}
    </View>
  );
}
