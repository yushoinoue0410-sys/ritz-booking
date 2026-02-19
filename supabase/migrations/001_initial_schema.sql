-- ============================================================
-- RITZ PERSONAL GYM BOOKING SYSTEM
-- Migration 001: Initial Schema
-- ============================================================

-- ─────────────────────────────────────────
-- 1. STORES (店舗)
-- ─────────────────────────────────────────
CREATE TABLE public.stores (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  address    TEXT,
  phone      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. PROFILES (ユーザー共通)
-- ─────────────────────────────────────────
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin','guest')),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  store_id   UUID REFERENCES public.stores(id),   -- ゲストの担当店舗
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. STAFF (スタッフ)
-- ─────────────────────────────────────────
CREATE TABLE public.staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES public.stores(id),
  name       TEXT NOT NULL,
  bio        TEXT,
  avatar_url TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 4. SERVICES (サービス種別)
-- ─────────────────────────────────────────
CREATE TABLE public.services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('training','seitai')),
  duration_minutes INTEGER NOT NULL,
  color            TEXT DEFAULT '#4F46E5',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 5. AVAILABILITY SLOTS (管理者が作成する予約枠)
-- ─────────────────────────────────────────
CREATE TABLE public.availability_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     UUID NOT NULL REFERENCES public.stores(id),
  staff_id     UUID NOT NULL REFERENCES public.staff(id),
  service_id   UUID NOT NULL REFERENCES public.services(id),
  start_time   TIMESTAMPTZ NOT NULL,
  end_time     TIMESTAMPTZ NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_overlap_per_staff EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
);

CREATE INDEX idx_slots_store_time ON public.availability_slots(store_id, start_time);
CREATE INDEX idx_slots_staff_time ON public.availability_slots(staff_id, start_time);

-- ─────────────────────────────────────────
-- 6. BOOKINGS (予約)
-- ─────────────────────────────────────────
CREATE TABLE public.bookings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id    UUID NOT NULL REFERENCES public.availability_slots(id),
  guest_id   UUID NOT NULL REFERENCES public.profiles(id),
  status     TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slot_id)   -- 1枠1予約
);

CREATE INDEX idx_bookings_guest ON public.bookings(guest_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings           ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- STORES
CREATE POLICY "anyone can read stores"
  ON public.stores FOR SELECT USING (true);
CREATE POLICY "admin can manage stores"
  ON public.stores FOR ALL USING (public.get_my_role() = 'admin');

-- PROFILES
CREATE POLICY "own profile read"
  ON public.profiles FOR SELECT USING (id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "own profile update"
  ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "admin manage profiles"
  ON public.profiles FOR ALL USING (public.get_my_role() = 'admin');

-- STAFF
CREATE POLICY "authenticated can read staff"
  ON public.staff FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage staff"
  ON public.staff FOR ALL USING (public.get_my_role() = 'admin');

-- SERVICES
CREATE POLICY "authenticated can read services"
  ON public.services FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin manage services"
  ON public.services FOR ALL USING (public.get_my_role() = 'admin');

-- AVAILABILITY SLOTS
CREATE POLICY "guest can read published slots"
  ON public.availability_slots FOR SELECT
  USING (is_published = true OR public.get_my_role() = 'admin');
CREATE POLICY "admin manage slots"
  ON public.availability_slots FOR ALL
  USING (public.get_my_role() = 'admin');

-- BOOKINGS
CREATE POLICY "guest reads own bookings"
  ON public.bookings FOR SELECT
  USING (guest_id = auth.uid() OR public.get_my_role() = 'admin');
CREATE POLICY "guest creates booking"
  ON public.bookings FOR INSERT
  WITH CHECK (guest_id = auth.uid() AND public.get_my_role() = 'guest');
CREATE POLICY "guest cancels own booking"
  ON public.bookings FOR UPDATE
  USING (guest_id = auth.uid() AND public.get_my_role() = 'guest');
CREATE POLICY "admin manage bookings"
  ON public.bookings FOR ALL
  USING (public.get_my_role() = 'admin');

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'guest'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SEED DATA
-- ============================================================

-- 店舗
INSERT INTO public.stores (id, name, slug, address, phone) VALUES
  ('11111111-1111-1111-1111-111111111111', '小田原店', 'odawara', '神奈川県小田原市栄町1-1-1', '0465-XX-XXXX'),
  ('22222222-2222-2222-2222-222222222222', '三島店',   'mishima',  '静岡県三島市大宮町2-2-2', '055-XXX-XXXX');

-- サービス
INSERT INTO public.services (name, category, duration_minutes, color) VALUES
  ('トレーニング 60分', 'training', 60, '#4F46E5'),
  ('整体 30分',         'seitai',   30, '#10B981'),
  ('整体 60分',         'seitai',   60, '#059669'),
  ('整体 90分',         'seitai',   90, '#047857');
