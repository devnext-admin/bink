import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLocalVenues } from './business';
import { useAuth } from './auth-context';
import { getCategories, getFavoriteIds, getVenues, toggleFavorite } from './data';
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
    const [base, locals, c, f] = await Promise.all([
      getVenues(),
      getLocalVenues(),
      getCategories(),
      getFavoriteIds(user?.id),
    ]);
    // Locally-edited copies override their base venue; new local venues prepend
    const overridden = new Set(locals.map((v) => v.id));
    setAllVenues([...locals, ...base.filter((v) => !overridden.has(v.id))]);
    setCategories(c);
    setFavorites(f);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
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
