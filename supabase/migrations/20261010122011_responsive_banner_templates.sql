-- Preserve existing image campaigns; new campaigns use responsive text.
ALTER TABLE public.banners
  ADD COLUMN template text NOT NULL DEFAULT 'image',
  ADD COLUMN cta_label text;
ALTER TABLE public.banners
  ADD CONSTRAINT banners_template_valid CHECK (template IN ('image', 'classic', 'informational', 'promotional')),
  ADD CONSTRAINT banners_structured_copy_valid CHECK (
    template = 'image' OR (
      char_length(btrim(title)) BETWEEN 1 AND 100
      AND (description IS NULL OR char_length(description) <= 500)
      AND (
        (link_url IS NULL AND cta_label IS NULL)
        OR (link_url IS NOT NULL AND char_length(btrim(link_url)) BETWEEN 1 AND 2048
          AND cta_label IS NOT NULL AND char_length(btrim(cta_label)) BETWEEN 1 AND 40)
      )
    )
  );
-- Preserve public reading; restrict management to active administrators.
DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can select banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can insert banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can update banners" ON public.banners;
DROP POLICY IF EXISTS "Admins can delete banners" ON public.banners;
CREATE POLICY "Admins can select banners" ON public.banners
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY "Admins can insert banners" ON public.banners
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins can update banners" ON public.banners
  FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Admins can delete banners" ON public.banners
  FOR DELETE TO authenticated USING ((SELECT public.is_admin()));
