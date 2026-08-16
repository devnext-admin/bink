import { openPublicRoute } from '../lib/admin-link';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { getUnreadCount } from '../lib/notifications';
import { colors, font } from '../lib/theme';
import { BText } from './ui/text';

export function NotificationsBell({ color = colors.ink }: { color?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { allVenues } = useAppData();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const ownedIds = user ? allVenues.filter((v) => v.owner_id === user.id).map((v) => v.id) : [];
      getUnreadCount(user?.id ?? null, ownedIds).then(setUnread, () => {});
    }, [user?.id, allVenues])
  );

  return (
    <Pressable onPress={() => (openPublicRoute('/notifications') ? undefined : router.push('/notifications' as any))} hitSlop={8} style={styles.wrap}>
      <Ionicons name="notifications-outline" size={22} color={color} />
      {unread > 0 && (
        <View style={styles.badge}>
          <BText style={{ fontFamily: font.bold, fontSize: 10, color: colors.white }}>
            {unread > 9 ? '9+' : unread}
          </BText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
});
