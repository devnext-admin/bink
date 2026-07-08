import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Service, Staff, Venue } from './types';

interface BookingState {
  venue: Venue | null;
  services: Service[];
  staff: Staff | null; // null = any professional
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
}

interface BookingContextValue extends BookingState {
  startBooking: (venue: Venue, service?: Service) => void;
  toggleService: (service: Service) => void;
  setStaff: (staff: Staff | null) => void;
  setDateTime: (date: string, time: string) => void;
  reset: () => void;
  totalCents: number;
  totalMinutes: number;
  currency: string;
}

const BookingContext = createContext<BookingContextValue | null>(null);

const EMPTY: BookingState = { venue: null, services: [], staff: null, date: null, time: null };

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(EMPTY);

  const startBooking = useCallback((venue: Venue, service?: Service) => {
    setState({ venue, services: service ? [service] : [], staff: null, date: null, time: null });
  }, []);

  const toggleService = useCallback((service: Service) => {
    setState((s) => ({
      ...s,
      services: s.services.some((x) => x.id === service.id)
        ? s.services.filter((x) => x.id !== service.id)
        : [...s.services, service],
    }));
  }, []);

  const setStaff = useCallback((staff: Staff | null) => setState((s) => ({ ...s, staff })), []);
  const setDateTime = useCallback(
    (date: string, time: string) => setState((s) => ({ ...s, date, time })),
    []
  );
  const reset = useCallback(() => setState(EMPTY), []);

  const value = useMemo<BookingContextValue>(() => {
    const totalCents = state.services.reduce((c, s) => c + s.price_cents * (1 - s.discount_pct / 100), 0);
    const totalMinutes = state.services.reduce((m, s) => m + s.duration_minutes, 0);
    return {
      ...state,
      startBooking,
      toggleService,
      setStaff,
      setDateTime,
      reset,
      totalCents: Math.round(totalCents),
      totalMinutes,
      currency: state.services[0]?.currency ?? state.venue?.services[0]?.currency ?? 'SAR',
    };
  }, [state, startBooking, toggleService, setStaff, setDateTime, reset]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
