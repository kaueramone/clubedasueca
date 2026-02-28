-- ============================================
-- Migration 084: Fix Registration Trigger
-- Robust profile, wallet, metrics and VIP initialization
-- ============================================

-- 1. Drop old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create improved function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
    v_full_name TEXT;
    v_avatar_url TEXT;
    v_birth_date DATE;
    v_nationality TEXT;
    v_suffix INTEGER := 0;
BEGIN
    -- Extract metadata
    v_full_name := new.raw_user_meta_data->>'full_name';
    v_avatar_url := new.raw_user_meta_data->>'avatar_url';
    v_nationality := new.raw_user_meta_data->>'nationality';
    
    -- Parse birth_date safely
    BEGIN
        v_birth_date := (new.raw_user_meta_data->>'birth_date')::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_birth_date := NULL;
    END;

    -- Generate initial username from full_name or email prefix
    IF v_full_name IS NOT NULL AND v_full_name != '' THEN
        v_username := v_full_name;
    ELSE
        v_username := split_part(new.email, '@', 1);
    END IF;

    -- Ensure username uniqueness
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
        v_suffix := v_suffix + 1;
        v_username := (CASE 
            WHEN v_full_name IS NOT NULL AND v_full_name != '' THEN v_full_name 
            ELSE split_part(new.email, '@', 1) 
        END) || v_suffix::text;
    END LOOP;

    -- INSERT PROFILE
    INSERT INTO public.profiles (id, username, full_name, avatar_url, birth_date, nationality)
    VALUES (new.id, v_username, v_full_name, v_avatar_url, v_birth_date, v_nationality);
    
    -- INSERT WALLET
    INSERT INTO public.wallets (user_id, balance)
    VALUES (new.id, 0.00);

    -- INSERT METRICS
    INSERT INTO public.user_metrics (user_id)
    VALUES (new.id);

    -- INSERT VIP
    INSERT INTO public.user_vip (user_id, level_id)
    VALUES (new.id, 1);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
