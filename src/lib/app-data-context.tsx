import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLocalVenues } from './business';
import { useAuth } from './auth-context';
import { getCategories, getFavoriteIds, getVenues, toggleFavorite } from './data';
import { isSupabaseConfigured } from './supabase';
import type { Category, Venue } from './types';

interface AppDataValue {
  venues: Venue[]; // approved venues (public marketplace)
  allVenues: Venue[]; // includes pending/suspended (partner + admin views)
  categories: Category[];
  favorites: string[];
  loading: boolean;
  toggleFav: (venueId: string) => void;
  categoryOf: (venue: Venue) => Category | undefined;
  refresh: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // Each source degrades independently: a transient network failure on one
    // (e.g. a Wi-Fi blip) must never reject the whole load, hang the loader,
    // or bubble up as an unhandled rejection. Keep whatever we can get.
    const [base, locals, c, f] = await Promise.all([
      getVenues().catch(() => [] as Venue[]),
      getLocalVenues().catch(() => [] as Venue[]),
      getCategories().catch(() => [] as Category[]),
      getFavoriteIds(user?.id).catch(() => [] as string[]),
    ]);
    // Don't wipe existing venues if the cloud fetch momentarily returned nothing.
    if (base.length || locals.length) {
      if (isSupabaseConfigured) {
        // Cloud is the source of truth — local copies only add venues the
        // cloud doesn't know about (demo-mode leftovers), never shadow it.
        const baseIds = new Set(base.map((v) => v.id));
        setAllVenues([...locals.filter((v) => !baseIds.has(v.id)), ...base]);
      } else {
        // Demo mode: locally-edited copies override their base venue
        const overridden = new Set(locals.map((v) => v.id));
        setAllVenues([...locals, ...base.filter((v) => !overridden.has(v.id))]);
      }
    }
    if (c.length) setCategories(c);
    setFavorites(f);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const toggleFav = useCallback((venueId: string) => {
    setFavorites((prev) =>
      prev.includes(venueId) ? prev.filter((id) => id !== venueId) : [...prev, venueId]
    );
    toggleFavorite(venueId, user?.id);
  }, [user?.id]);

  const value = useMemo<AppDataValue>(
    () => ({
      venues: allVenues.filter((v) => !v.status || v.status === 'approved'),
      allVenues,
      categories,
      favorites,
      loading,
      toggleFav,
      categoryOf: (venue) => categories.find((c) => c.id === venue.category_id),
      refresh,
    }),
    [allVenues, categories, favorites, loading, toggleFav, refresh]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
