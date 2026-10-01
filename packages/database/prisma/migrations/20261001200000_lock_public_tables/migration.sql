-- Kunci semua tabel aplikasi dari Supabase Data API (role anon / authenticated).
-- Aplikasi hanya mengakses database lewat Prisma (role pemilik tabel, tidak terkena RLS),
-- jadi ini tidak mengubah perilaku aplikasi — hanya menutup akses langsung via REST/anon key.
-- Aman dijalankan di Postgres non-Supabase: role yang tidak ada dilewati.
DO $$
DECLARE
  t record;
  has_anon boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon');
  has_auth boolean := EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated');
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    IF has_anon THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t.tablename);
    END IF;
    IF has_auth THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', t.tablename);
    END IF;
  END LOOP;

  -- Tabel yang dibuat belakangan (mis. dibuat otomatis saat runtime) ikut tertutup.
  IF has_anon THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon';
  END IF;
  IF has_auth THEN
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated';
  END IF;
END $$;
