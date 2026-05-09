
-- 1. App users (custom auth)
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  pin text NOT NULL CHECK (pin ~ '^[0-9]{4}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- 2. Add spectator role
ALTER TYPE public.character_role ADD VALUE IF NOT EXISTS 'spectator';

-- 3. Campaign ownership
ALTER TABLE public.campaigns ADD COLUMN owner_user_id uuid;

-- 4. Character ownership
ALTER TABLE public.characters ADD COLUMN user_id uuid;

-- 5. Campaign membership
CREATE TABLE public.campaign_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'player',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.campaign_members FOR ALL USING (true) WITH CHECK (true);

-- 6. Backfill: create app_user per existing character (ensure unique usernames)
DO $$
DECLARE
  c RECORD;
  uid uuid;
  uname text;
  i int;
BEGIN
  FOR c IN SELECT * FROM public.characters ORDER BY created_at LOOP
    uname := c.name;
    i := 1;
    WHILE EXISTS (SELECT 1 FROM public.app_users WHERE username = uname) LOOP
      i := i + 1;
      uname := c.name || i::text;
    END LOOP;
    INSERT INTO public.app_users (username, pin) VALUES (uname, '1234') RETURNING id INTO uid;
    UPDATE public.characters SET user_id = uid WHERE id = c.id;
    INSERT INTO public.campaign_members (campaign_id, user_id, role)
      VALUES (c.campaign_id, uid, c.role::text)
      ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 7. Backfill campaign owners (first DM, otherwise first member)
UPDATE public.campaigns ca
SET owner_user_id = (
  SELECT user_id FROM public.campaign_members m
  WHERE m.campaign_id = ca.id
  ORDER BY (m.role = 'dm') DESC, m.created_at ASC
  LIMIT 1
);
