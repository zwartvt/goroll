-- Archive table for soft-deleted campaigns (restorable by MasterAcc1000)
CREATE TABLE IF NOT EXISTS public.deleted_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id uuid NOT NULL,
  name text NOT NULL,
  owner_user_id uuid,
  payload jsonb NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deleted_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.deleted_campaigns FOR ALL USING (true) WITH CHECK (true);

-- Flag to lock character renaming in a campaign
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS lock_character_names boolean NOT NULL DEFAULT false;