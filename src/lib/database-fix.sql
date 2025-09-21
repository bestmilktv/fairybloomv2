-- COMPREHENSIVE AUTHENTICATION FIX
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Fix the infinite recursion in RLS policies
-- The issue is that product policies reference profiles table, creating circular dependency

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can update products" ON public.products;
DROP POLICY IF EXISTS "Only admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Only admins can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can update images" ON storage.objects;
DROP POLICY IF EXISTS "Only admins can delete images" ON storage.objects;

-- Create simplified admin policies using auth.jwt() claims
-- This avoids the circular dependency on profiles table

-- Products admin policies (using JWT claims instead of profiles lookup)
CREATE POLICY "Only admins can insert products" ON public.products
    FOR INSERT WITH CHECK (
        (auth.jwt() ->> 'role')::text = 'admin' OR
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "Only admins can update products" ON public.products
    FOR UPDATE USING (
        (auth.jwt() ->> 'role')::text = 'admin' OR
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

CREATE POLICY "Only admins can delete products" ON public.products
    FOR DELETE USING (
        (auth.jwt() ->> 'role')::text = 'admin' OR
        auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
        )
    );

-- Storage admin policies
CREATE POLICY "Only admins can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' AND (
            (auth.jwt() ->> 'role')::text = 'admin' OR
            auth.uid() IN (
                SELECT id FROM public.profiles WHERE role = 'admin'
            )
        )
    );

CREATE POLICY "Only admins can update images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'images' AND (
            (auth.jwt() ->> 'role')::text = 'admin' OR
            auth.uid() IN (
                SELECT id FROM public.profiles WHERE role = 'admin'
            )
        )
    );

CREATE POLICY "Only admins can delete images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'images' AND (
            (auth.jwt() ->> 'role')::text = 'admin' OR
            auth.uid() IN (
                SELECT id FROM public.profiles WHERE role = 'admin'
            )
        )
    );

-- Step 2: Create function to update user JWT claims when role changes
CREATE OR REPLACE FUNCTION update_user_role_claims()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the user's JWT claims to include the role
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update JWT claims when profile role changes
DROP TRIGGER IF EXISTS update_user_claims_on_role_change ON public.profiles;
CREATE TRIGGER update_user_claims_on_role_change
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE PROCEDURE update_user_role_claims();

-- Step 3: Fix the user creation trigger to properly handle metadata
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
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create helper function to make a user admin
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_id UUID;
    result_message TEXT;
BEGIN
    -- Find user by email
    SELECT id INTO user_id 
    FROM public.profiles 
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        result_message := 'User with email ' || user_email || ' not found';
        RAISE NOTICE '%', result_message;
        RETURN result_message;
    END IF;
    
    -- Update profile role
    UPDATE public.profiles 
    SET role = 'admin', updated_at = now()
    WHERE id = user_id;
    
    -- Update auth.users metadata
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
    WHERE id = user_id;
    
    result_message := 'User ' || user_email || ' is now an admin';
    RAISE NOTICE '%', result_message;
    RETURN result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant appropriate permissions
GRANT EXECUTE ON FUNCTION make_user_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role_claims() TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database fix completed successfully!';
    RAISE NOTICE 'To make your current user an admin, run:';
    RAISE NOTICE 'SELECT make_user_admin(''your-email@example.com'');';
END
$$;