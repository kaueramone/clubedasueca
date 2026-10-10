# Community support upgrade — 2026-10-10

Claude Haiku 5.5 is the primary provider; Groq/Llama is the existing fallback on provider failure. The supplied Anthropic credential was validated with the official models and Messages APIs and configured as a sensitive production variable. No provider secret is in source or client bundles.

The authenticated database webhook retains the atomic receipt and three-requests-per-sender-per-minute limit. It reads the stored triggering message and up to 24 messages from the previous 15 minutes, never trusts webhook text, and ignores stale events. Names and account IDs are replaced with participant aliases; common credentials, links, emails and phone-like numbers are removed before sending public conversation text to providers. It does not read private support conversations, balances, authentication records or player hands.

The model chooses silence, a platform answer, a fixed scope refusal, or a fixed private-support referral. Explicit player mentions are ignored before inference. Context resolves follow-ups from the same speaker. Trusted knowledge covers 16 product topics; user content and previous bot replies cannot add official facts. Public answers require recognised knowledge IDs, remain within 500 characters, reject credential-looking output and external destinations, and include a fictional-credit qualifier for financial topics. The bot has no tools or account/game mutation capabilities. These controls reduce model mistakes; topic IDs alone are not a mathematical guarantee of factual accuracy.

The 500-character database constraint already existed in production; migration 20261010163638 records it for reproducible installations. Player input still has the existing 200-character application limit.

Validation:
- 52 isolated context/privacy/provider/webhook tests passed, including duplicate, unauthorised, stale, recursive bot and context-read-failure events.
- 24 synthetic conversations passed against the live Claude API using the actual application AI module. Evidence: community-bot-live-evaluation-2026-10-10.json. These scenarios do not certify all possible model behaviour.
- Full application tests, 172 isolated PostgreSQL checks, typecheck, scoped ESLint and production build passed.
- Existing Supabase advisor findings remain: intentional public-directory definer views, audited privileged RPCs, private deny-all RLS tables and leaked-password protection disabled. No roles or RLS policies were expanded by this change.

References used for the provider integration:
- https://platform.claude.com/docs/en/api/messages/create
- https://platform.claude.com/docs/en/api/models/list
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs

Maintenance: update src/features/global-chat/knowledge.ts with changes to product behaviour, offers, licensing or payment availability. Never populate it from untrusted community messages. Repeat the synthetic live evaluation after a model/prompt change. Production release and end-to-end test evidence will be appended after deployment.
