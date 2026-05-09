
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_scale numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS image_offset_x numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_offset_y numeric NOT NULL DEFAULT 50;

ALTER TABLE public.logs
  ADD COLUMN IF NOT EXISTS undo jsonb,
  ADD COLUMN IF NOT EXISTS undone boolean NOT NULL DEFAULT false;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars','avatars', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_public_read') THEN
    CREATE POLICY "avatars_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_public_write') THEN
    CREATE POLICY "avatars_public_write" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_public_update') THEN
    CREATE POLICY "avatars_public_update" ON storage.objects
      FOR UPDATE USING (bucket_id = 'avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_public_delete') THEN
    CREATE POLICY "avatars_public_delete" ON storage.objects
      FOR DELETE USING (bucket_id = 'avatars');
  END IF;
END $$;
