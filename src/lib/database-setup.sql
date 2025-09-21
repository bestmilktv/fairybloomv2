-- Database setup for Fairy Bloom e-shop
-- Run this script in your Supabase SQL editor

-- First, enable RLS on auth.users if not already enabled
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table with proper constraints
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    newsletter_consent BOOLEAN NOT NULL DEFAULT false,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(email)
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Note: Removed "Admins can view all profiles" policy to prevent infinite recursion
-- Admin access to all profiles should be handled at the application level
-- The basic policy "Users can view own profile" is sufficient for profile access

-- RLS Policies for products table
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
CREATE POLICY "Only admins can insert products" ON public.products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
CREATE POLICY "Only admins can update products" ON public.products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;
CREATE POLICY "Only admins can delete products" ON public.products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Storage policies for images bucket
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
CREATE POLICY "Anyone can view images" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

DROP POLICY IF EXISTS "Only admins can upload images" ON storage.objects;
CREATE POLICY "Only admins can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Only admins can update images" ON storage.objects;
CREATE POLICY "Only admins can update images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Only admins can delete images" ON storage.objects;
CREATE POLICY "Only admins can delete images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'images' AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
DROP TRIGGER IF EXISTS profiles_handle_updated_at ON public.profiles;
CREATE TRIGGER profiles_handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

-- Trigger for products table
DROP TRIGGER IF EXISTS products_handle_updated_at ON public.products;
CREATE TRIGGER products_handle_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();

-- Function to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, gender, newsletter_consent, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'gender', 'other'),
        COALESCE((NEW.raw_user_meta_data->>'newsletter_consent')::boolean, false),
        'user'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_new_user();

-- Create a test admin user function (for development)
CREATE OR REPLACE FUNCTION create_admin_user(user_email TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE email = user_email;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'User with email % not found. Please register first, then run this function.', user_email;
    ELSE
        RAISE NOTICE 'User % has been granted admin privileges.', user_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Allow anon users to read products (for public pages)
GRANT SELECT ON public.products TO anon;

COMMENT ON TABLE public.profiles IS 'User profiles with additional information';
COMMENT ON TABLE public.products IS 'Product catalog for the e-shop';
COMMENT ON FUNCTION create_admin_user(TEXT) IS 'Helper function to grant admin privileges to a user';