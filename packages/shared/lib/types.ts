export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
  name_ar?: string | null;
  image_url?: string | null;
}

export interface VenueImage {
  url: string;
  sort_order: number;
}

export interface Service {
  id: string;
  venue_id: string;
  name: string;
  description: string;
  group_name: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  discount_pct: number;
  is_featured: boolean;
  sort_order: number;
}

export interface StaffHours {
  weekday: number;
  open_time: string | null;
  close_time: string | null;
  is_off: boolean;
}

export interface Staff {
  id: string;
  venue_id: string;
  name: string;
  role: string;
  email?: string | null;
  user_id?: string | null;
  venue_role?: 'manager' | 'member';
  invite_status?: 'none' | 'invited' | 'joined';
  service_ids?: string[];
  avatar_url?: string | null;
  rating: number;
  hours?: StaffHours[];
}

export interface Review {
  id: string;
  venue_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface OpeningHour {
  weekday: number; // 0 = Sunday
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export type UserRole = 'customer' | 'partner' | 'admin';
export type VenueStatus = 'pending' | 'approved' | 'suspended';

export interface Package {
  id: string;
  venue_id: string;
  name: string;
  name_ar?: string | null;
  description: string;
  service_ids: string[];
  duration_minutes: number;
  price_cents: number;
  original_price_cents?: number | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_id: number;
  owner_id?: string | null;
  status?: VenueStatus;
  address: string;
  area: string;
  city: string;
  country: string;
  rating_avg: number;
  rating_count: number;
  is_featured: boolean;
  is_new: boolean;
  is_trending: boolean;
  created_at?: string;
  highlights: string[];
  provider_type?: 'salon' | 'freelancer';
  maps_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  cancellation_policy?: string;
  cancellation_fee_pct?: number;
  deposit_cents?: number;
  images: VenueImage[];
  services: Service[];
  staff: Staff[];
  reviews: Review[];
  hours: OpeningHour[];
  packages?: Package[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface PromoCode {
  id: number | string;
  code: string;
  pct_off: number;
  is_active: boolean;
  expires_at?: string | null;
  max_uses?: number | null;
  used_count?: number;
}
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'pay_at_venue' | 'card' | 'apple_pay';

export interface Transaction {
  id: string;
  booking_id: string | null;
  venue_id: string;
  venue_name?: string;
  user_id: string | null;
  customer_name?: string | null;
  amount_cents: number;
  currency: string;
  method: PaymentMethod;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  escrow_status?: 'held' | 'released' | 'refunded';
  released_at?: string | null;
  gateway: string;
  gateway_ref?: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  number: string;
  booking_id: string | null;
  venue_id: string;
  venue_name?: string;
  user_id: string | null;
  items?: BookingItem[];
  subtotal_cents: number;
  vat_cents: number;
  total_cents: number;
  vat_rate: number;
  currency: string;
  issued_at: string;
}

export interface BookingItem {
  service_id: string;
  service_name: string;
  duration_minutes: number;
  price_cents: number;
}

export interface Booking {
  id: string;
  venue_id: string;
  user_id?: string | null;
  customer_name?: string | null;
  notes?: string | null;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  promo_code?: string | null;
  rated?: boolean;
  customer_confirmed_at?: string | null;
  deposit_cents?: number;
  venue_name: string;
  venue_image?: string;
  venue_area?: string;
  staff_id?: string | null;
  staff_name?: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  total_cents: number;
  currency: string;
  created_at?: string;
  items: BookingItem[];
}
