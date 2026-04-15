import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useColors } from '@/lib/useColors';
import { useAuth } from '@/lib/auth-context';
import { getT } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

const REACT_EMOJIS = ['👏', '😂', '💀', '🫡', '😤', '🙏', '❤️', '🏆'];

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiReactPicker({ visible, onSelect, onClose }: Props) {
  const { userProfile } = useAuth();
  const colors = useColors();
  const t = getT(userProfile?.language ?? 'fr');
  const language = userProfile?.language ?? 'fr';
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.overlay}>
        <View style={s.sheet}>
          <Text style={s.title}>
            {language === 'fr' ? '😂 Réagir à cette session' : '😂 React to this session'}
          </Text>
          <View style={s.grid}>
            {REACT_EMOJIS.map(emoji => (
              <TouchableOpacity key={emoji} style={s.btn} onPress={() => onSelect(emoji)}>
                <Text style={s.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>{t.cancel}</Text>
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
      padding: 28, paddingBottom: 40, alignItems: 'center',
    },
    title: { fontSize: 16, fontWeight: '700', color: c.secondary, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 20 },
    btn: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: c.lightGray,
      justifyContent: 'center', alignItems: 'center',
    },
    emoji: { fontSize: 28 },
    closeBtn: { paddingVertical: 8, paddingHorizontal: 24 },
    closeText: { color: c.gray, fontSize: 14, fontWeight: '600' },
  });
}
