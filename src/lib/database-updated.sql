-- CORRECTED Database setup for Fairy Bloom e-shop
-- This fixes the JWT operator error and price column type issues

-- Drop existing products table if it exists with wrong schema
DROP TABLE IF EXISTS public.products CASCADE;

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

-- Create products table with TEXT price field (not numeric)
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price TEXT NOT NULL, -- TEXT type to support "2 890 Kč" format
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

-- SIMPLIFIED RLS Policies for profiles table to prevent infinite recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for products table
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products
    FOR SELECT USING (true);

-- FIXED admin policies - using only profile table lookup
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

-- Function to make a user admin (improved)
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
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
GRANT SELECT ON public.products TO anon;
GRANT EXECUTE ON FUNCTION make_user_admin(TEXT) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'Products table created with TEXT price column.';
    RAISE NOTICE 'To make yourself an admin, run:';
    RAISE NOTICE 'SELECT make_user_admin(''your-email@example.com'');';
    RAISE NOTICE 'Then add products through the admin interface.';
END
$$;

COMMENT ON TABLE public.profiles IS 'User profiles with additional information';
COMMENT ON TABLE public.products IS 'Product catalog with TEXT price field for Czech format';
COMMENT ON FUNCTION make_user_admin(TEXT) IS 'Helper function to grant admin privileges to a user';