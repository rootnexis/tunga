-- Creates `profiles` table and related triggers/policies if missing,
-- then promotes sam@gmail.com to `admin` if that user exists.

-- 1) Ensure enum `user_role` exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM (
      'customer', 'staff', 'manager', 'admin', 'super_admin'
    );
  END IF;
END
$$;

-- 2) Create profiles table if missing
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role   NOT NULL DEFAULT 'customer',
  first_name      text,
  last_name       text,
  phone           text,
  avatar_url      text,
  is_active       boolean     NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 3) Insert trigger function to auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4) Create trigger on auth.users only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- 5) set_updated_at function and trigger for profiles
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at') THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

-- 6) Enable RLS on profiles (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7) Helper: get_my_role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 8) Policies (create only if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON public.profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (
        auth.uid() = id
        AND (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Staff can view all profiles'
  ) THEN
    CREATE POLICY "Staff can view all profiles"
      ON public.profiles FOR SELECT
      USING (get_my_role() IN ('staff', 'manager', 'admin', 'super_admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Super admin can manage all profiles'
  ) THEN
    CREATE POLICY "Super admin can manage all profiles"
      ON public.profiles FOR ALL
      USING (get_my_role() = 'super_admin');
  END IF;
END
$$;

-- 9) Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_profiles_role' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_profiles_role ON public.profiles(role);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i' AND c.relname = 'idx_profiles_is_active' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
  END IF;
END
$$;

-- 10) Promote sam@gmail.com to admin if user exists
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sam@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    -- ensure a profile row exists for the user
    INSERT INTO public.profiles (id)
    VALUES (v_user_id)
    ON CONFLICT (id) DO NOTHING;

    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = v_user_id;

    RAISE NOTICE 'User % promoted to admin', 'sam@gmail.com';
  ELSE
    RAISE NOTICE 'User sam@gmail.com not found in auth.users; create user first.';
  END IF;
END
$$;

-- Done

