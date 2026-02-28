-- Fix blog_posts RLS to cleanly allow Admin INSERTS

DROP POLICY IF EXISTS "Admins can manage posts" ON public.blog_posts;

CREATE POLICY "Admins can manage posts" ON public.blog_posts
  FOR ALL 
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
