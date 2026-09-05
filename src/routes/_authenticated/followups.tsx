import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { contactTypeLabel } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";

type Row = {
  id: string;
  tipo: string;
  observacao: string | null;
  responsavel: string | null;
  proximo_followup: string | null;
  status: string;
  opportunity_id: string | null;
  quote_id: string | null;
  clients: { razao_social: string } | null;
  opportunities: { numero: string | null; titulo: string } | null;
  quotes: { numero: string | null } | null;
};

export const Route = createFileRoute("/_authenticated/followups")({
  head: () => ({
    meta: [
      { title: "Central de follow-ups | EQSAN Comercial" },
      {
        name: "description",
        content: "Follow-ups atrasados, de hoje e próximos, com acesso direto à oportunidade.",
      },
      { property: "og:title", content: "Central de follow-ups | EQSAN Comercial" },
      { property: "og:description", content: "Nenhuma proposta sem retorno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FollowUpsPage,
});

function FollowUpsPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["followups-central"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follow_ups")
        .select(
          "id, tipo, observacao, responsavel, proximo_followup, status, opportunity_id, quote_id, clients(razao_social), opportunities(numero, titulo), quotes(numero)",
        )
        .not("proximo_followup", "is", null)
        .eq("status", "pendente")
        .order("proximo_followup");
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const conclude = useMutation({
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
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const atrasados = rows.filter((r) => new Date(r.proximo_followup!) < startOfToday);
  const hoje = rows.filter((r) => {
    const d = new Date(r.proximo_followup!);
    return d >= startOfToday && d <= endOfToday;
  });
  const proximos = rows.filter((r) => new Date(r.proximo_followup!) > endOfToday);

  return (
    <div>
      <PageHeader
        title="Meus follow-ups"
        subtitle="Acompanhe os contatos programados e não deixe nenhuma proposta sem retorno"
      />

      {atrasados.length ? (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <span>
            Você possui <strong>{atrasados.length}</strong> follow-up(s) atrasado(s)
            {hoje.length ? ` e ${hoje.length} para hoje` : ""}.
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Atrasados"
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          rows={atrasados}
          tone="border-destructive/40"
          onConclude={(id) => conclude.mutate(id)}
        />
        <Section
          title="Hoje"
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          rows={hoje}
          tone="border-amber-400/50"
          onConclude={(id) => conclude.mutate(id)}
        />
        <Section
          title="Próximos"
          icon={<CalendarClock className="h-4 w-4 text-primary" />}
          rows={proximos}
          tone="border-primary/30"
          onConclude={(id) => conclude.mutate(id)}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  rows,
  tone,
  onConclude,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Row[];
  tone: string;
  onConclude: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        {icon}
        <CardTitle className="text-base">
          {title} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => {
          const content = (
            <>
              <p className="font-medium">{r.clients?.razao_social ?? "Cliente"}</p>
              <p className="text-xs text-muted-foreground">
                {r.quotes?.numero
                  ? `Orçamento ${r.quotes.numero}`
                  : r.opportunities?.numero
                    ? `${r.opportunities.numero} · ${r.opportunities.titulo}`
                    : ""}
              </p>
              <p className="mt-1 text-sm">
                {contactTypeLabel(r.tipo)} · {fmtDateTime(r.proximo_followup)}
              </p>
              {r.observacao ? (
                <p className="mt-1 text-xs text-muted-foreground">{r.observacao}</p>
              ) : null}
            </>
          );
          return (
            <div key={r.id} className={`rounded-md border-l-4 ${tone} border bg-card p-3`}>
              {r.opportunity_id ? (
                <Link to="/oportunidades/$id" params={{ id: r.opportunity_id }}>
                  {content}
                </Link>
              ) : r.quote_id ? (
                <Link to="/orcamentos/$id" params={{ id: r.quote_id }}>
                  {content}
                </Link>
              ) : (
                <div>{content}</div>
              )}
              <Button size="sm" variant="outline" className="mt-2" onClick={() => onConclude(r.id)}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Concluir
              </Button>
            </div>
          );
        })}
        {!rows.length ? <p className="text-sm text-muted-foreground">Nada por aqui.</p> : null}
      </CardContent>
    </Card>
  );
}
