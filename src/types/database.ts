export type Role = 'admin' | 'guest'
export type BookingStatus = 'confirmed' | 'cancelled'
export type ServiceCategory = 'training' | 'seitai'

export interface Store {
  id: string
  name: string
  slug: string
  address: string | null
  phone: string | null
  created_at: string
}

export interface Profile {
  id: string
  role: Role
  name: string
  email: string
  phone: string | null
  store_id: string | null
  is_active: boolean
  created_at: string
  store?: Store
}

export interface Staff {
  id: string
  store_id: string
  name: string
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  store?: Store
}

export interface Service {
  id: string
  name: string
  category: ServiceCategory
  duration_minutes: number
  color: string
  created_at: string
}

export interface AvailabilitySlot {
  id: string
  store_id: string
  staff_id: string
  service_id: string
  start_time: string
  end_time: string
  is_published: boolean
  created_at: string
  store?: Store
  staff?: Staff
  service?: Service
  booking?: Booking | null
}

export interface Booking {
  id: string
  slot_id: string
  guest_id: string
  status: BookingStatus
  notes: string | null
  created_at: string
  slot?: AvailabilitySlot
  guest?: Profile
}
