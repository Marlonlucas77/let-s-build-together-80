import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OPP_STATUS } from "@/lib/constants";
import { brl, csvDownload } from "@/lib/format";
import { fetchCategoryGoals, type FollowUp, type Opportunity, type Quote } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios comerciais | EQSAN" },
      {
        name: "description",
        content: "Conversão, desempenho por vendedor e situação dos follow-ups.",
      },
      { property: "og:title", content: "Relatórios comerciais | EQSAN" },
      { property: "og:description", content: "Indicadores do funil de vendas EQSAN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");

  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [q, o, f] = await Promise.all([
        supabase.from("quotes").select("*"),
        supabase.from("opportunities").select("*"),
        supabase.from("follow_ups").select("*"),
      ]);
      return {
        quotes: (q.data ?? []) as Quote[],
        opps: (o.data ?? []) as Opportunity[],
        followups: (f.data ?? []) as FollowUp[],
      };
    },
  });

  const { data: stageEvents = [] } = useQuery({
    queryKey: ["funnel-stage-events"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("activities")
        .select("opportunity_id, status_para, created_at")
        .not("status_para", "is", null)
        .not("opportunity_id", "is", null)
        .order("opportunity_id")
        .order("created_at");
      if (error) throw error;
      return rows as { opportunity_id: string; status_para: string; created_at: string }[];
    },
  });

  const now = new Date();
  const { data: categoryGoals = [] } = useQuery({
    queryKey: ["category-goals", now.getFullYear(), now.getMonth() + 1],
    queryFn: () => fetchCategoryGoals(now.getFullYear(), now.getMonth() + 1),
  });

  const noPeriodo = useCallback(
    (dateStr: string) => {
      if (!dataDe && !dataAte) return true;
      const d = dateStr.slice(0, 10);
      if (dataDe && d < dataDe) return false;
      if (dataAte && d > dataAte) return false;
      return true;
    },
    [dataDe, dataAte],
  );

  const quotes = useMemo(
    () => (data?.quotes ?? []).filter((q) => noPeriodo(q.data)),
    [data, noPeriodo],
  );
  const opps = useMemo(
    () => (data?.opps ?? []).filter((o) => noPeriodo(o.created_at)),
    [data, noPeriodo],
  );
  const followups = useMemo(
    () => (data?.followups ?? []).filter((f) => noPeriodo(f.data)),
    [data, noPeriodo],
  );

  const resumo = useMemo(() => {
    const aprovados = quotes.filter((q) => q.status === "aprovado");
    const perdidos = quotes.filter((q) => q.status === "perdido");
    const negociacao = quotes.filter((q) => q.status === "negociacao");
    const finalizados = aprovados.length + perdidos.length;
    return {
      total: quotes.length,
      aprovados: aprovados.length,
      perdidos: perdidos.length,
      negociacao: negociacao.length,
      conversao: finalizados ? (aprovados.length / finalizados) * 100 : 0,
      valorTotal: quotes.reduce((s, q) => s + Number(q.total), 0),
      valorAprovado: aprovados.reduce((s, q) => s + Number(q.total), 0),
    };
  }, [quotes]);

  const porVendedor = useMemo(() => {
    const map = new Map<
      string,
      {
        oportunidades: number;
        orcamentos: number;
        aprovados: number;
        perdidos: number;
        valor: number;
      }
    >();
    const get = (k: string) =>
      map.get(k) ?? { oportunidades: 0, orcamentos: 0, aprovados: 0, perdidos: 0, valor: 0 };
    opps.forEach((o) => {
      const k = o.responsavel || "Sem responsável";
      const v = get(k);
      v.oportunidades += 1;
      map.set(k, v);
    });
    quotes.forEach((q) => {
      const k = q.responsavel || "Sem responsável";
      const v = get(k);
      v.orcamentos += 1;
      if (q.status === "aprovado") {
        v.aprovados += 1;
        v.valor += Number(q.total);
      }
      if (q.status === "perdido") v.perdidos += 1;
      map.set(k, v);
    });
    return [...map.entries()].sort((a, b) => b[1].valor - a[1].valor);
  }, [opps, quotes]);

  const fu = useMemo(() => {
    const now = Date.now();
    return {
      realizados: followups.filter((f) => f.status === "realizado").length,
      pendentes: followups.filter((f) => f.status === "pendente").length,
      atrasados: followups.filter(
        (f) =>
          f.status === "pendente" &&
          f.proximo_followup &&
          new Date(f.proximo_followup).getTime() < now,
      ).length,
    };
  }, [followups]);

  const opsById = useMemo(() => new Map(opps.map((o) => [o.id, o])), [opps]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, { valor: number; aprovados: number; orcamentos: number }>();
    const get = (k: string) => map.get(k) ?? { valor: 0, aprovados: 0, orcamentos: 0 };
    quotes.forEach((q) => {
      const categoria =
        (q.opportunity_id && opsById.get(q.opportunity_id)?.produto_servico) || "Sem categoria";
      const v = get(categoria);
      v.orcamentos += 1;
      if (q.status === "aprovado") {
        v.aprovados += 1;
        v.valor += Number(q.total);
      }
      map.set(categoria, v);
    });
    return [...map.entries()].sort((a, b) => b[1].valor - a[1].valor);
  }, [quotes, opsById]);

  const metasCategoria = categoryGoals
    .map((g) => ({
      categoria: g.categoria,
      meta: Number(g.meta_valor),
      vendido: porCategoria.find(([k]) => k === g.categoria)?.[1].valor ?? 0,
    }))
    .sort((a, b) => b.meta - a.meta);

  const tempoPorEtapa = useMemo(() => {
    const porOportunidade = new Map<string, { status_para: string; created_at: string }[]>();
    for (const ev of stageEvents) {
      const list = porOportunidade.get(ev.opportunity_id) ?? [];
      list.push(ev);
      porOportunidade.set(ev.opportunity_id, list);
    }
    const somaMs = new Map<string, number>();
    const contagem = new Map<string, number>();
    for (const eventos of porOportunidade.values()) {
      for (let i = 0; i < eventos.length - 1; i++) {
        const atual = eventos[i]!;
        const proximo = eventos[i + 1]!;
        const ms = new Date(proximo.created_at).getTime() - new Date(atual.created_at).getTime();
        if (ms < 0) continue;
        somaMs.set(atual.status_para, (somaMs.get(atual.status_para) ?? 0) + ms);
        contagem.set(atual.status_para, (contagem.get(atual.status_para) ?? 0) + 1);
      }
    }
    return OPP_STATUS.filter((s) => contagem.has(s.value)).map((s) => ({
      status: s.value,
      label: s.label,
      mediaDias: somaMs.get(s.value)! / contagem.get(s.value)! / 86400000,
      transicoes: contagem.get(s.value)!,
    }));
  }, [stageEvents]);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Resultados comerciais consolidados"
        actions={
          <div className="no-print flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                className="h-8 w-36 text-xs"
                value={dataDe}
                onChange={(e) => setDataDe(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                className="h-8 w-36 text-xs"
                value={dataAte}
                onChange={(e) => setDataAte(e.target.value)}
              />
            </div>
            {dataDe || dataAte ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDataDe("");
                  setDataAte("");
                }}
              >
                Limpar período
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                csvDownload(
                  `relatorio-vendedores${dataDe ? `-${dataDe}` : ""}${dataAte ? `_${dataAte}` : ""}.csv`,
                  [
                    [
                      "Responsável",
                      "Oportunidades",
                      "Orçamentos",
                      "Aprovados",
                      "Perdidos",
                      "Valor vendido",
                    ],
                    ...porVendedor.map(([k, v]) => [
                      k,
                      v.oportunidades,
                      v.orcamentos,
                      v.aprovados,
                      v.perdidos,
                      v.valor.toFixed(2),
                    ]),
                  ],
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatório de orçamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Total de orçamentos" value={String(resumo.total)} />
            <Row label="Aprovados" value={String(resumo.aprovados)} />
            <Row label="Perdidos" value={String(resumo.perdidos)} />
            <Row label="Em negociação" value={String(resumo.negociacao)} />
            <Row label="Taxa de conversão" value={`${resumo.conversao.toFixed(1)}%`} />
            <Row label="Valor total" value={brl(resumo.valorTotal)} />
            <Row label="Valor aprovado" value={brl(resumo.valorAprovado)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatório de follow-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Realizados" value={String(fu.realizados)} />
            <Row label="Pendentes" value={String(fu.pendentes)} />
            <Row label="Atrasados" value={String(fu.atrasados)} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Valor vendido por vendedor</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {porVendedor.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porVendedor.map(([k, v]) => ({ nome: k, valor: v.valor }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => brl(v)} width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => brl(v)} />
                <Bar dataKey="valor" name="Valor vendido" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados aprovados no período selecionado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Relatório por vendedor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-right">Oportunidades</th>
                  <th className="px-4 py-3 text-right">Orçamentos</th>
                  <th className="px-4 py-3 text-right">Aprovados</th>
                  <th className="px-4 py-3 text-right">Perdidos</th>
                  <th className="px-4 py-3 text-right">Valor vendido</th>
                </tr>
              </thead>
              <tbody>
                {porVendedor.map(([k, v]) => (
                  <tr key={k} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{k}</td>
                    <td className="px-4 py-3 text-right">{v.oportunidades}</td>
                    <td className="px-4 py-3 text-right">{v.orcamentos}</td>
                    <td className="px-4 py-3 text-right">{v.aprovados}</td>
                    <td className="px-4 py-3 text-right">{v.perdidos}</td>
                    <td className="px-4 py-3 text-right font-medium">{brl(v.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metas por categoria/produto (mês atual)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {metasCategoria.length ? (
              metasCategoria.map((m) => (
                <div key={m.categoria} className="flex items-center justify-between gap-2 py-1">
                  <span className="min-w-0 flex-1 truncate">{m.categoria}</span>
                  <span className="shrink-0 font-medium">
                    {brl(m.vendido)} / {brl(m.meta)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                Nenhuma meta por categoria cadastrada para este mês.
              </p>
            )}
            {porCategoria.length ? (
              <div className="border-t pt-2">
                <p className="mb-1 text-xs uppercase text-muted-foreground">
                  Valor vendido por categoria (sem filtro de meta)
                </p>
                {porCategoria.map(([k, v]) => (
                  <div key={k} className="flex justify-between py-0.5 text-xs">
                    <span>{k}</span>
                    <span className="font-medium">{brl(v.valor)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tempo médio por etapa do funil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {tempoPorEtapa.length ? (
              tempoPorEtapa.map((e) => (
                <div
                  key={e.status}
                  className="flex items-center justify-between border-b py-1.5 last:border-0"
                >
                  <span>{e.label}</span>
                  <span className="text-right">
                    <span className="font-medium">{e.mediaDias.toFixed(1)} dias</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({e.transicoes} {e.transicoes === 1 ? "caso" : "casos"})
                    </span>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">
                Ainda não há transições de etapa registradas suficientes para calcular. Esse
                indicador vai se preenchendo conforme as oportunidades avançam pelo funil.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
