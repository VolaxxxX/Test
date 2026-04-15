import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  myPercent: number;      // 0–100
  myColor: string;
  partnerColor: string;
  myLabel: string;
  partnerLabel: string;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  textColor?: string;
}

/**
 * Two-segment donut chart using half-circle rotation.
 * Background ring = partnerColor (100% filled).
 * Foreground overlay = myColor for myPercent.
 */
export function RingChart({
  myPercent,
  myColor,
  partnerColor,
  myLabel,
  partnerLabel,
  size = 130,
  thickness = 14,
  centerLabel,
  textColor = '#333',
}: Props) {
  const p = Math.max(0, Math.min(100, myPercent));
  const half = size / 2;
  const partnerPercent = 100 - p;

  const rightAngle = -180 + Math.min(p, 50) * 3.6;
  const leftAngle  = -180 + Math.max(0, p - 50) * 3.6;

  const circleStyle = {
    position: 'absolute' as const,
    width: size, height: size,
    borderRadius: half,
    borderWidth: thickness,
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* Partner color background (full ring) */}
        <View style={[circleStyle, { borderColor: partnerColor }]} />

        {/* My color overlay — right half */}
        <View style={{ position: 'absolute', width: size, height: size, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: 0, right: 0, width: half, height: size, overflow: 'hidden' }}>
            <View style={[circleStyle, { borderColor: myColor, transform: [{ rotate: `${rightAngle}deg` }] }]} />
          </View>
        </View>

        {/* My color overlay — left half (> 50%) */}
        {p > 50 && (
          <View style={{ position: 'absolute', width: size, height: size, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: 0, left: 0, width: half, height: size, overflow: 'hidden' }}>
              <View style={[circleStyle, { borderColor: myColor, transform: [{ rotate: `${leftAngle}deg` }] }]} />
            </View>
          </View>
        )}

        {/* Center */}
        <Text style={{ fontSize: 13, fontWeight: '800', color: textColor, textAlign: 'center' }}>
          {centerLabel}
        </Text>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: myColor }} />
          <Text style={{ fontSize: 11, color: textColor }}>{myLabel} {p}%</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: partnerColor }} />
          <Text style={{ fontSize: 11, color: textColor }}>{partnerLabel} {partnerPercent}%</Text>
        </View>
      </View>
    </View>
  );
}
