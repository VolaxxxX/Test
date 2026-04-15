import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Animated, Dimensions,
  StyleSheet, Modal, Pressable, Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { getT } from '@/lib/i18n';
import { getCoupleId, sendMessage, subscribeToMessages } from '@/lib/database';
import type { Message } from '@/lib/database';

const { width: SW, height: SH } = Dimensions.get('window');

// ── Custom poop emojis available in picker ────────────────────────────
const POOP_EMOJIS = [
  '💩', '🤎', '💩💨', '👑💩', '💩⚡', '🚽', '🧻', '💩🔥',
  '💩😂', '💩💪', '🫢💩', '💩❤️', '💩👻', '🌈💩', '💩🏆', '💩✨',
];

const QUICK_REACTIONS = ['👏', '😂', '💀', '🫡', '😤', '❤️', '🔥', '💯'];

// ── Falling poop particle ─────────────────────────────────────────────
interface ParticleProps {
  x: number;
  delay: number;
  duration: number;
  emoji: string;
  size: number;
  onDone: () => void;
}

function FallingPoop({ x, delay, duration, emoji, size, onDone }: ParticleProps) {
  const y = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y, {
          toValue: SH + 80,
          duration,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    ]);
    seq.start(({ finished }) => { if (finished) onDone(); });
    return () => seq.stop();
  }, []);

  const rot = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: x,
        fontSize: size,
        transform: [{ translateY: y }, { rotate: rot }],
        opacity,
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// ── Poop rain overlay ─────────────────────────────────────────────────
function PoopRain({ onDone }: { onDone: () => void }) {
  const COUNT = 18;
  const doneCount = useRef(0);

  const particles = useMemo(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * (SW - 40),
      delay: Math.random() * 800,
      duration: 1400 + Math.random() * 800,
      emoji: Math.random() < 0.7 ? '💩' : POOP_EMOJIS[Math.floor(Math.random() * POOP_EMOJIS.length)],
      size: 24 + Math.floor(Math.random() * 20),
    })),
    [],
  );

  const handleOneDone = useCallback(() => {
    doneCount.current += 1;
    if (doneCount.current >= COUNT) onDone();
  }, [onDone]);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {particles.map(p => (
        <FallingPoop key={p.id} {...p} onDone={handleOneDone} />
      ))}
    </View>
  );
}

// ── Emoji picker modal ─────────────────────────────────────────────────
interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

function EmojiPicker({ visible, onClose, onSelect }: EmojiPickerProps) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#00000040' }} onPress={onClose} />
      <View style={{
        backgroundColor: colors.cardBg,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 36,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 14, textAlign: 'center' }}>
          💩 Choisis ton émoji
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {POOP_EMOJIS.map((emoji, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => { onSelect(emoji); onClose(); }}
              style={{
                width: 54, height: 54,
                borderRadius: 12,
                backgroundColor: colors.lightGray,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────
interface BubbleProps {
  msg: Message;
  isMine: boolean;
  colors: ReturnType<typeof useColors>;
}

function Bubble({ msg, isMine, colors }: BubbleProps) {
  const time = new Date(msg.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

  return (
    <View style={{
      alignSelf: isMine ? 'flex-end' : 'flex-start',
      maxWidth: '78%',
      marginBottom: 8,
      marginHorizontal: 12,
    }}>
      {!isMine && (
        <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 3, marginLeft: 4 }}>
          {msg.senderEmoji} {msg.senderName}
        </Text>
      )}
      <View style={{
        backgroundColor: isMine ? colors.primary : colors.cardBg,
        borderRadius: 18,
        borderBottomRightRadius: isMine ? 4 : 18,
        borderBottomLeftRadius: isMine ? 18 : 4,
        paddingHorizontal: 14,
        paddingVertical: 10,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 1,
      }}>
        <Text style={{
          fontSize: 15,
          color: isMine ? '#fff' : colors.text,
          lineHeight: 20,
        }}>
          {msg.text}
        </Text>
      </View>
      <Text style={{
        fontSize: 10,
        color: colors.gray,
        marginTop: 3,
        alignSelf: isMine ? 'flex-end' : 'flex-start',
        marginHorizontal: 4,
      }}>
        {timeStr}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = getT(userProfile?.language ?? 'fr');
  const fr = (userProfile?.language ?? 'fr') === 'fr';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [raining, setRaining] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);

  const uid = userProfile?.uid ?? '';
  const partnerId = userProfile?.partnerId ?? '';
  const coupleId = uid && partnerId ? getCoupleId(uid, partnerId) : '';

  // Subscribe to messages
  useEffect(() => {
    if (!coupleId) return;
    return subscribeToMessages(coupleId, setMessages);
  }, [coupleId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // Detect incoming poop rain from partner
  const prevMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length <= prevMsgCount.current) {
      prevMsgCount.current = messages.length;
      return;
    }
    const newest = messages[messages.length - 1];
    if (newest && newest.senderId !== uid && newest.specialEffect === 'poop_rain') {
      setRaining(true);
    }
    prevMsgCount.current = messages.length;
  }, [messages, uid]);

  const doSend = useCallback(async (text: string, specialEffect?: 'poop_rain') => {
    if (!text.trim() || !coupleId || !userProfile) return;
    const msg: Omit<Message, 'id'> = {
      senderId: uid,
      senderName: userProfile.displayName,
      senderEmoji: userProfile.poopEmoji || userProfile.emoji,
      text,
      timestamp: Date.now(),
      ...(specialEffect ? { specialEffect } : {}),
    };
    setInputText('');
    await sendMessage(coupleId, msg);
  }, [coupleId, uid, userProfile]);

  const handleSend = useCallback(() => {
    doSend(inputText);
  }, [inputText, doSend]);

  const handlePoopBomb = useCallback(() => {
    setRaining(true);
    doSend('💩💥 BOMBE POOP!', 'poop_rain');
  }, [doSend]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setInputText(prev => prev + emoji);
  }, []);

  if (!userProfile?.partnerId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
        <Text style={{ fontSize: 16, color: colors.textLight, textAlign: 'center', fontWeight: '600' }}>
          {fr ? 'Connecte-toi à un partenaire pour tchatter !' : 'Connect with a partner to start chatting!'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 20,
        backgroundColor: colors.cardBg,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.lightGray,
      }}>
        <Text style={{ fontSize: 22, marginRight: 10 }}>💬</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
            {fr ? 'Messages' : 'Messages'}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textLight, fontWeight: '500' }}>
            {userProfile.partnerName ?? ''}
          </Text>
        </View>
        {/* Poop bomb button */}
        <TouchableOpacity
          onPress={handlePoopBomb}
          style={{
            backgroundColor: colors.primary + '22',
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Text style={{ fontSize: 18 }}>💩</Text>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
            {fr ? 'BOMBE' : 'BOMB'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Messages list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 8 }}
        renderItem={({ item }) => (
          <Bubble msg={item} isMine={item.senderId === uid} colors={colors} />
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💩</Text>
            <Text style={{ fontSize: 14, color: colors.textLight, fontWeight: '600', textAlign: 'center' }}>
              {fr ? 'Aucun message pour l\'instant\nEnvoie le premier !' : 'No messages yet\nSend the first one!'}
            </Text>
          </View>
        }
      />

      {/* Quick reaction row */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 6,
      }}>
        {QUICK_REACTIONS.map((emoji, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => doSend(emoji)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.cardBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingBottom: insets.bottom + 8,
        paddingTop: 8,
        backgroundColor: colors.cardBg,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        gap: 8,
      }}>
        {/* Emoji picker button */}
        <TouchableOpacity
          onPress={() => setShowEmojiPicker(true)}
          style={{
            width: 40, height: 40,
            borderRadius: 20,
            backgroundColor: colors.lightGray,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>💩</Text>
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={fr ? 'Écris un message...' : 'Type a message...'}
          placeholderTextColor={colors.gray}
          multiline
          style={{
            flex: 1,
            maxHeight: 100,
            backgroundColor: colors.lightGray,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 15,
            color: colors.text,
          }}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />

        {/* Send button */}
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim()}
          style={{
            width: 40, height: 40,
            borderRadius: 20,
            backgroundColor: inputText.trim() ? colors.primary : colors.lightGray,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18 }}>{inputText.trim() ? '➤' : '💬'}</Text>
        </TouchableOpacity>
      </View>

      {/* Emoji picker modal */}
      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={handleEmojiSelect}
      />

      {/* Poop rain overlay */}
      {raining && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <PoopRain onDone={() => setRaining(false)} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
