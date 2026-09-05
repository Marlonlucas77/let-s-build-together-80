-- FIX: aplica no banco as regras de permissão que o README já promete
-- (ADMIN = acesso completo + configurações; COMERCIAL = dados comerciais, sem configurações),
-- que hoje só existiam como esconderijo de botão no frontend.

-- 1) SETTINGS: leitura para qualquer usuário autenticado (necessário para montar
--    a proposta em PDF, cabeçalho do app, etc.), mas escrita só para admin.
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

CREATE POLICY "settings_insert_admin" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "settings_update_admin" ON public.settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "settings_delete_admin" ON public.settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2) LOSS_REASONS (motivos de perda): lista de apoio da equipe comercial,
--    mas quem cadastra/edita a lista de opções deveria ser admin.
DROP POLICY IF EXISTS "loss_reasons_insert" ON public.loss_reasons;
DROP POLICY IF EXISTS "loss_reasons_update" ON public.loss_reasons;
DROP POLICY IF EXISTS "loss_reasons_delete" ON public.loss_reasons;

CREATE POLICY "loss_reasons_insert_admin" ON public.loss_reasons
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "loss_reasons_update_admin" ON public.loss_reasons
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "loss_reasons_delete_admin" ON public.loss_reasons
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) EXCLUSÃO de registros de negócio (clientes, oportunidades, orçamentos etc.):
--    hoje qualquer usuário autenticado pode apagar QUALQUER registro, de qualquer
--    vendedor. Restringe a exclusão a admin OU a quem criou o registro
--    (created_by = auth.uid()), mantendo leitura e edição colaborativas como já eram.
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','contacts','opportunities','quotes','follow_ups'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "%s_delete_owner_or_admin" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin'') OR created_by = auth.uid())',
      t, t
    );
  END LOOP;
END $do$;

-- Observações importantes que ficam fora do escopo desta migration porque envolvem
-- uma decisão de produto (não técnica), então preferi não decidir sozinho:
--
-- 1. A rota pública /proposta/:id (para o cliente final visualizar/imprimir a
--    proposta sem login) hoje NÃO funciona para visitantes deslogados, porque as
--    tabelas quotes/clients/contacts/quote_items/settings só têm GRANT para o
--    papel "authenticated" no Postgres -- o papel "anon" não tem privilégio nenhuma
--    nessas tabelas, então a query falha antes mesmo de chegar nas políticas de RLS.
--    Se a intenção é essa página ser aberta publicamente (ex: link enviado por
--    WhatsApp/e-mail para o cliente), é preciso liberar GRANT SELECT a "anon" nessas
--    tabelas e criar políticas de RLS específicas para leitura pública -- e isso
--    exige cuidado para não expor a base de clientes inteira, só o orçamento
--    específico do link. Se a intenção é exigir login também para ver a proposta,
--    nada precisa mudar aqui.
