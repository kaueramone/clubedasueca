-- Production already uses 500; record the contract so fresh databases agree.
-- The player compose field/action remain limited to 200 characters.
BEGIN;
ALTER TABLE public.global_messages
  DROP CONSTRAINT IF EXISTS global_messages_content_check;
ALTER TABLE public.global_messages
  ADD CONSTRAINT global_messages_content_check CHECK (char_length(content) BETWEEN 1 AND 500);
COMMIT;
