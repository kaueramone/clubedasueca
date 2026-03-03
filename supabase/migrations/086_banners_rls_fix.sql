-- Migration 086: Fix Admin Banners Insert RLS

-- The "FOR ALL USING" policy sometimes fails on inserts in Supabase if a WITH CHECK is missing or if the active state causes a conflict.
-- Let's drop the generic ALL policy and create explicit ones.

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can select banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can insert banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.banners;

CREATE POLICY "Admins can select banners" ON public.banners
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Admins can insert banners" ON public.banners
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Admins can update banners" ON public.banners
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "Admins can delete banners" ON public.banners
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
