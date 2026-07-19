import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ChatMessage, Conversation, getThread, markThreadRead, sendMessage } from '../lib/messages';
import { Lang, useI18n } from '../lib/i18n';
import { colors, font, radius } from '../lib/theme';
import { Avatar } from './ui/avatar';
import { BText } from './ui/text';

function timeShort(iso: string, lang: Lang) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const locale = lang === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-US';
  return today
    ? d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function ConversationList({
  conversations,
  perspective,
  activeKey,
  onSelect,
}: {
  conversations: Conversation[];
  perspective: 'customer' | 'venue';
  activeKey?: string | null;
  onSelect: (c: Conversation) => void;
}) {
  const { t, lang } = useI18n();
  if (!conversations.length) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 }}>
        <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.grayLight} />
        <BText variant="smallMedium" style={{ marginTop: 12 }}>
          {t('No messages yet')}
        </BText>
        <BText variant="tiny" style={{ marginTop: 4, textAlign: 'center' }}>
          {perspective === 'customer'
            ? t('Message a salon from its page or one of your appointments.')
            : t('Customer messages will appear here.')}
        </BText>
      </View>
    );
  }
  return (
    <View>
      {conversations.map((c) => {
        const key = `${c.venue_id}|${c.user_id}`;
        const title = perspective === 'customer' ? c.venue_name : c.user_name || t('Customer');
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(c)}
            style={({ hovered }: any) => [
              styles.convRow,
              activeKey === key && { backgroundColor: colors.accentSoft },
              hovered && activeKey !== key && { backgroundColor: colors.bgPage },
            ]}
          >
            <Avatar name={title} size={42} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BText variant="smallMedium" numberOfLines={1} style={{ flex: 1 }}>
                  {title}
                </BText>
                <BText variant="tiny">{timeShort(c.last_at, lang)}</BText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BText variant="tiny" numberOfLines={1} style={{ flex: 1 }}>
                  {c.last_text}
                </BText>
                {c.unread > 0 && (
                  <View style={styles.unreadDot}>
                    <BText style={{ fontFamily: font.bold, fontSize: 10, color: colors.white }}>
                      {c.unread}
                    </BText>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ChatThread({
  venueId,
  venueName,
  userId,
  userName,
  perspective,
}: {
  venueId: string;
  venueName: string;
  userId: string;
  userName: string;
  perspective: 'customer' | 'venue';
}) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = async () => {
    const thread = await getThread(venueId, userId);
    setMessages(thread);
    await markThreadRead(venueId, userId, perspective);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000); // light polling keeps both sides fresh
    return () => clearInterval(timer);
  }, [venueId, userId]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
  }, [messages.length]);

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    await sendMessage({
      venueId,
      venueName,
      userId,
      userName,
      sender: perspective,
      text: draft,
    });
    setDraft('');
    setSending(false);
    load();
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}>
        {messages.length === 0 && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.grayLight} />
            <BText variant="small">
              {perspective === 'customer'
                ? t('Say hello to {name} — ask about services, timing or anything else.', { name: venueName })
                : t('Start the conversation with {name}.', { name: userName || t('this customer') })}
            </BText>
          </View>
        )}
        {messages.map((m) => {
          const mine = m.sender === perspective;
          return (
            <View key={m.id} style={[styles.bubbleRow, mine && { justifyContent: 'flex-end' }]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <BText variant="small" color={mine ? colors.white : colors.ink}>
                  {m.text}
                </BText>
                <BText
                  style={{
                    fontFamily: font.regular,
                    fontSize: 10,
                    color: mine ? 'rgba(255,255,255,0.7)' : colors.grayLight,
                    marginTop: 4,
                    textAlign: 'right',
                  }}
                >
                  {timeShort(m.created_at, lang)}
                </BText>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
        {...({ dir: 'auto' } as any)}
          placeholder={t('Write a message…')}
          placeholderTextColor={colors.gray}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          style={styles.input}
        />
        <Pressable onPress={send} style={[styles.sendBtn, !draft.trim() && { opacity: 0.4 }]}>
          <Ionicons name="send" size={16} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  unreadDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '78%',
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgSubtle, borderBottomLeftRadius: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    height: 44,
    paddingHorizontal: 16,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
