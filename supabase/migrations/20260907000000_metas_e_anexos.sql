-- METAS COMERCIAIS ------------------------------------------------------
-- Meta mensal por vendedor (responsavel é texto livre, igual já é usado em
-- opportunities.responsavel / quotes.responsavel, sem tabela própria de
-- vendedores no sistema).
CREATE TABLE public.sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel text NOT NULL,
  ano int NOT NULL,
  mes int NOT NULL CHECK (mes BETWEEN 1 AND 12),
  meta_valor numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (responsavel, ano, mes)
);
CREATE INDEX idx_goals_periodo ON public.sales_goals (ano, mes);

GRANT SELECT ON public.sales_goals TO authenticated;
GRANT ALL ON public.sales_goals TO service_role;
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- Leitura: toda a equipe vê as metas (dashboard mostra o progresso de todos).
CREATE POLICY "sales_goals_select" ON public.sales_goals
  FOR SELECT TO authenticated USING (true);

-- Escrita: só admin define/edita/apaga metas.
GRANT INSERT, UPDATE, DELETE ON public.sales_goals TO authenticated;
CREATE POLICY "sales_goals_insert_admin" ON public.sales_goals
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_goals_update_admin" ON public.sales_goals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sales_goals_delete_admin" ON public.sales_goals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_sales_goals_updated BEFORE UPDATE ON public.sales_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ANEXOS DE ORÇAMENTO -----------------------------------------------------
-- Metadados dos arquivos (o binário fica no Storage, bucket privado abaixo).
CREATE TABLE public.quote_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  caminho text NOT NULL UNIQUE,
  tamanho_bytes bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_qa_quote ON public.quote_attachments (quote_id);

GRANT SELECT, INSERT, DELETE ON public.quote_attachments TO authenticated;
GRANT ALL ON public.quote_attachments TO service_role;
ALTER TABLE public.quote_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_attachments_select" ON public.quote_attachments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "quote_attachments_insert" ON public.quote_attachments
  FOR INSERT TO authenticated WITH CHECK (true);
-- Exclusão de anexo: admin ou quem anexou (mesmo critério já usado para
-- clients/opportunities/quotes/follow_ups na migration anterior).
CREATE POLICY "quote_attachments_delete_owner_or_admin" ON public.quote_attachments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

-- Bucket privado de Storage para os arquivos em si.
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-attachments', 'quote-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Qualquer usuário autenticado pode ler/enviar/apagar objetos desse bucket
-- (o controle fino de "quem pode apagar o quê" já está na tabela
-- quote_attachments acima; aqui só garantimos que gente de fora, sem
-- sessão, não acessa nada, já que o bucket é privado).
CREATE POLICY "quote_attachments_storage_select" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'quote-attachments');
CREATE POLICY "quote_attachments_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'quote-attachments');
CREATE POLICY "quote_attachments_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'quote-attachments');
