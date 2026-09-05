-- Permite calcular quanto tempo uma oportunidade fica em cada etapa do
-- funil, sem depender de fazer parsing do texto livre de 'descricao'.
-- Preenchido apenas quando tipo = 'status' (mudança de etapa) ou 'criacao'
-- (status inicial); nas demais activities fica NULL.
ALTER TABLE public.activities ADD COLUMN status_de text;
ALTER TABLE public.activities ADD COLUMN status_para text;

-- METAS POR CATEGORIA/PRODUTO -----------------------------------------------
-- Mesmo padrão de sales_goals, mas dimensionado por categoria/produto
-- (usa o mesmo texto livre de opportunities.produto_servico).
CREATE TABLE public.category_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  ano int NOT NULL,
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_valor numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria, ano, mes)
);
CREATE INDEX idx_category_goals_periodo ON public.category_goals (ano, mes);

GRANT SELECT ON public.category_goals TO authenticated;
GRANT ALL ON public.category_goals TO service_role;
ALTER TABLE public.category_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_goals_select" ON public.category_goals
  FOR SELECT TO authenticated USING (true);

GRANT INSERT, UPDATE, DELETE ON public.category_goals TO authenticated;
CREATE POLICY "category_goals_insert_admin" ON public.category_goals
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "category_goals_update_admin" ON public.category_goals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "category_goals_delete_admin" ON public.category_goals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_category_goals_updated BEFORE UPDATE ON public.category_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
