
CREATE TABLE IF NOT EXISTS public.boosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  name text NOT NULL,
  rarity item_rarity NOT NULL DEFAULT 'white',
  uses integer NOT NULL DEFAULT 1,
  max_uses integer NOT NULL DEFAULT 1,
  owner_character_id uuid NULL,
  in_dm_vault boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.boosters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.boosters FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.boosters;
ALTER TABLE public.boosters REPLICA IDENTITY FULL;

ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS backpack_slots integer NOT NULL DEFAULT 12;
