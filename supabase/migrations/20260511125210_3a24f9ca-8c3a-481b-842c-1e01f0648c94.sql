CREATE TABLE public.achievement_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.achievement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON public.achievement_templates FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.achievement_templates;
ALTER TABLE public.achievement_templates REPLICA IDENTITY FULL;