-- Migration 088: Set Admin Roles for specific emails
-- The frontend allows 'kaueramone@live.com' to see the Admin UI, but the RLS policies require the user's profile to actually have role = 'admin'.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'kaueramone@live.com';
