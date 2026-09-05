import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  CheckCircle2,
  Clock,
  FileText,
  Handshake,
  Send,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { OPP_STATUS, QUOTE_STATUS, quoteStatusLabel } from "@/lib/constants";
import { useAlerts } from "@/components/AlertsBell";
import type { Opportunity, Quote } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Comercial | EQSAN" },
      { name: "description", content: "Indicadores comerciais, funil de vendas e valores em negociação da EQSAN." },
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
  const { data: alerts } = useAlerts();

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

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do desempenho comercial da EQSAN"
      />

      {(alerts?.atrasados ?? 0) > 0 || (alerts?.hoje ?? 0) > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {(alerts?.atrasados ?? 0) > 0 ? (
            <Link
              to="/followups"
              className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                Você possui {alerts?.atrasados} follow-ups atrasados.
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          {(alerts?.hoje ?? 0) > 0 ? (
            <Link
              to="/followups"
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4" />
                Você possui {alerts?.hoje} follow-ups para hoje.
              </span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : null}

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
        <Kpi
          title="Valor aprovado"
          value={brl(valorAprovado)}
          icon={CheckCircle2}
          tone="success"
        />
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
                  <Pie data={porStatus} dataKey="value" nameKey="name" outerRadius={90} label isAnimationActive={false}>
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
                <Line type="monotone" dataKey="orcado" name="Orçado" stroke="#2563eb" strokeWidth={2} />
                <Line type="monotone" dataKey="vendido" name="Aprovado" stroke="#16a34a" strokeWidth={2} />
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
