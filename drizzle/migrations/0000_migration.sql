CREATE TABLE public.retirement_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.retirement_plans TO authenticated;
GRANT ALL ON public.retirement_plans TO service_role;
ALTER TABLE public.retirement_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans select" ON public.retirement_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own plans insert" ON public.retirement_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own plans update" ON public.retirement_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own plans delete" ON public.retirement_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX retirement_plans_user_idx ON public.retirement_plans(user_id, updated_at DESC);