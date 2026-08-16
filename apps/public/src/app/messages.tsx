import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { ChatThread, ConversationList } from '@bink/shared/components/chat';
import { Button } from '@bink/shared/components/ui/button';
import { BText } from '@bink/shared/components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '@bink/shared/components/web-header';
import { useAppData } from '@bink/shared/lib/app-data-context';
import { useAuth } from '@bink/shared/lib/auth-context';
import { useI18n } from '@bink/shared/lib/i18n';
import { Conversation, getConversationsForUser } from '@bink/shared/lib/messages';
import { colors, radius } from '@bink/shared/lib/theme';
import { useIsDesktop } from '@bink/shared/lib/use-layout';

export default function Messages() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const { user } = useAuth();
  const { allVenues } = useAppData();
  const params = useLocalSearchParams<{ venue?: string }>();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<{ venueId: string; venueName: string } | null>(null);

  // Preselect the thread from ?venue= once venue data resolves
  React.useEffect(() => {
    if (!active && params.venue && allVenues.length) {
      const v = allVenues.find((x) => x.slug === params.venue);
      if (v) setActive({ venueId: v.id, venueName: v.name });
    }
  }, [params.venue, allVenues.length]);

  // Desktop: open the most recent conversation by default
  React.useEffect(() => {
    if (isDesktop && !active && !params.venue && conversations.length) {
      setActive({ venueId: conversations[0].venue_id, venueName: conversations[0].venue_name });
    }
  }, [isDesktop, conversations.length]);

  const refresh = useCallback(() => {
    if (user) getConversationsForUser(user.id).then(setConversations, () => {});
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const t = setInterval(refresh, 5000);
      return () => clearInterval(t);
    }, [refresh])
  );

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        {isDesktop && <WebHeader showSearch />}
        <View style={styles.gate}>
          <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.grayLight} />
          <BText variant="h2" style={{ marginTop: 16 }}>
            {t('Messages')}
          </BText>
          <BText variant="small" style={{ marginTop: 6, textAlign: 'center', maxWidth: 320 }}>
            {t('Log in to message salons and see their replies.')}
          </BText>
          <View style={{ marginTop: 20 }}>
            <Button title={t('Log in or sign up')} onPress={() => router.push('/auth')} />
          </View>
        </View>
        {!isDesktop && <BottomTabs />}
      </View>
    );
  }

  const list = (
    <ConversationList
      conversations={conversations}
      perspective="customer"
      activeKey={active ? `${active.venueId}|${user.id}` : null}
      onSelect={(c) => setActive({ venueId: c.venue_id, venueName: c.venue_name })}
    />
  );

  const thread = active ? (
    <ChatThread
      venueId={active.venueId}
      venueName={active.venueName}
      userId={user.id}
      userName={user.name ?? user.email ?? 'Customer'}
      perspective="customer"
    />
  ) : (
    <View style={styles.emptyThread}>
      <Ionicons name="chatbubbles-outline" size={44} color={colors.grayLight} />
      <BText variant="h3" style={{ marginTop: 14 }}>
        {t('No conversation selected')}
      </BText>
      <BText variant="small" style={{ marginTop: 6, textAlign: 'center', maxWidth: 320 }}>
        {t('Pick a conversation, or start one from a salon page or one of your appointments.')}
      </BText>
    </View>
  );

  if (isDesktop) {
    return (
      <AccountLayout title={t('Messages')} wide>
        <View style={{ minHeight: 520 }}>
          <View style={styles.panes}>
            <ScrollView style={styles.listPane}>{list}</ScrollView>
            <View style={styles.threadPane}>
              {active && (
                <View style={styles.threadHeader}>
                  <BText variant="title">{t(active.venueName)}</BText>
                  <Pressable onPress={() => router.push(`/venue/${allVenues.find((v) => v.id === active.venueId)?.slug}`)} hitSlop={8}>
                    <BText variant="link">{t('View salon')}</BText>
                  </Pressable>
                </View>
              )}
              {thread}
            </View>
          </View>
        </View>
      </AccountLayout>
    );
  }

  // Mobile: list → thread
  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {active ? (
          <Pressable onPress={() => setActive(null)} hitSlop={8}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.ink} />
          </Pressable>
        ) : null}
        <BText variant="h1">{active ? t(active.venueName) : t('Messages')}</BText>
      </View>
      {active ? (
        <View style={{ flex: 1, paddingBottom: TAB_BAR_HEIGHT }}>{thread}</View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 24 }}>{list}</ScrollView>
      )}
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  panes: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 480,
  },
  listPane: { width: 290, maxWidth: 290, flexGrow: 0, flexShrink: 0, borderRightWidth: 1, borderRightColor: colors.divider },
  threadPane: { flex: 1, minWidth: 0 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.bgPage,
  },
  emptyThread: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
