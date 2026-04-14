import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { REACTION_EMOJIS } from '@/lib/i18n';
import { useColors } from '@/lib/useColors';
import { useAuth } from '@/lib/auth-context';
import { getT } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onSkip: () => void;
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.cardBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 28,
      paddingBottom: 40,
      alignItems: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: c.secondary,
      marginBottom: 20,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 20,
    },
    emojiBtn: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: c.lightGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emoji: { fontSize: 32 },
    skipBtn: { paddingVertical: 8, paddingHorizontal: 24 },
    skipText: { color: c.gray, fontSize: 14, fontWeight: '600' },
  });
}

export function ReactionPicker({ visible, onSelect, onSkip }: Props) {
  const { userProfile } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const t = getT(userProfile?.language ?? 'fr');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t.howWasIt}</Text>
          <View style={styles.grid}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.emojiBtn}
                onPress={() => onSelect(emoji)}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t.skipReaction}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
