CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  trip text NOT NULL,
  trip_date text,
  contact_email text NOT NULL,
  contact_phone text NOT NULL,
  room_pref text,
  notes text,
  travelers jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  payment_status text NOT NULL DEFAULT 'unpaid',
  paid_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  admin_notes text
);
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS staff boolean NOT NULL DEFAULT false;