import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Handshake,
  Send,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { brl, fmtDateTime } from "@/lib/format";
import { OPP_STATUS, QUOTE_STATUS, quoteStatusLabel } from "@/lib/constants";
import { fetchSalesGoals, type Opportunity, type Quote } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial | EQSAN" },
      {
        name: "description",
        content: "Indicadores comerciais, funil de vendas e valores em negociação da EQSAN.",
      },
      { property: "og:title", content: "Dashboard Comercial | EQSAN" },
      { property: "og:description", content: "Indicadores comerciais em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = ["#2563eb", "#0891b2", "#f59e0b", "#16a34a", "#e11d48", "#64748b"];

function Kpi({
  title,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  hint?: string;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-sm leading-tight text-muted-foreground">{title}</p>
          <p
            className={
              "mt-1 text-2xl font-semibold " +
              (tone === "success"
                ? "text-emerald-600"
                : tone === "danger"
                  ? "text-rose-600"
                  : "text-foreground")
            }
          >
            {value}
          </p>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [opps, quotes] = await Promise.all([
        supabase.from("opportunities").select("*"),
        supabase.from("quotes").select("*"),
      ]);
      if (opps.error) throw opps.error;
      if (quotes.error) throw quotes.error;
      return {
        opportunities: (opps.data ?? []) as Opportunity[],
        quotes: (quotes.data ?? []) as Quote[],
      };
    },
  });

  type AgendaRow = {
    id: string;
    tipo: string;
    observacao: string | null;
    proximo_followup: string | null;
    opportunity_id: string | null;
    clients: { razao_social: string } | null;
    opportunities: { titulo: string } | null;
  };

  const { data: agenda = [] } = useQuery({
    queryKey: ["dashboard-agenda"],
    queryFn: async () => {
      const now = new Date();
      const endOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      ).toISOString();
      const { data: rows, error } = await supabase
        .from("follow_ups")
        .select(
          "id, tipo, observacao, proximo_followup, opportunity_id, clients(razao_social), opportunities(titulo)",
        )
        .eq("status", "pendente")
        .not("proximo_followup", "is", null)
        .lte("proximo_followup", endOfToday)
        .order("proximo_followup")
        .limit(8);
      if (error) throw error;
      return rows as unknown as AgendaRow[];
    },
  });

  const concludeFollowUp = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status: "realizado" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Follow-up concluído.");
    },
  });

  const now = new Date();
  const anoAtual = now.getFullYear();
  const mesAtual = now.getMonth() + 1;
  const { data: goals = [] } = useQuery({
    queryKey: ["sales-goals", anoAtual, mesAtual],
    queryFn: () => fetchSalesGoals(anoAtual, mesAtual),
  });

  const opps = data?.opportunities ?? [];
  const quotes = data?.quotes ?? [];

  const countBy = (status: string) => opps.filter((o) => o.status === status).length;
  const abertas = opps.filter(
    (o) => !["aprovada", "perdida", "cancelada"].includes(o.status),
  ).length;
  const valorNegociacao = opps
    .filter((o) => ["proposta_enviada", "negociacao"].includes(o.status))
    .reduce((s, o) => s + Number(o.valor_estimado), 0);
  const valorAprovado = quotes
    .filter((q) => q.status === "aprovado")
    .reduce((s, q) => s + Number(q.total), 0);

  function periodStats(from: Date, to: Date) {
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);
    const oppsNoPeriodo = opps.filter((o) => {
      const d = o.created_at.slice(0, 10);
      return d >= fromStr && d <= toStr;
    });
    const quotesNoPeriodo = quotes.filter((q) => q.data >= fromStr && q.data <= toStr);
    const aprovados = quotesNoPeriodo.filter((q) => q.status === "aprovado");
    const perdidos = quotesNoPeriodo.filter((q) => q.status === "perdido");
    const finalizados = aprovados.length + perdidos.length;
    return {
      oportunidades: oppsNoPeriodo.length,
      valorAprovado: aprovados.reduce((s, q) => s + Number(q.total), 0),
      conversao: finalizados ? (aprovados.length / finalizados) * 100 : 0,
    };
  }

  const inicioMesAtual = new Date(anoAtual, mesAtual - 1, 1);
  const fimMesAtual = now;
  const inicioMesAnterior = new Date(anoAtual, mesAtual - 2, 1);
  const fimMesAnterior = new Date(anoAtual, mesAtual - 1, 0);
  const inicioAnoAtual = new Date(anoAtual, 0, 1);
  const inicioAnoAnterior = new Date(anoAtual - 1, 0, 1);
  const fimAnoAnterior = new Date(anoAtual - 1, now.getMonth(), now.getDate());

  const comparativoMes = {
    atual: periodStats(inicioMesAtual, fimMesAtual),
    anterior: periodStats(inicioMesAnterior, fimMesAnterior),
  };
  const comparativoAno = {
    atual: periodStats(inicioAnoAtual, now),
    anterior: periodStats(inicioAnoAnterior, fimAnoAnterior),
  };

  const funil = [
    { etapa: "Solicitações", qtd: opps.length },
    { etapa: "Orçamentos", qtd: quotes.length },
    {
      etapa: "Propostas enviadas",
      qtd: quotes.filter((q) => ["enviado", "negociacao", "aprovado", "perdido"].includes(q.status))
        .length,
    },
    { etapa: "Negociação", qtd: quotes.filter((q) => q.status === "negociacao").length },
    { etapa: "Aprovadas", qtd: quotes.filter((q) => q.status === "aprovado").length },
  ];

  const porStatus = QUOTE_STATUS.map((s) => ({
    name: s.label,
    value: quotes.filter((q) => q.status === s.value).length,
  })).filter((s) => s.value > 0);

  const porMes = (() => {
    const map = new Map<string, { mes: string; orcado: number; vendido: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, {
        mes: d.toLocaleDateString("pt-BR", { month: "short" }),
        orcado: 0,
        vendido: 0,
      });
    }
    for (const q of quotes) {
      const key = q.data.slice(0, 7);
      const row = map.get(key);
      if (!row) continue;
      row.orcado += Number(q.total);
      if (q.status === "aprovado") row.vendido += Number(q.total);
    }
    return [...map.values()];
  })();

  const motivos = (() => {
    const map = new Map<string, number>();
    for (const o of opps) {
      if (o.status !== "perdida") continue;
      const key = o.motivo_perda || "Não informado";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  })();

  const mesAtualKey = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`;
  const vendidoPorResponsavel = (() => {
    const map = new Map<string, number>();
    for (const q of quotes) {
      if (q.status !== "aprovado" || q.data.slice(0, 7) !== mesAtualKey) continue;
      const k = q.responsavel || "Sem responsável";
      map.set(k, (map.get(k) ?? 0) + Number(q.total));
    }
    return map;
  })();
  const metas = goals
    .map((g) => ({
      responsavel: g.responsavel,
      meta: Number(g.meta_valor),
      vendido: vendidoPorResponsavel.get(g.responsavel) ?? 0,
    }))
    .sort((a, b) => b.meta - a.meta);
  const metaTotal = metas.reduce((s, m) => s + m.meta, 0);
  const vendidoTotal = metas.reduce((s, m) => s + m.vendido, 0);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Visão geral do desempenho comercial da EQSAN" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi title="Oportunidades abertas" value={abertas} icon={Target} />
        <Kpi
          title="Orçamentos em elaboração"
          value={quotes.filter((q) => q.status === "em_elaboracao").length}
          icon={FileText}
        />
        <Kpi
          title="Propostas enviadas"
          value={quotes.filter((q) => q.status === "enviado").length}
          icon={Send}
        />
        <Kpi title="Negociações" value={countBy("negociacao")} icon={Handshake} />
        <Kpi title="Aprovados" value={countBy("aprovada")} icon={CheckCircle2} tone="success" />
        <Kpi title="Perdidos" value={countBy("perdida")} icon={XCircle} tone="danger" />
        <Kpi title="Valor em negociação" value={brl(valorNegociacao)} icon={TrendingUp} />
        <Kpi title="Valor aprovado" value={brl(valorAprovado)} icon={CheckCircle2} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sua agenda do dia</CardTitle>
            <Link
              to="/followups"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {agenda.length ? (
              agenda.map((f) => {
                const atrasado = f.proximo_followup ? new Date(f.proximo_followup) < now : false;
                return (
                  <div
                    key={f.id}
                    className={
                      "flex items-center justify-between gap-3 rounded-md border p-3 text-sm " +
                      (atrasado ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50")
                    }
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium">
                        {atrasado ? (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                        )}
                        <span className="truncate">
                          {f.clients?.razao_social ?? f.opportunities?.titulo ?? "Follow-up"}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {fmtDateTime(f.proximo_followup)}
                        {f.observacao ? ` · ${f.observacao}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {f.opportunity_id ? (
                        <Link
                          to="/oportunidades/$id"
                          params={{ id: f.opportunity_id }}
                          className="text-xs text-primary hover:underline"
                        >
                          Abrir
                        </Link>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={() => concludeFollowUp.mutate(f.id)}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Concluir
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="flex items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <CalendarClock className="h-4 w-4" /> Nenhum follow-up atrasado ou para hoje. 🎉
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metas do mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metas.length ? (
              <>
                <GoalBar label="Equipe" meta={metaTotal} vendido={vendidoTotal} highlight />
                <div className="space-y-3 border-t pt-3">
                  {metas.map((m) => (
                    <GoalBar
                      key={m.responsavel}
                      label={m.responsavel}
                      meta={m.meta}
                      vendido={m.vendido}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma meta cadastrada para este mês. Defina em Configurações.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Este mês vs. mês anterior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CompareRow
              label="Valor aprovado"
              atual={comparativoMes.atual.valorAprovado}
              anterior={comparativoMes.anterior.valorAprovado}
              format={brl}
            />
            <CompareRow
              label="Oportunidades criadas"
              atual={comparativoMes.atual.oportunidades}
              anterior={comparativoMes.anterior.oportunidades}
            />
            <CompareRow
              label="Taxa de conversão"
              atual={comparativoMes.atual.conversao}
              anterior={comparativoMes.anterior.conversao}
              format={(v) => `${v.toFixed(1)}%`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {anoAtual} vs. {anoAtual - 1} (mesmo período do ano)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CompareRow
              label="Valor aprovado"
              atual={comparativoAno.atual.valorAprovado}
              anterior={comparativoAno.anterior.valorAprovado}
              format={brl}
            />
            <CompareRow
              label="Oportunidades criadas"
              atual={comparativoAno.atual.oportunidades}
              anterior={comparativoAno.anterior.oportunidades}
            />
            <CompareRow
              label="Taxa de conversão"
              atual={comparativoAno.atual.conversao}
              anterior={comparativoAno.anterior.conversao}
              format={(v) => `${v.toFixed(1)}%`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funil de vendas</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funil} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="etapa" width={130} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamentos por status</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {porStatus.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porStatus}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                    isAnimationActive={false}
                  >
                    {porStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valor por mês</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(v) => brl(Number(v))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orcado"
                  name="Orçado"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="vendido"
                  name="Aprovado"
                  stroke="#16a34a"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Motivos de perda</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {motivos.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={motivos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Perdas" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade perdida.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oportunidades por etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {OPP_STATUS.map((s) => (
              <div key={s.value} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-medium">{countBy(s.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
            {[...quotes]
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 6)
              .map((q) => (
                <Link
                  key={q.id}
                  to="/orcamentos/$id"
                  params={{ id: q.id }}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  <span className="font-medium">{q.numero}</span>
                  <span className="text-muted-foreground">{quoteStatusLabel(q.status)}</span>
                  <span className="font-medium">{brl(q.total)}</span>
                </Link>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  atual,
  anterior,
  format = (v: number) => String(v),
}: {
  label: string;
  atual: number;
  anterior: number;
  format?: (v: number) => string;
}) {
  const delta = anterior !== 0 ? ((atual - anterior) / anterior) * 100 : atual > 0 ? 100 : 0;
  const positivo = delta >= 0;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{format(atual)}</span>
        <span
          className={
            "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium " +
            (positivo ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")
          }
        >
          {positivo ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function GoalBar({
  label,
  meta,
  vendido,
  highlight = false,
}: {
  label: string;
  meta: number;
  vendido: number;
  highlight?: boolean;
}) {
  const pct = meta > 0 ? Math.min(100, Math.round((vendido / meta) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={highlight ? "font-semibold" : "text-muted-foreground"}>{label}</span>
        <span className={highlight ? "font-semibold" : "text-muted-foreground"}>
          {brl(vendido)} / {brl(meta)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={
            "h-full rounded-full transition-all " + (pct >= 100 ? "bg-emerald-500" : "bg-primary")
          }
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-0.5 text-right text-xs text-muted-foreground">{pct}%</p>
    </div>
  );
}
