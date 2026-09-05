-- CATÁLOGO DE PRODUTOS/SERVIÇOS -------------------------------------------
-- Itens padrão pra montar orçamento mais rápido (preenche descrição, unidade
-- e valor unitário do quote_item automaticamente).
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'un',
  preco_unitario numeric(14,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_descricao ON public.products (descricao);

GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Leitura: toda a equipe usa o catálogo ao montar orçamentos.
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);

-- Escrita: só admin mantém o catálogo (mesmo critério de loss_reasons/settings).
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
CREATE POLICY "products_insert_admin" ON public.products
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products_update_admin" ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "products_delete_admin" ON public.products
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
