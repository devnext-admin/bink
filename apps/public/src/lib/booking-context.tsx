import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Package, Service, Staff, Venue } from '@bink/shared/lib/types';

interface BookingState {
  venue: Venue | null;
  services: Service[];
  staff: Staff | null; // null = any professional
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  // When a package is booked, its bundle price overrides the service sum.
  packageName: string | null;
  packagePriceCents: number | null;
}

interface BookingContextValue extends BookingState {
  startBooking: (venue: Venue, service?: Service) => void;
  startBookingPackage: (venue: Venue, pkg: Package) => void;
  toggleService: (service: Service) => void;
  setStaff: (staff: Staff | null) => void;
  setDateTime: (date: string, time: string) => void;
  reset: () => void;
  totalCents: number;
  totalMinutes: number;
  currency: string;
}

const BookingContext = createContext<BookingContextValue | null>(null);

const EMPTY: BookingState = {
  venue: null,
  services: [],
  staff: null,
  date: null,
  time: null,
  packageName: null,
  packagePriceCents: null,
};

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(EMPTY);

  const startBooking = useCallback((venue: Venue, service?: Service) => {
    setState({ ...EMPTY, venue, services: service ? [service] : [] });
  }, []);

  const startBookingPackage = useCallback((venue: Venue, pkg: Package) => {
    const services = venue.services.filter((s) => pkg.service_ids.includes(s.id));
    setState({
      ...EMPTY,
      venue,
      services,
      packageName: pkg.name,
      packagePriceCents: pkg.price_cents,
    });
  }, []);

  const toggleService = useCallback((service: Service) => {
    setState((s) => ({
      ...s,
      // Editing the selection breaks the exact bundle, so drop the package price
      packageName: null,
      packagePriceCents: null,
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
    const serviceSum = state.services.reduce((c, s) => c + s.price_cents * (1 - s.discount_pct / 100), 0);
    const totalCents = state.packagePriceCents ?? serviceSum;
    const totalMinutes = state.services.reduce((m, s) => m + s.duration_minutes, 0);
    return {
      ...state,
      startBooking,
      startBookingPackage,
      toggleService,
      setStaff,
      setDateTime,
      reset,
      totalCents: Math.round(totalCents),
      totalMinutes,
      currency: state.services[0]?.currency ?? state.venue?.services[0]?.currency ?? 'SAR',
    };
  }, [state, startBooking, startBookingPackage, toggleService, setStaff, setDateTime, reset]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
}
