-- Reads the webhook token at execution time; no secret is stored in pg_trigger.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'app_community_webhook_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'app_community_webhook_secret',
      'Bearer token shared with Vercel COMMUNITY_WEBHOOK_SECRET (production)'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION private.send_community_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  webhook_secret text;
BEGIN
  SELECT decrypted_secret INTO webhook_secret
  FROM vault.decrypted_secrets
  WHERE name = 'app_community_webhook_secret';

  IF webhook_secret IS NULL OR length(webhook_secret) < 32 THEN
    RAISE WARNING 'Community webhook secret is not configured';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://clubedasueca.vercel.app/api/community/respond',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || webhook_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'record', to_jsonb(NEW),
      'old_record', NULL
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.send_community_webhook() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.send_community_webhook() TO postgres;

DROP TRIGGER IF EXISTS global_chat_bot ON public.global_messages;
CREATE TRIGGER global_chat_bot
AFTER INSERT ON public.global_messages
FOR EACH ROW EXECUTE FUNCTION private.send_community_webhook();
