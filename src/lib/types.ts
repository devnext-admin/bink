export interface Category {
  id: number;
  slug: string;
  name: string;
  icon: string;
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

export interface Staff {
  id: string;
  venue_id: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  rating: number;
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
  highlights: string[];
  images: VenueImage[];
  services: Service[];
  staff: Staff[];
  reviews: Review[];
  hours: OpeningHour[];
}

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
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
  customer_name?: string | null;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
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
  items: BookingItem[];
}
