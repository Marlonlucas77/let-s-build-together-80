# EQSAN — Gestão de Orçamentos e Follow-up Comercial

Sistema web para o setor comercial da EQSAN registrar clientes, oportunidades e orçamentos,
gerar propostas em PDF e acompanhar follow-ups até o fechamento ou perda.

## Fluxo comercial

```text
SOLICITAÇÃO → ANÁLISE → ORÇAMENTO → PROPOSTA ENVIADA → NEGOCIAÇÃO → APROVADO / PERDIDO
```

## Módulos

- **Dashboard** — indicadores, funil de vendas, orçamentos por status, evolução mensal e motivos de perda.
- **Clientes** — cadastro completo, ficha do cliente com histórico e contatos.
- **Oportunidades** — numeração automática (`OPO-AAAA-0001`), status, probabilidade e timeline.
- **Orçamentos** — numeração automática (`EQS-AAAA-0001`), itens com cálculo automático, versões e duplicação.
- **Proposta em PDF** — layout comercial pronto para visualizar, imprimir ou salvar em PDF.
- **Follow-ups** — registro por tipo de contato e central com atrasados / hoje / próximos.
- **Alertas** — sino no topo com follow-ups atrasados, do dia e propostas sem retorno há mais de 7 dias.
- **Kanban** — arraste as oportunidades entre as etapas do funil.
- **Relatórios** — conversão, desempenho por vendedor e situação dos follow-ups, com exportação CSV e impressão.
- **Configurações** — dados da empresa, textos da proposta, validade padrão, usuários e listas.

## Tecnologia

| Camada       | Stack                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------- |
| Frontend     | React 19, TanStack Start (Router + Query), TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend      | Lovable Cloud (PostgreSQL + Auth + API REST/PostgREST + políticas de segurança)          |
| Autenticação | E-mail e senha, sessão persistida, senhas com hash gerenciado pela plataforma            |

O backend é gerenciado: banco PostgreSQL, autenticação e API são provisionados automaticamente,
sem servidor Express separado para manter e sem chaves privadas no código.

## Como executar

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:8080`.

Build de produção:

```bash
npm run build
```

## Variáveis de ambiente

Criadas automaticamente no arquivo `.env` do projeto:

| Variável                        | Uso                        |
| ------------------------------- | -------------------------- |
| `VITE_SUPABASE_URL`             | Endereço da API do backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do cliente   |
| `VITE_SUPABASE_PROJECT_ID`      | Identificador do projeto   |

Chaves privadas ficam no cofre de segredos da plataforma e nunca no código.

## Banco de dados

As tabelas são criadas por migrações versionadas em `supabase/migrations/`:

`profiles`, `user_roles`, `clients`, `contacts`, `opportunities`, `quotes`, `quote_items`,
`follow_ups`, `activities`, `loss_reasons`, `settings`.

Recursos automáticos:

- Numeração sequencial de oportunidades e orçamentos por gatilho.
- `updated_at` atualizado automaticamente.
- Criação de perfil e permissão ao cadastrar um usuário.
- Índices para busca por cliente, CNPJ, status e follow-up.
- Dados demonstrativos: 10 clientes, 20 oportunidades, 15 orçamentos e follow-ups em vários status.

## Usuários e acesso

O autocadastro público foi desativado (`Allow new users to sign up` desligado nas
configurações de Authentication do Supabase/Lovable Cloud) — a tela `/auth` só permite login.

Para criar novos acessos: painel do Supabase/Lovable Cloud → **Authentication → Users → Add
user** (ou **Invite user**, que manda um link por e-mail para a pessoa definir a senha).
**O primeiro usuário criado recebe o perfil ADMIN automaticamente; os seguintes entram como
COMERCIAL** (via trigger `handle_new_user`, sem precisar de nenhuma ação manual extra).

## Perfis de acesso

| Perfil    | Permissões                                                  |
| --------- | ----------------------------------------------------------- |
| ADMIN     | Acesso completo a todos os registros e às configurações     |
| COMERCIAL | Clientes, oportunidades, orçamentos, follow-ups e dashboard |

## Segurança

- Autenticação com sessão segura e rotas protegidas (`/_authenticated`).
- Row Level Security ativa em todas as tabelas: sem sessão válida, nenhum dado é retornado.
- Validação de CNPJ, e-mail e valores monetários no formulário e restrições no banco.
- Confirmação obrigatória antes de excluir registros.
- Motivo da perda obrigatório ao marcar uma oportunidade como perdida.

## Deploy

Publique pelo botão **Publish** do Lovable. O backend já está provisionado e é o mesmo do
ambiente de teste; não há passos extras de infraestrutura.

## Estrutura

```text
src/
├── routes/                  # páginas (roteamento por arquivo)
│   ├── index.tsx            # página pública
│   ├── auth.tsx             # login e cadastro
│   ├── proposta.$id.tsx     # proposta para impressão/PDF
│   └── _authenticated/      # área logada (dashboard, clientes, oportunidades, ...)
├── components/              # AppShell, alertas, badges, diálogos
├── hooks/useAuth.tsx        # sessão, perfil e permissão
├── lib/                     # tipos, consultas, formatação e constantes
└── styles.css               # tema e estilos de impressão
```
