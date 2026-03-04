-- ============================================
-- Migration 089: Add Mobile Image URL to Banners
-- ============================================

ALTER TABLE public.banners
ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;
