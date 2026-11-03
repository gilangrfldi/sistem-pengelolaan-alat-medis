-- ==============================================================================
-- SKEMA LENGKAP DATABASE SUPABASE: SISTEM PENGELOLAAN ALAT MEDIS RUANG HCU
-- VERSI KEAMANAN PRE-LAUNCH (STRICT RLS, PARAMETERIZED RPC, SECURE CONSTRAINTS)
-- ==============================================================================
-- CARA PENGGUNAAN:
-- Salin seluruh isi file ini, lalu jalankan di:
-- Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- Aktifkan ekstensi pgcrypto jika belum aktif
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ==============================================================================
-- HELPER FUNCTIONS KEAMANAN ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Fungsi verifikasi apakah pengguna saat ini adalah Pengelola HCU aktif
CREATE OR REPLACE FUNCTION public.is_pengelola()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'pengelola' AND status = 'aktif'
  );
$$;

-- Fungsi verifikasi apakah pengguna saat ini adalah staf medis yang telah aktif
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND status = 'aktif'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_pengelola() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated, service_role;


-- ==============================================================================
-- 1. TABEL PROFIL PENGGUNA & HAK AKSES PERAWAT (Terhubung dengan auth.users)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 150),
  email TEXT UNIQUE NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255),
  role TEXT NOT NULL DEFAULT 'perawat' CHECK (role IN ('pengelola', 'perawat')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'aktif', 'nonaktif')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indeks performa pencarian profil
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);

-- Keamanan Row Level Security (RLS) Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh profil pengguna" ON public.profiles;
DROP POLICY IF EXISTS "Lihat profil pengguna" ON public.profiles;
DROP POLICY IF EXISTS "Tambah profil pengguna sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Ubah profil pengguna sendiri" ON public.profiles;
DROP POLICY IF EXISTS "Hapus profil pengguna" ON public.profiles;

-- Pengguna terautentikasi dapat melihat profil miliknya sendiri, pengelola atau staf aktif dapat melihat daftar perawat
CREATE POLICY "Lihat profil pengguna"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR 
    public.is_pengelola() OR 
    public.is_active_staff()
  );

-- Pendaftaran profil mandiri hanya untuk ID pengguna yang sesuai dengan auth.uid()
CREATE POLICY "Tambah profil pengguna sendiri"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Perubahan profil: staf hanya dapat mengubah nama sendiri tanpa mengubah role/status, pengelola dapat mengubah semuanya
CREATE POLICY "Ubah profil pengguna sendiri"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_pengelola())
  WITH CHECK (
    public.is_pengelola() OR (
      auth.uid() = id AND 
      role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND
      status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- Penghapusan profil hanya diizinkan untuk pengelola aktif (dan tidak dapat menghapus diri sendiri melalui RLS)
CREATE POLICY "Hapus profil pengguna"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_pengelola() AND id <> auth.uid());


-- ==============================================================================
-- FUNGSI & RPC: PENGHAPUSAN AKUN PERMANEN (Hanya Pengelola Aktif)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_status TEXT;
  v_target_role TEXT;
BEGIN
  -- 1. Verifikasi pemanggil terautentikasi
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: pengguna belum diautentikasi.';
  END IF;

  -- 2. Verifikasi hak akses pemanggil harus role 'pengelola' dan status 'aktif'
  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role <> 'pengelola' OR v_caller_status <> 'aktif' THEN
    RAISE EXCEPTION 'Akses ditolak: hanya pengelola aktif yang dapat menghapus akun.';
  END IF;

  -- 3. Pengelola tidak dapat menghapus akun sendiri via RPC
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Pengelola tidak dapat menghapus akun sendiri.';
  END IF;

  -- 4. Verifikasi peran akun target (mencegah penghapusan pengelola lain secara sembarangan)
  SELECT role INTO v_target_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_target_role = 'pengelola' THEN
    RAISE EXCEPTION 'Akun pengelola tidak dapat dihapus.';
  END IF;

  -- 5. Eksekusi penghapusan dari tabel profiles dan auth.users
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Cabut akses anonim, hanya berikan izin eksekusi ke authenticated dan service_role
REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated, service_role;


-- ==============================================================================
-- TRIGGER OTOMATIS: PENDAFTARAN & VERIFIKASI PENGGUNA BARU
-- ==============================================================================

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
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 150),
  gender TEXT NOT NULL CHECK (gender IN ('L', 'P')),
  rm TEXT NOT NULL CHECK (char_length(rm) BETWEEN 1 AND 50),
  bed TEXT NOT NULL CHECK (char_length(bed) BETWEEN 1 AND 50),
  care_level TEXT NOT NULL CHECK (care_level IN ('total', 'parsial', 'minimal')),
  admission_date TEXT NOT NULL,
  admission_time TEXT NOT NULL,
  admission_shift_key TEXT NOT NULL,
  nurse_name TEXT NOT NULL CHECK (char_length(nurse_name) BETWEEN 1 AND 150),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'keluar')),
  discharge_date TEXT,
  discharge_time TEXT,
  discharge_shift_key TEXT,
  discharge_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pasien_hcu_bed ON public.pasien_hcu (bed);
CREATE INDEX IF NOT EXISTS idx_pasien_hcu_status ON public.pasien_hcu (status);
CREATE INDEX IF NOT EXISTS idx_pasien_hcu_rm ON public.pasien_hcu (rm);

ALTER TABLE public.pasien_hcu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh pasien_hcu" ON public.pasien_hcu;
DROP POLICY IF EXISTS "Baca data pasien_hcu" ON public.pasien_hcu;
DROP POLICY IF EXISTS "Tambah data pasien_hcu" ON public.pasien_hcu;
DROP POLICY IF EXISTS "Ubah data pasien_hcu" ON public.pasien_hcu;
DROP POLICY IF EXISTS "Hapus data pasien_hcu" ON public.pasien_hcu;

CREATE POLICY "Baca data pasien_hcu"
  ON public.pasien_hcu
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola());

CREATE POLICY "Tambah data pasien_hcu"
  ON public.pasien_hcu
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_staff() OR public.is_pengelola());

CREATE POLICY "Ubah data pasien_hcu"
  ON public.pasien_hcu
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola())
  WITH CHECK (public.is_active_staff() OR public.is_pengelola());

CREATE POLICY "Hapus data pasien_hcu"
  ON public.pasien_hcu
  FOR DELETE
  TO authenticated
  USING (public.is_pengelola());


-- ==============================================================================
-- 3. TABEL MASTER ALAT MEDIS (KATALOG RUANG HCU)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.master_alat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 150),
  category TEXT NOT NULL CHECK (category IN ('waktu', 'kali')),
  total_units INTEGER NOT NULL DEFAULT 0 CHECK (total_units >= 0 AND total_units <= 1000),
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
DROP POLICY IF EXISTS "Baca master_alat" ON public.master_alat;
DROP POLICY IF EXISTS "Kelola master_alat" ON public.master_alat;

CREATE POLICY "Baca master_alat"
  ON public.master_alat
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola());

CREATE POLICY "Kelola master_alat"
  ON public.master_alat
  FOR ALL
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola())
  WITH CHECK (public.is_active_staff() OR public.is_pengelola());


-- ==============================================================================
-- 4. TABEL ALAT HITUNGAN WAKTU (PEMAKAIAN BERDURASI & TIMER)
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
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  accumulated_minutes INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_minutes >= 0),
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
DROP POLICY IF EXISTS "Baca alat_waktu" ON public.alat_waktu;
DROP POLICY IF EXISTS "Kelola alat_waktu" ON public.alat_waktu;

CREATE POLICY "Baca alat_waktu"
  ON public.alat_waktu
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola());

CREATE POLICY "Kelola alat_waktu"
  ON public.alat_waktu
  FOR ALL
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola())
  WITH CHECK (public.is_active_staff() OR public.is_pengelola());


-- ==============================================================================
-- 5. TABEL ALAT HITUNGAN KALI (FREKUENSI TINDAKAN / PROSEDUR MEDIS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alat_kali (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bed TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  patient_rm TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1 CHECK (count >= 1 AND count <= 1000),
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
DROP POLICY IF EXISTS "Baca alat_kali" ON public.alat_kali;
DROP POLICY IF EXISTS "Kelola alat_kali" ON public.alat_kali;

CREATE POLICY "Baca alat_kali"
  ON public.alat_kali
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola());

CREATE POLICY "Kelola alat_kali"
  ON public.alat_kali
  FOR ALL
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola())
  WITH CHECK (public.is_active_staff() OR public.is_pengelola());


-- ==============================================================================
-- 6. TABEL LAPORAN ALAT RUSAK & PEMELIHARAAN
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.alat_rusak (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 1000),
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
DROP POLICY IF EXISTS "Baca alat_rusak" ON public.alat_rusak;
DROP POLICY IF EXISTS "Kelola alat_rusak" ON public.alat_rusak;

CREATE POLICY "Baca alat_rusak"
  ON public.alat_rusak
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola());

CREATE POLICY "Kelola alat_rusak"
  ON public.alat_rusak
  FOR ALL
  TO authenticated
  USING (public.is_active_staff() OR public.is_pengelola())
  WITH CHECK (public.is_active_staff() OR public.is_pengelola());
