import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, FileText, MessageCircle, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { FollowUpDialog } from "@/components/FollowUpDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOSS_REASONS, OPP_STATUS, contactTypeLabel, oppStatusLabel } from "@/lib/constants";
import { brl, fmtDate, fmtDateTime, whatsappLink } from "@/lib/format";
import {
  logActivity,
  type Client,
  type Contact,
  type FollowUp,
  type Opportunity,
  type Quote,
} from "@/lib/api";
import { useAuth, userName } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/oportunidades/$id")({
  head: () => ({
    meta: [
      { title: "Oportunidade | EQSAN Comercial" },
      {
        name: "description",
        content: "Detalhes, follow-ups e histórico da oportunidade comercial.",
      },
      { property: "og:title", content: "Oportunidade | EQSAN Comercial" },
      { property: "og:description", content: "Acompanhamento completo da negociação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OpportunityDetail,
});

function OpportunityDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [fuOpen, setFuOpen] = useState(false);
  const [lossOpen, setLossOpen] = useState(false);
  const [motivo, setMotivo] = useState(LOSS_REASONS[0] as string);

  const { data } = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const { data: opp } = await supabase
        .from("opportunities")
        .select("*, clients(*), contacts(*)")
        .eq("id", id)
        .maybeSingle();
      const [fu, act, qts] = await Promise.all([
        supabase
          .from("follow_ups")
          .select("*")
          .eq("opportunity_id", id)
          .order("data", { ascending: false }),
        supabase
          .from("activities")
          .select("*")
          .eq("opportunity_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("quotes")
          .select("*")
          .eq("opportunity_id", id)
          .order("created_at", { ascending: false }),
      ]);
      return {
        opp: opp as unknown as
          (Opportunity & { clients: Client | null; contacts: Contact | null }) | null,
        followups: (fu.data ?? []) as FollowUp[],
        activities: (act.data ?? []) as {
          id: string;
          descricao: string;
          created_at: string;
          usuario: string | null;
        }[],
        quotes: (qts.data ?? []) as Quote[],
      };
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ status, motivo_perda }: { status: string; motivo_perda?: string }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ status, motivo_perda: motivo_perda ?? null })
        .eq("id", id);
      if (error) throw error;
      await logActivity({
        opportunity_id: id,
        client_id: data?.opp?.client_id,
        tipo: "status",
        descricao: `Status alterado para ${oppStatusLabel(status)}${motivo_perda ? ` (motivo: ${motivo_perda})` : ""}.`,
        usuario: userName(profile, user),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Status atualizado.");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oportunidade excluída.");
      navigate({ to: "/oportunidades" });
    },
  });

  const opp = data?.opp;
  if (!opp) return <p className="text-sm text-muted-foreground">Carregando oportunidade...</p>;

  const zap = opp.contacts?.whatsapp || opp.clients?.whatsapp;

  return (
    <div>
      <Link
        to="/oportunidades"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <PageHeader
        title={opp.titulo}
        subtitle={`${opp.numero} · ${opp.clients?.razao_social ?? ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFuOpen(true)}>
              <Phone className="mr-2 h-4 w-4" /> Follow-up
            </Button>
            {zap ? (
              <Button variant="outline" asChild>
                <a
                  href={whatsappLink(
                    zap,
                    `Olá${opp.contacts?.nome ? `, ${opp.contacts.nome}` : ""}! Tudo bem? Estou entrando em contato referente à oportunidade ${opp.numero} - ${opp.titulo}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            ) : null}
            <Button asChild>
              <Link to="/orcamentos" search={{ nova: opp.id }}>
                <FileText className="mr-2 h-4 w-4" /> Novo orçamento
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Excluir esta oportunidade? Esta ação não pode ser desfeita."))
                  remove.mutate();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Dados da oportunidade</CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={opp.status} />
              <Select
                value={opp.status}
                onValueChange={(v) => {
                  if (v === "perdida") {
                    setLossOpen(true);
                    return;
                  }
                  changeStatus.mutate({ status: v });
                }}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPP_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <Info label="Cliente" value={opp.clients?.razao_social} />
            <Info label="Contato" value={opp.contacts?.nome} />
            <Info label="Responsável" value={opp.responsavel} />
            <Info label="Origem" value={opp.origem} />
            <Info label="Produto/serviço" value={opp.produto_servico} />
            <Info label="Valor estimado" value={brl(opp.valor_estimado)} />
            <Info label="Probabilidade" value={`${opp.probabilidade}%`} />
            <Info label="Prazo desejado" value={fmtDate(opp.prazo_desejado)} />
            <Info label="Criada em" value={fmtDate(opp.created_at)} />
            {opp.motivo_perda ? <Info label="Motivo da perda" value={opp.motivo_perda} /> : null}
            {opp.descricao ? (
              <p className="sm:col-span-2 pt-2 text-muted-foreground">{opp.descricao}</p>
            ) : null}
            {opp.observacoes ? (
              <p className="sm:col-span-2 text-muted-foreground">{opp.observacoes}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.quotes.map((q) => (
              <Link
                key={q.id}
                to="/orcamentos/$id"
                params={{ id: q.id }}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{q.numero}</p>
                  <p className="text-xs text-muted-foreground">
                    v{q.versao} · {fmtDate(q.data)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{brl(q.total)}</p>
                  <StatusBadge status={q.status} kind="quote" />
                </div>
              </Link>
            ))}
            {!data?.quotes.length ? (
              <p className="text-sm text-muted-foreground">Nenhum orçamento vinculado.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follow-ups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.followups.map((f) => (
              <div key={f.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{contactTypeLabel(f.tipo)}</span>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(f.data)}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{f.observacao}</p>
                {f.proximo_followup ? (
                  <p className="mt-1 text-xs text-primary">
                    Próximo contato: {fmtDateTime(f.proximo_followup)}
                  </p>
                ) : null}
              </div>
            ))}
            {!data?.followups.length ? (
              <p className="text-sm text-muted-foreground">Nenhum follow-up registrado.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-4 border-l pl-5">
              {data?.activities.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="text-sm">{a.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtDateTime(a.created_at)}
                    {a.usuario ? ` · ${a.usuario}` : ""}
                  </p>
                </li>
              ))}
            </ol>
            {!data?.activities.length ? (
              <p className="text-sm text-muted-foreground">Sem histórico.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <FollowUpDialog
        open={fuOpen}
        onOpenChange={setFuOpen}
        opportunityId={id}
        clientId={opp.client_id}
      />

      <Dialog open={lossOpen} onOpenChange={setLossOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar oportunidade como perdida</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo da perda *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLossOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                changeStatus.mutate({ status: "perdida", motivo_perda: motivo });
                setLossOpen(false);
              }}
            >
              Confirmar perda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "-"}</span>
    </div>
  );
}
