-- Bot profile for the community chat assistant
-- The bot uses a fixed UUID that must match NEXT_PUBLIC_BOT_USER_ID in env

DO $$
DECLARE
    bot_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. Insert a stub row in auth.users so the FK on profiles.id is satisfied.
    --    The bot never logs in; email/encrypted_password are placeholders.
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    )
    VALUES (
        bot_id,
        'bot@clubedasueca.internal',
        '',
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false,
        'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert the public profile (FK now satisfied).
    INSERT INTO profiles (id, username, avatar_url, created_at)
    VALUES (
        bot_id,
        'Sueca Bot',
        null,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET username = 'Sueca Bot';
END $$;
