-- Migration 085: Chat Search and Affiliates RLS Fix

-- 1. Add email to profiles to allow chat search
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 2. Modify trigger to insert email automatically for new users
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

    -- INSERT PROFILE WITH EMAIL
    INSERT INTO public.profiles (id, username, full_name, avatar_url, birth_date, nationality, email)
    VALUES (new.id, v_username, v_full_name, v_avatar_url, v_birth_date, v_nationality, new.email);
    
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


-- 3. Create a SECURITY DEFINER function to bypass RLS for Admin Affiliate Approvals
CREATE OR REPLACE FUNCTION public.update_affiliate_status_admin(
  p_affiliate_id UUID,
  p_status TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  -- Verify the caller is an admin
  SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
  
  IF v_admin_role != 'admin' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permissão negada (Não é admin)');
  END IF;

  -- Update the affiliate status bypassing RLS (since it's SECURITY DEFINER)
  UPDATE public.affiliates
  SET status = p_status::affiliate_status, updated_at = NOW()
  WHERE id = p_affiliate_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
