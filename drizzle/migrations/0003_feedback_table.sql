CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_campaign int NOT NULL CHECK (rating_campaign BETWEEN 1 AND 5),
  rating_app int NOT NULL CHECK (rating_app BETWEEN 1 AND 5),
  recommend boolean,
  liked text NOT NULL DEFAULT '',
  improve text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;