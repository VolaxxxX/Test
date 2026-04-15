import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { REACTION_EMOJIS } from '@/lib/i18n';
import { useColors } from '@/lib/useColors';
import { useAuth } from '@/lib/auth-context';
import { getT } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

const TAG_KEYS = ['express', 'normal', 'difficile', 'legendary'];
const TAG_LABELS_FR = ['⚡ Express', '😐 Normal', '😤 Difficile', '🏆 Legendary'];
const TAG_LABELS_EN = ['⚡ Express', '😐 Normal', '😤 Hard', '🏆 Legendary'];

interface Props {
  visible: boolean;
  onSelect: (emoji: string | null, quality: number, tag?: string) => void;
  onSkip: () => void;
}

export function ReactionPicker({ visible, onSelect, onSkip }: Props) {
  const { userProfile } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const t = getT(userProfile?.language ?? 'fr');
  const language = userProfile?.language ?? 'fr';
  const tagLabels = language === 'fr' ? TAG_LABELS_FR : TAG_LABELS_EN;

  const [quality, setQuality] = useState(3);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();

  useEffect(() => {
    if (visible) { setQuality(3); setSelectedTag(undefined); }
  }, [visible]);

  const handleEmoji = (emoji: string) => onSelect(emoji, quality, selectedTag);
  const handleConfirm = () => onSelect(null, quality, selectedTag);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t.howWasIt}</Text>

          {/* Quality stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity key={i} onPress={() => setQuality(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                <Text style={{ fontSize: 30, opacity: i <= quality ? 1 : 0.18 }}>💩</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tag chips */}
          <View style={styles.tagsRow}>
            {tagLabels.map((label, idx) => {
              const key = TAG_KEYS[idx];
              const active = selectedTag === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedTag(active ? undefined : key)}
                  style={[styles.tag, active && { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.tagText, active && { color: colors.white }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Emoji grid */}
          <Text style={styles.subTitle}>
            {language === 'fr' ? '🎭 Ajouter une réaction' : '🎭 Add a reaction'}
          </Text>
          <View style={styles.grid}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity key={emoji} style={styles.emojiBtn} onPress={() => handleEmoji(emoji)}>
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm without emoji */}
          <TouchableOpacity
            onPress={handleConfirm}
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.confirmText, { color: colors.white }]}>
              {language === 'fr' ? '✓ Valider' : '✓ Confirm'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t.skipReaction}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: 40, alignItems: 'center',
    },
    title: { fontSize: 17, fontWeight: '700', color: c.secondary, marginBottom: 16 },
    starsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, justifyContent: 'center' },
    tag: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: c.lightGray },
    tagText: { fontSize: 12, fontWeight: '700', color: c.secondary },
    subTitle: { fontSize: 12, fontWeight: '600', color: c.textLight, marginBottom: 10, alignSelf: 'flex-start' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 16 },
    emojiBtn: {
      width: 52, height: 52, borderRadius: 26, backgroundColor: c.lightGray,
      justifyContent: 'center', alignItems: 'center',
    },
    emoji: { fontSize: 28 },
    confirmBtn: { width: '100%', paddingVertical: 13, borderRadius: 14, alignItems: 'center', marginBottom: 8 },
    confirmText: { fontSize: 15, fontWeight: '800' },
    skipBtn: { paddingVertical: 8, paddingHorizontal: 24 },
    skipText: { color: c.gray, fontSize: 14, fontWeight: '600' },
  });
}
