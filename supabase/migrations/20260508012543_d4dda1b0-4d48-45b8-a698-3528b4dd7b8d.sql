
-- Enums
CREATE TYPE public.character_role AS ENUM ('dm','player');
CREATE TYPE public.item_rarity AS ENUM ('white','blue','purple','gold');
CREATE TYPE public.equipment_slot AS ENUM (
  'casco','pecho','pantalon','botas','cinturon',
  'accesorio1','accesorio2','mochila','arma_principal',
  'arma_secundaria','guantes','aditamento'
);

-- Campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_players int NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Characters
CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  role public.character_role NOT NULL DEFAULT 'player',
  race text DEFAULT '',
  class text DEFAULT '',
  image_url text DEFAULT '',
  color text NOT NULL DEFAULT '#a78bfa',
  fue int NOT NULL DEFAULT 10,
  des int NOT NULL DEFAULT 10,
  con int NOT NULL DEFAULT 10,
  int_stat int NOT NULL DEFAULT 10,
  wis int NOT NULL DEFAULT 10,
  car int NOT NULL DEFAULT 10,
  velocity int NOT NULL DEFAULT 30,
  initiative int NOT NULL DEFAULT 0,
  base_hp int NOT NULL DEFAULT 15,
  current_hp int NOT NULL DEFAULT 15,
  base_defense int NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Items: unique objects with single owner
CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  slot public.equipment_slot NOT NULL,
  rarity public.item_rarity NOT NULL DEFAULT 'white',
  defense_bonus int NOT NULL DEFAULT 0,
  hp_bonus int NOT NULL DEFAULT 0,
  damage_bonus int NOT NULL DEFAULT 0,
  description text DEFAULT '',
  owner_character_id uuid REFERENCES public.characters(id) ON DELETE SET NULL,
  equipped boolean NOT NULL DEFAULT false,
  in_dm_vault boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_owner ON public.items(owner_character_id);
CREATE INDEX idx_items_campaign ON public.items(campaign_id);

-- Achievements
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Activity log
CREATE TABLE public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  segments jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_logs_campaign ON public.logs(campaign_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Public access policies (app uses name-only login, no auth)
CREATE POLICY "public_all" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.characters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON public.logs FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
