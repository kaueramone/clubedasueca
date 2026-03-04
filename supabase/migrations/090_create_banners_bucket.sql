-- ============================================
-- Migration 090: Create Banners Storage Bucket
-- ============================================

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Banners are publicly accessible." 
ON storage.objects FOR SELECT 
USING (bucket_id = 'banners');

-- Admin write access
CREATE POLICY "Admins can upload banners." 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'banners' 
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Admin update access
CREATE POLICY "Admins can update banners." 
ON storage.objects FOR UPDATE 
WITH CHECK (
    bucket_id = 'banners' 
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Admin delete access
CREATE POLICY "Admins can delete banners." 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'banners' 
    AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);
