import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  percent: number;      // 0–100
  size?: number;
  thickness?: number;
  fillColor: string;
  bgColor: string;
  centerValue: string;
  centerLabel?: string;
  labelColor?: string;
}

/**
 * Pure-RN circular progress ring using the half-circle rotation technique.
 * No SVG required.
 *
 * Math:
 *   rightAngle = -180 + clamp(percent, 0, 50) * 3.6   (reveals right arc 0→50%)
 *   leftAngle  = -180 + clamp(percent-50, 0, 50) * 3.6 (reveals left arc 50→100%)
 */
export function CircularProgress({
  percent,
  size = 110,
  thickness = 12,
  fillColor,
  bgColor,
  centerValue,
  centerLabel,
  labelColor,
}: Props) {
  const p = Math.max(0, Math.min(100, percent));
  const half = size / 2;

  const rightAngle = -180 + Math.min(p, 50) * 3.6;
  const leftAngle  = -180 + Math.max(0, p - 50) * 3.6;

  const circleStyle = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: half,
    borderWidth: thickness,
    borderColor: fillColor,
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Background ring */}
      <View style={[circleStyle, { borderColor: bgColor }]} />

      {/* Right half reveal */}
      <View style={{ position: 'absolute', width: size, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, right: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={[circleStyle, { transform: [{ rotate: `${rightAngle}deg` }] }]} />
        </View>
      </View>

      {/* Left half reveal (only when > 50%) */}
      {p > 50 && (
        <View style={{ position: 'absolute', width: size, height: size, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, width: half, height: size, overflow: 'hidden' }}>
            <View style={[circleStyle, { transform: [{ rotate: `${leftAngle}deg` }] }]} />
          </View>
        </View>
      )}

      {/* Center text */}
      <Text style={{ fontSize: 16, fontWeight: '800', color: labelColor ?? fillColor }}>
        {centerValue}
      </Text>
      {centerLabel ? (
        <Text style={{ fontSize: 9, color: labelColor ?? fillColor, opacity: 0.7, textAlign: 'center', maxWidth: size * 0.6 }}>
          {centerLabel}
        </Text>
      ) : null}
    </View>
  );
}
