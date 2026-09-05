import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { KANBAN_COLUMNS, oppStatusLabel } from "@/lib/constants";
import { brl, fmtDate } from "@/lib/format";
import { logActivity } from "@/lib/api";
import { useAuth, userName } from "@/hooks/useAuth";

type Card = {
  id: string;
  numero: string | null;
  titulo: string;
  valor_estimado: number;
  responsavel: string | null;
  status: string;
  client_id: string;
  clients: { razao_social: string } | null;
  follow_ups: { data: string; proximo_followup: string | null }[];
};

export const Route = createFileRoute("/_authenticated/kanban")({
  head: () => ({
    meta: [
      { title: "Kanban comercial | EQSAN" },
      { name: "description", content: "Visualize e arraste oportunidades entre as etapas do funil comercial." },
      { property: "og:title", content: "Kanban comercial | EQSAN" },
      { property: "og:description", content: "Da solicitação ao fechamento em um só quadro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KanbanPage,
});

function KanbanPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [dragging, setDragging] = useState<string | null>(null);

  const { data: cards = [] } = useQuery({
    queryKey: ["kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(
          "id, numero, titulo, valor_estimado, responsavel, status, client_id, clients(razao_social), follow_ups(data, proximo_followup)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Card[];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, status, clientId }: { id: string; status: string; clientId: string }) => {
      const { error } = await supabase.from("opportunities").update({ status }).eq("id", id);
      if (error) throw error;
      await logActivity({
        opportunity_id: id,
        client_id: clientId,
        tipo: "status",
        descricao: `Etapa alterada para ${oppStatusLabel(status)} no Kanban.`,
        usuario: userName(profile, user),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Etapa atualizada.");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <div>
      <PageHeader
        title="Kanban comercial"
        subtitle="Arraste os cards para mudar a etapa da oportunidade"
      />
      <div className="-mx-4 overflow-x-auto px-4 pb-4">
        <div className="flex min-w-max gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const list = cards.filter((c) => c.status === col.status);
            const total = list.reduce((s, c) => s + Number(c.valor_estimado), 0);
            return (
              <div
                key={col.status}
                className="w-72 shrink-0 rounded-lg bg-muted/50 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const card = cards.find((c) => c.id === dragging);
                  if (card && card.status !== col.status)
                    move.mutate({ id: card.id, status: col.status, clientId: card.client_id });
                  setDragging(null);
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide">{col.label}</h2>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">
                    {list.length}
                  </span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">{brl(total)}</p>
                <div className="space-y-2">
                  {list.map((c) => {
                    const ultimo = c.follow_ups.map((f) => f.data).sort().at(-1);
                    const proximo = c.follow_ups
                      .map((f) => f.proximo_followup)
                      .filter(Boolean)
                      .sort()[0];
                    return (
                      <Card
                        key={c.id}
                        draggable
                        onDragStart={() => setDragging(c.id)}
                        onClick={() => navigate({ to: "/oportunidades/$id", params: { id: c.id } })}
                        className="cursor-pointer transition hover:shadow-md"
                      >
                        <CardContent className="space-y-1 p-3 text-sm">
                          <p className="font-medium leading-tight">{c.clients?.razao_social}</p>
                          <p className="text-xs text-muted-foreground">{c.titulo}</p>
                          <p className="font-semibold text-primary">{brl(c.valor_estimado)}</p>
                          <p className="text-xs text-muted-foreground">{c.responsavel}</p>
                          <p className="text-xs text-muted-foreground">
                            Último contato: {fmtDate(ultimo)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Próximo: {fmtDate(proximo)}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {!list.length ? (
                    <p className="py-6 text-center text-xs text-muted-foreground">Vazio</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
