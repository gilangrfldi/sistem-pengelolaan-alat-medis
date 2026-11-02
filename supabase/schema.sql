-- ==============================================================================
-- SKEMA LENGKAP DATABASE SUPABASE: SISTEM PENGELOLAAN ALAT MEDIS RUANG HCU
-- ==============================================================================
-- File ini menyatukan seluruh skema database (Profiles, Pasien, Master Alat,
-- Alat Hitungan Waktu, Alat Hitungan Kali, dan Laporan Alat Rusak) beserta RLS,
-- Indeks, Fungsi RPC, dan Trigger Otomatis.
-- 
-- CARA PENGGUNAAN:
-- Salin seluruh isi file ini, lalu jalankan SEKALI di:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- Aktifkan ekstensi UUID jika belum aktif
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==============================================================================
-- 1. TABEL PROFIL PENGGUNA & HAK AKSES PERAWAT (Terhubung dengan Supabase Auth)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'perawat' CHECK (role IN ('pengelola', 'perawat')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'aktif', 'nonaktif')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeks untuk pencarian cepat profil
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

-- Keamanan Row Level Security (RLS) Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh profil pengguna" ON public.profiles;
CREATE POLICY "Akses penuh profil pengguna" 
  ON public.profiles 
  FOR ALL 
  TO authenticated, anon, service_role 
  USING (true) 
  WITH CHECK (true);

-- Fungsi & RPC Penghapusan Akun Permanen (Hapus dari profiles dan auth.users)
CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO anon, authenticated, service_role;

-- Trigger Otomatis Pendaftaran Pengguna Baru
-- Pengguna pertama yang mendaftar otomatis menjadi pengelola (Super Admin) & aktif
-- Pengguna berikutnya berstatus pending dan is_verified mengikuti konfirmasi email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT := 'perawat';
  v_status TEXT := 'pending';
  v_verified BOOLEAN := false;
  v_pengelola_count INT;
BEGIN
  SELECT count(*) INTO v_pengelola_count FROM public.profiles WHERE role = 'pengelola';

  IF v_pengelola_count = 0 THEN
    v_role := 'pengelola';
    v_status := 'aktif';
    v_verified := true;
  ELSE
    v_verified := (new.email_confirmed_at IS NOT NULL);
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, status, is_verified)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    v_role,
    v_status,
    v_verified
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    is_verified = CASE 
      WHEN EXCLUDED.is_verified THEN true 
      ELSE public.profiles.is_verified 
    END,
    updated_at = now();

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger update status verifikasi saat email dikonfirmasi
CREATE OR REPLACE FUNCTION public.handle_user_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF new.email_confirmed_at IS NOT NULL AND old.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET is_verified = true, updated_at = now()
    WHERE id = new.id;
  END IF;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_user_verification();


-- ==============================================================================
-- 2. TABEL PASIEN RUANG HCU
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pasien_hcu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('L', 'P')),
  rm TEXT NOT NULL,
  bed TEXT NOT NULL,
  care_level TEXT NOT NULL CHECK (care_level IN ('total', 'parsial', 'minimal')),
  admission_date TEXT NOT NULL,
  admission_time TEXT NOT NULL,
  admission_shift_key TEXT NOT NULL,
  nurse_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'keluar')),
  discharge_date TEXT,
  discharge_time TEXT,
  discharge_shift_key TEXT,
  discharge_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeks pencarian pasien
CREATE INDEX IF NOT EXISTS idx_pasien_hcu_bed ON public.pasien_hcu (bed);
CREATE INDEX IF NOT EXISTS idx_pasien_hcu_status ON public.pasien_hcu (status);
CREATE INDEX IF NOT EXISTS idx_pasien_hcu_rm ON public.pasien_hcu (rm);

-- Keamanan Row Level Security (RLS) Pasien
ALTER TABLE public.pasien_hcu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh pasien_hcu" ON public.pasien_hcu;
CREATE POLICY "Akses penuh pasien_hcu" 
  ON public.pasien_hcu 
  FOR ALL 
  TO authenticated, anon, service_role 
  USING (true) 
  WITH CHECK (true);


-- ==============================================================================
-- 3. TABEL MASTER ALAT MEDIS (KATALOG RUANG HCU: 'waktu' & 'kali')
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.master_alat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('waktu', 'kali')),
  total_units INTEGER NOT NULL DEFAULT 0,
  has_unit_number BOOLEAN NOT NULL DEFAULT false,
  unit_start_number INTEGER,
  unit_end_number INTEGER,
  numbered_units_count INTEGER,
  applicable_locations TEXT[],
  subtypes TEXT[],
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_master_alat_category ON public.master_alat (category);

ALTER TABLE public.master_alat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh master_alat" ON public.master_alat;
CREATE POLICY "Akses penuh master_alat" 
  ON public.master_alat 
  FOR ALL 
  TO authenticated, anon, service_role 
  USING (true) 
  WITH CHECK (true);


-- ==============================================================================
-- 4. TABEL ALAT HITUNGAN WAKTU (PEMAKAIAN BERDURASI & BER-TIMER)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alat_waktu (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bed TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_rm TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  unit_number INTEGER,
  status TEXT NOT NULL CHECK (status IN ('berjalan', 'selesai')),
  start_time_str TEXT NOT NULL,
  end_time_str TEXT,
  started_at_timestamp BIGINT NOT NULL,
  ended_at_timestamp BIGINT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  accumulated_minutes INTEGER NOT NULL DEFAULT 0,
  nurse_name TEXT NOT NULL,
  stop_nurse_name TEXT,
  locations TEXT[] DEFAULT '{}',
  shift_key TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alat_waktu_bed ON public.alat_waktu (bed);
CREATE INDEX IF NOT EXISTS idx_alat_waktu_status ON public.alat_waktu (status);
CREATE INDEX IF NOT EXISTS idx_alat_waktu_patient_rm ON public.alat_waktu (patient_rm);

ALTER TABLE public.alat_waktu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh alat_waktu" ON public.alat_waktu;
CREATE POLICY "Akses penuh alat_waktu" 
  ON public.alat_waktu 
  FOR ALL 
  TO authenticated, anon, service_role 
  USING (true) 
  WITH CHECK (true);


-- ==============================================================================
-- 5. TABEL ALAT HITUNGAN KALI (FREKUENSI TINDAKAN / PROSEDUR MEDIS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alat_kali (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bed TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_rm TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  last_action_time TEXT NOT NULL,
  nurse_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alat_kali_bed ON public.alat_kali (bed);
CREATE INDEX IF NOT EXISTS idx_alat_kali_patient_rm ON public.alat_kali (patient_rm);

ALTER TABLE public.alat_kali ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh alat_kali" ON public.alat_kali;
CREATE POLICY "Akses penuh alat_kali" 
  ON public.alat_kali 
  FOR ALL 
  TO authenticated, anon, service_role 
  USING (true) 
  WITH CHECK (true);


-- ==============================================================================
-- 6. TABEL LAPORAN ALAT RUSAK & PEMELIHARAAN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alat_rusak (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_numbers INTEGER[] NOT NULL DEFAULT '{}',
  report_date TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('rusak_ringan', 'rusak_berat', 'dalam_perbaikan')),
  notes TEXT,
  reported_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alat_rusak_tool_name ON public.alat_rusak (tool_name);
CREATE INDEX IF NOT EXISTS idx_alat_rusak_severity ON public.alat_rusak (severity);

ALTER TABLE public.alat_rusak ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh alat_rusak" ON public.alat_rusak;
CREATE POLICY "Akses penuh alat_rusak" 
  ON public.alat_rusak 
  FOR ALL 
  TO authenticated, anon, service_role 
  USING (true) 
  WITH CHECK (true);
