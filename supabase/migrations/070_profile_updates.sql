-- Migrar tabela profiles para incluir full_name, data de nascimento e nacionalidade
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS nationality TEXT;

-- Index opcional para consultas de nacionalidade (útil para lideranças/rankings no futuro)
CREATE INDEX IF NOT EXISTS idx_profiles_nationality ON public.profiles(nationality);
