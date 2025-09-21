-- SQL commands to run in Supabase SQL Editor to set up the admin system

-- 1. Create products table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    price text NOT NULL,
    category text NOT NULL,
    images jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add role column to profiles table (if it doesn't exist)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 3. Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Set up RLS policies for products table

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow all users to read products
CREATE POLICY "Products are viewable by everyone" ON public.products
    FOR SELECT USING (true);

-- Only admins can insert products
CREATE POLICY "Only admins can insert products" ON public.products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can update products
CREATE POLICY "Only admins can update products" ON public.products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can delete products
CREATE POLICY "Only admins can delete products" ON public.products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 5. Set up storage policies for images bucket

-- Allow all users to view images
CREATE POLICY "Images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

-- Only admins can upload images
CREATE POLICY "Only admins can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Only admins can delete images
CREATE POLICY "Only admins can delete images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'images' 
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 6. Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. To make a user admin, update their profile:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';