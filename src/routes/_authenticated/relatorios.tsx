import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl, csvDownload } from "@/lib/format";
import type { FollowUp, Opportunity, Quote } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios comerciais | EQSAN" },
      { name: "description", content: "Conversão, desempenho por vendedor e situação dos follow-ups." },
      { property: "og:title", content: "Relatórios comerciais | EQSAN" },
      { property: "og:description", content: "Indicadores do funil de vendas EQSAN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
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

  const quotes = data?.quotes ?? [];
  const opps = data?.opps ?? [];
  const followups = data?.followups ?? [];

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
      { oportunidades: number; orcamentos: number; aprovados: number; perdidos: number; valor: number }
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

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Resultados comerciais consolidados"
        actions={
          <div className="no-print flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir / PDF
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                csvDownload("relatorio-vendedores.csv", [
                  ["Responsável", "Oportunidades", "Orçamentos", "Aprovados", "Perdidos", "Valor vendido"],
                  ...porVendedor.map(([k, v]) => [
                    k,
                    v.oportunidades,
                    v.orcamentos,
                    v.aprovados,
                    v.perdidos,
                    v.valor.toFixed(2),
                  ]),
                ])
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
