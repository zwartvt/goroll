-- 1) Nueva tabla de asignaciones (posesión por personaje)
CREATE TABLE IF NOT EXISTS public.booster_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  booster_id uuid NOT NULL REFERENCES public.boosters(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  uses integer NOT NULL DEFAULT 1,
  max_uses integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booster_assignments_unique UNIQUE (booster_id, character_id)
);
CREATE INDEX IF NOT EXISTS booster_assignments_character_idx ON public.booster_assignments(character_id);
CREATE INDEX IF NOT EXISTS booster_assignments_campaign_idx  ON public.booster_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS booster_assignments_booster_idx   ON public.booster_assignments(booster_id);

ALTER TABLE public.booster_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_all ON public.booster_assignments FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.booster_assignments;

-- 2) Backfill: por cada booster con dueño actual, elegir un booster "canon"
--    de la misma plantilla y crear una asignación apuntando a ese canon.
WITH canon AS (
  SELECT DISTINCT ON (campaign_id, template_id)
    id AS canon_id, campaign_id, template_id
  FROM public.boosters
  WHERE owner_character_id IS NULL
  ORDER BY campaign_id, template_id, created_at ASC
),
owned AS (
  SELECT b.id, b.campaign_id, b.owner_character_id, b.uses, b.max_uses, b.template_id
  FROM public.boosters b
  WHERE b.owner_character_id IS NOT NULL
)
INSERT INTO public.booster_assignments(campaign_id, booster_id, character_id, uses, max_uses)
SELECT o.campaign_id,
       COALESCE(c.canon_id, o.id) AS booster_id,
       o.owner_character_id, GREATEST(o.uses, 0), GREATEST(o.max_uses, 1)
FROM owned o
LEFT JOIN canon c ON c.campaign_id = o.campaign_id AND c.template_id = o.template_id
ON CONFLICT (booster_id, character_id) DO NOTHING;

-- 3) Eliminar copias de jugadores que tienen un canon distinto en catálogo.
DELETE FROM public.boosters b
USING (
  SELECT DISTINCT ON (campaign_id, template_id) id AS canon_id, campaign_id, template_id
  FROM public.boosters
  WHERE owner_character_id IS NULL
  ORDER BY campaign_id, template_id, created_at ASC
) c
WHERE b.owner_character_id IS NOT NULL
  AND c.campaign_id = b.campaign_id
  AND c.template_id = b.template_id
  AND c.canon_id <> b.id;

-- 4) Promover a catálogo cualquier booster con dueño que no tenía canon previo.
UPDATE public.boosters
SET owner_character_id = NULL, in_dm_vault = true
WHERE owner_character_id IS NOT NULL;

-- 5) Unicidad de catálogo por (campaign_id, lower(name)) cuando no hay external_id,
--    para que de-duplicación e import puedan reutilizar siempre el mismo "canon".
CREATE UNIQUE INDEX IF NOT EXISTS boosters_campaign_name_uniq
  ON public.boosters (campaign_id, lower(name))
  WHERE external_id IS NULL OR external_id = '';