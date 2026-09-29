CREATE TABLE public.push_tokens (token text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.push_tokens TO service_role;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;