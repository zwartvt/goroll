ALTER TYPE equipment_slot ADD VALUE IF NOT EXISTS 'objeto';

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'equipo',
  ADD COLUMN IF NOT EXISTS uses integer,
  ADD COLUMN IF NOT EXISTS max_uses integer;