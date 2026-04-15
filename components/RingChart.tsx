import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  myPercent: number;      // 0–100
  myColor: string;
  partnerColor: string;
  myLabel: string;
  partnerLabel: string;
  size?: number;
  centerLabel?: string;
  textColor?: string;
}

const TOTAL_DOTS = 60;

/**
 * Two-color dot-ring chart.
 * Dots 0..myPercent% → myColor, rest → partnerColor.
 * Starts at top, goes clockwise.
 */
export function RingChart({
  myPercent,
  myColor,
  partnerColor,
  myLabel,
  partnerLabel,
  size = 130,
  centerLabel,
  textColor = '#333',
}: Props) {
  const p = Math.max(0, Math.min(100, myPercent));
  const partnerPercent = 100 - p;
  const dotSize = Math.max(6, Math.round(size * 0.075));
  const radius = size / 2 - dotSize / 2 - 1;
  const myDots = Math.round((p / 100) * TOTAL_DOTS);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: TOTAL_DOTS }, (_, i) => {
          const angle = (i / TOTAL_DOTS) * 2 * Math.PI - Math.PI / 2;
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
                backgroundColor: i < myDots ? myColor : partnerColor,
              }}
            />
          );
        })}

        <Text style={{ fontSize: size * 0.12, fontWeight: '800', color: textColor, textAlign: 'center' }}>
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
