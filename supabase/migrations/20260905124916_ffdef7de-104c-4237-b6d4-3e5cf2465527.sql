
-- ROLES ---------------------------------------------------------------
CREATE TYPE public.app_role AS ENUM ('admin','comercial');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN (SELECT count(*) FROM public.user_roles) = 0 THEN 'admin'::public.app_role ELSE 'comercial'::public.app_role END);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CLIENTES ------------------------------------------------------------
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  telefone text,
  whatsapp text,
  email text,
  site text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_razao ON public.clients (razao_social);
CREATE INDEX idx_clients_cnpj ON public.clients (cnpj);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cargo text,
  telefone text,
  whatsapp text,
  email text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_client ON public.contacts (client_id);

-- OPORTUNIDADES -------------------------------------------------------
CREATE SEQUENCE public.opportunity_seq START 1;
CREATE SEQUENCE public.quote_seq START 1;

CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  responsavel text,
  owner_id uuid,
  titulo text NOT NULL,
  descricao text,
  produto_servico text,
  valor_estimado numeric(14,2) NOT NULL DEFAULT 0,
  probabilidade int NOT NULL DEFAULT 50,
  prazo_desejado date,
  origem text,
  status text NOT NULL DEFAULT 'nova_solicitacao',
  motivo_perda text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_opp_client ON public.opportunities (client_id);
CREATE INDEX idx_opp_status ON public.opportunities (status);

CREATE OR REPLACE FUNCTION public.set_opportunity_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := 'OPO-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.opportunity_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_opp_number BEFORE INSERT ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.set_opportunity_number();

-- ORCAMENTOS ----------------------------------------------------------
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
  responsavel text,
  data date NOT NULL DEFAULT current_date,
  validade date,
  prazo_entrega text,
  condicoes_pagamento text,
  observacoes text,
  status text NOT NULL DEFAULT 'em_elaboracao',
  versao int NOT NULL DEFAULT 1,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  desconto numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotes_client ON public.quotes (client_id);
CREATE INDEX idx_quotes_status ON public.quotes (status);

CREATE OR REPLACE FUNCTION public.set_quote_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := 'EQS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.quote_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_quote_number BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_quote_number();

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  codigo text,
  descricao text NOT NULL,
  unidade text NOT NULL DEFAULT 'un',
  quantidade numeric(14,3) NOT NULL DEFAULT 1,
  valor_unitario numeric(14,2) NOT NULL DEFAULT 0,
  desconto numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_quote ON public.quote_items (quote_id);

-- FOLLOW-UPS ----------------------------------------------------------
CREATE TABLE public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  data timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL DEFAULT 'ligacao',
  responsavel text,
  observacao text,
  proximo_followup timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fu_opp ON public.follow_ups (opportunity_id);
CREATE INDEX idx_fu_status ON public.follow_ups (status);
CREATE INDEX idx_fu_prox ON public.follow_ups (proximo_followup);

-- HISTORICO -----------------------------------------------------------
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'evento',
  descricao text NOT NULL,
  usuario text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_act_opp ON public.activities (opportunity_id);

CREATE TABLE public.loss_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_nome text NOT NULL DEFAULT 'EQSAN',
  empresa_cnpj text,
  empresa_telefone text,
  empresa_email text,
  empresa_site text,
  empresa_endereco text,
  logo_url text,
  proposta_texto_abertura text,
  proposta_texto_rodape text,
  condicoes_pagamento_padrao text,
  validade_padrao_dias int NOT NULL DEFAULT 15,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTS + RLS --------------------------------------------------------
DO $do$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','contacts','opportunities','quotes','quote_items','follow_ups','activities','loss_reasons','settings'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (true)', t, t);
    IF t NOT IN ('quote_items','activities','loss_reasons','settings') THEN
      EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
    END IF;
  END LOOP;
END $do$;

-- DADOS DEMONSTRATIVOS -------------------------------------------------
INSERT INTO public.settings (empresa_nome, empresa_cnpj, empresa_telefone, empresa_email, empresa_site, empresa_endereco, condicoes_pagamento_padrao, proposta_texto_abertura, proposta_texto_rodape)
VALUES ('EQSAN Equipamentos e Saneamento','12.345.678/0001-90','(11) 4002-8922','comercial@eqsan.com.br','www.eqsan.com.br','Av. Industrial, 1200 - Sao Paulo/SP','30/60 dias apos entrega','Agradecemos a oportunidade de apresentar nossa proposta comercial.','Proposta sujeita a analise de credito. Valores em reais.');

INSERT INTO public.loss_reasons (nome) VALUES ('Preco'),('Prazo'),('Concorrencia'),('Cliente desistiu'),('Projeto cancelado'),('Outro');

INSERT INTO public.clients (razao_social, nome_fantasia, cnpj, telefone, whatsapp, email, site, endereco, cidade, estado, cep) VALUES
('Saneamento Alfa Ltda','Alfa Saneamento','11.222.333/0001-44','(11) 3555-1000','5511995551000','contato@alfasan.com.br','www.alfasan.com.br','Rua das Bombas, 120','Sao Paulo','SP','01000-000'),
('Beta Engenharia S.A.','Beta Eng','22.333.444/0001-55','(21) 3555-2000','5521995552000','compras@betaeng.com.br','www.betaeng.com.br','Av. Brasil, 4500','Rio de Janeiro','RJ','20000-000'),
('Gamma Industria Quimica','Gamma Quimica','33.444.555/0001-66','(31) 3555-3000','5531995553000','suprimentos@gamma.com.br','www.gamma.com.br','Rod. MG-10, km 4','Belo Horizonte','MG','30000-000'),
('Delta Ambiental ME','Delta Ambiental','44.555.666/0001-77','(41) 3555-4000','5541995554000','delta@ambiental.com.br','www.deltaambiental.com.br','Rua Verde, 88','Curitiba','PR','80000-000'),
('Epsilon Aguas Municipais','SAAE Epsilon','55.666.777/0001-88','(48) 3555-5000','5548995555000','licitacao@epsilon.gov.br','www.epsilon.gov.br','Praca Central, 1','Florianopolis','SC','88000-000'),
('Zeta Alimentos Ltda','Zeta Foods','66.777.888/0001-99','(51) 3555-6000','5551995556000','manutencao@zetafoods.com.br','www.zetafoods.com.br','Distrito Industrial, 300','Porto Alegre','RS','90000-000'),
('Omega Papel e Celulose','Omega Papel','77.888.999/0001-00','(19) 3555-7000','5519995557000','engenharia@omegapapel.com.br','www.omegapapel.com.br','Rod. SP-330, km 120','Campinas','SP','13000-000'),
('Sigma Mineracao','Sigma Min','88.999.000/0001-11','(34) 3555-8000','5534995558000','compras@sigmamin.com.br','www.sigmamin.com.br','Fazenda Boa Vista, s/n','Uberlandia','MG','38400-000'),
('Kappa Construtora','Kappa Obras','99.000.111/0001-22','(85) 3555-9000','5585995559000','obras@kappa.com.br','www.kappa.com.br','Av. Beira Mar, 900','Fortaleza','CE','60000-000'),
('Lambda Hospitalar','Lambda Saude','10.111.222/0001-33','(61) 3555-1100','5561995551100','infra@lambdasaude.com.br','www.lambdasaude.com.br','SGAS 900, bloco B','Brasilia','DF','70000-000');

INSERT INTO public.contacts (client_id, nome, cargo, telefone, whatsapp, email)
SELECT c.id, v.nome, v.cargo, c.telefone, c.whatsapp, v.email
FROM public.clients c
CROSS JOIN LATERAL (VALUES
  ('Joao Silva','Compras','joao.silva@' || split_part(coalesce(c.email,'x@empresa.com'),'@',2)),
  ('Maria Souza','Engenharia','maria.souza@' || split_part(coalesce(c.email,'x@empresa.com'),'@',2))
) AS v(nome, cargo, email);

INSERT INTO public.opportunities (client_id, contact_id, responsavel, titulo, descricao, produto_servico, valor_estimado, probabilidade, prazo_desejado, origem, status, motivo_perda, created_at)
SELECT c.id,
       (SELECT id FROM public.contacts ct WHERE ct.client_id = c.id LIMIT 1),
       (ARRAY['Marlon Lucas','Ana Paula','Carlos Eduardo'])[1 + (g % 3)],
       (ARRAY['Estacao de tratamento compacta','Sistema de dosagem quimica','Retrofit de bombas','Filtro prensa','Painel de automacao','Manutencao preventiva anual'])[1 + (g % 6)],
       'Oportunidade gerada a partir de contato comercial.',
       (ARRAY['ETE','Dosadores','Bombas','Filtracao','Automacao','Servicos'])[1 + (g % 6)],
       (25000 + (g * 13700) % 480000)::numeric,
       (ARRAY[20,40,60,75,90])[1 + (g % 5)],
       current_date + ((g % 60) || ' days')::interval,
       (ARRAY['Indicacao','Site','Feira','Prospeccao ativa','Cliente recorrente'])[1 + (g % 5)],
       (ARRAY['nova_solicitacao','em_analise','orcamento_elaboracao','proposta_enviada','negociacao','aprovada','perdida','cancelada'])[1 + (g % 8)],
       CASE WHEN (1 + (g % 8)) = 7 THEN (ARRAY['Preco','Prazo','Concorrencia','Cliente desistiu'])[1 + (g % 4)] ELSE NULL END,
       now() - ((g * 3) || ' days')::interval
FROM generate_series(0,19) AS g
JOIN LATERAL (SELECT id, row_number() OVER (ORDER BY razao_social) rn FROM public.clients) c ON c.rn = 1 + (g % 10);

INSERT INTO public.quotes (client_id, contact_id, opportunity_id, responsavel, data, validade, prazo_entrega, condicoes_pagamento, status, subtotal, desconto, total, created_at)
SELECT o.client_id, o.contact_id, o.id, o.responsavel,
       (o.created_at + interval '2 days')::date,
       (o.created_at + interval '32 days')::date,
       (ARRAY['30 dias','45 dias','60 dias'])[1 + (o.rn % 3)],
       (ARRAY['30/60 dias','a vista com 5% desconto','50% entrada + 50% entrega'])[1 + (o.rn % 3)],
       (ARRAY['em_elaboracao','enviado','negociacao','aprovado','perdido','cancelado'])[1 + (o.rn % 6)],
       o.valor_estimado, round(o.valor_estimado * 0.05, 2), round(o.valor_estimado * 0.95, 2),
       o.created_at + interval '2 days'
FROM (SELECT *, row_number() OVER (ORDER BY created_at) rn FROM public.opportunities) o
WHERE o.rn <= 15;

INSERT INTO public.quote_items (quote_id, codigo, descricao, unidade, quantidade, valor_unitario, desconto, total, ordem)
SELECT q.id, v.codigo, v.descricao, v.unidade, v.qtd, round(q.subtotal * v.perc / v.qtd, 2), 0, round(q.subtotal * v.perc, 2), v.ordem
FROM public.quotes q
CROSS JOIN LATERAL (VALUES
  ('EQ-001','Equipamento principal conforme especificacao tecnica','un',1::numeric,0.6::numeric,1),
  ('EQ-002','Conjunto de tubulacoes, valvulas e acessorios','cj',1::numeric,0.25::numeric,2),
  ('SV-001','Montagem, comissionamento e treinamento','serv',1::numeric,0.15::numeric,3)
) AS v(codigo, descricao, unidade, qtd, perc, ordem);

INSERT INTO public.follow_ups (opportunity_id, quote_id, client_id, data, tipo, responsavel, observacao, proximo_followup, status)
SELECT q.opportunity_id, q.id, q.client_id,
       now() - ((q.rn * 2) || ' days')::interval,
       (ARRAY['ligacao','whatsapp','email','reuniao','visita'])[1 + (q.rn % 5)],
       q.responsavel,
       (ARRAY['Cliente informou que ira analisar a proposta.','Solicitado retorno sobre a proposta enviada.','Enviado novo contato por e-mail.','Reuniao tecnica realizada.','Cliente pediu revisao de escopo.'])[1 + (q.rn % 5)],
       now() + ((q.rn % 9) - 4 || ' days')::interval,
       CASE WHEN q.rn % 4 = 0 THEN 'realizado' ELSE 'pendente' END
FROM (SELECT *, row_number() OVER (ORDER BY created_at) rn FROM public.quotes) q;

INSERT INTO public.activities (opportunity_id, client_id, tipo, descricao, usuario, created_at)
SELECT o.id, o.client_id, 'criacao', 'Oportunidade criada.', o.responsavel, o.created_at FROM public.opportunities o;
