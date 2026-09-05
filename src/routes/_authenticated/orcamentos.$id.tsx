import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { FollowUpDialog } from "@/components/FollowUpDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { QUOTE_STATUS, contactTypeLabel, quoteStatusLabel } from "@/lib/constants";
import { brl, fmtDate, fmtDateTime, toInputDate, whatsappLink } from "@/lib/format";
import {
  logActivity,
  recalcItem,
  type Client,
  type Contact,
  type FollowUp,
  type Quote,
  type QuoteItem,
} from "@/lib/api";
import { useAuth, userName } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/orcamentos/$id")({
  head: () => ({
    meta: [
      { title: "Orçamento | EQSAN Comercial" },
      {
        name: "description",
        content: "Itens, valores, condições comerciais e follow-ups do orçamento.",
      },
      { property: "og:title", content: "Orçamento | EQSAN Comercial" },
      { property: "og:description", content: "Edite itens e gere a proposta em PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuoteDetail,
});

function QuoteDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [fuOpen, setFuOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [mail, setMail] = useState({ to: "", subject: "", body: "" });

  const { data } = useQuery({
    queryKey: ["quote", id],
    queryFn: async () => {
      const { data: quote } = await supabase
        .from("quotes")
        .select("*, clients(*), contacts(*)")
        .eq("id", id)
        .maybeSingle();
      const [items, fu, act] = await Promise.all([
        supabase.from("quote_items").select("*").eq("quote_id", id).order("ordem"),
        supabase
          .from("follow_ups")
          .select("*")
          .eq("quote_id", id)
          .order("data", { ascending: false }),
        supabase
          .from("activities")
          .select("*")
          .eq("quote_id", id)
          .order("created_at", { ascending: false }),
      ]);
      return {
        quote: quote as unknown as
          (Quote & { clients: Client | null; contacts: Contact | null }) | null,
        items: (items.data ?? []) as QuoteItem[],
        followups: (fu.data ?? []) as FollowUp[],
        activities: (act.data ?? []) as {
          id: string;
          descricao: string;
          created_at: string;
          usuario: string | null;
        }[],
      };
    },
  });

  const quote = data?.quote;
  const items = data?.items ?? [];

  async function recalcTotals() {
    const { data: rows } = await supabase.from("quote_items").select("total").eq("quote_id", id);
    const subtotal = (rows ?? []).reduce((s, r) => s + Number(r.total), 0);
    const desconto = Number(quote?.desconto ?? 0);
    await supabase
      .from("quotes")
      .update({ subtotal, total: Math.max(0, subtotal - desconto) })
      .eq("id", id);
  }

  const saveQuote = useMutation({
    mutationFn: async (payload: Partial<Quote>) => {
      const { error } = await supabase
        .from("quotes")
        .update(payload as never)
        .eq("id", id);
      if (error) throw error;
      if (payload.desconto !== undefined) await recalcTotals();
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Orçamento atualizado.");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const changeStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
      await logActivity({
        quote_id: id,
        opportunity_id: quote?.opportunity_id,
        client_id: quote?.client_id,
        tipo: "status",
        descricao: `Orçamento alterado para ${quoteStatusLabel(status)}.`,
        usuario: userName(profile, user),
      });
      if (status === "enviado" && quote?.opportunity_id) {
        await supabase
          .from("opportunities")
          .update({ status: "proposta_enviada" })
          .eq("id", quote.opportunity_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Status atualizado.");
    },
  });

  const saveItem = useMutation({
    mutationFn: async (item: Partial<QuoteItem>) => {
      const total = recalcItem({
        quantidade: Number(item.quantidade ?? 0),
        valor_unitario: Number(item.valor_unitario ?? 0),
        desconto: Number(item.desconto ?? 0),
      });
      if (item.id) {
        const { error } = await supabase
          .from("quote_items")
          .update({ ...item, total } as never)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quote_items").insert({
          quote_id: id,
          codigo: item.codigo ?? null,
          descricao: item.descricao ?? "Novo item",
          unidade: item.unidade ?? "un",
          quantidade: item.quantidade ?? 1,
          valor_unitario: item.valor_unitario ?? 0,
          desconto: item.desconto ?? 0,
          total,
          ordem: items.length,
        } as never);
        if (error) throw error;
      }
      await recalcTotals();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", id] }),
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("quote_items").delete().eq("id", itemId);
      if (error) throw error;
      await recalcTotals();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quote", id] }),
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      if (!quote) throw new Error("Orçamento não carregado");
      const { data: novo, error } = await supabase
        .from("quotes")
        .insert({
          client_id: quote.client_id,
          contact_id: quote.contact_id,
          opportunity_id: quote.opportunity_id,
          responsavel: quote.responsavel,
          data: new Date().toISOString().slice(0, 10),
          validade: quote.validade,
          prazo_entrega: quote.prazo_entrega,
          condicoes_pagamento: quote.condicoes_pagamento,
          observacoes: quote.observacoes,
          status: "em_elaboracao",
          versao: (quote.versao ?? 1) + 1,
          subtotal: quote.subtotal,
          desconto: quote.desconto,
          total: quote.total,
        } as never)
        .select()
        .single();
      if (error) throw error;
      if (items.length) {
        await supabase.from("quote_items").insert(
          items.map((it, i) => ({
            quote_id: novo.id,
            codigo: it.codigo,
            descricao: it.descricao,
            unidade: it.unidade,
            quantidade: it.quantidade,
            valor_unitario: it.valor_unitario,
            desconto: it.desconto,
            total: it.total,
            ordem: i,
          })) as never,
        );
      }
      await logActivity({
        quote_id: novo.id,
        opportunity_id: novo.opportunity_id,
        client_id: novo.client_id,
        tipo: "criacao",
        descricao: `Nova versão criada a partir de ${quote.numero}.`,
        usuario: userName(profile, user),
      });
      return novo;
    },
    onSuccess: (novo) => {
      toast.success("Nova versão criada.");
      navigate({ to: "/orcamentos/$id", params: { id: novo.id } });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeQuote = useMutation({
    mutationFn: async () => {
      await supabase.from("quote_items").delete().eq("quote_id", id);
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Orçamento excluído.");
      navigate({ to: "/orcamentos" });
    },
  });

  if (!quote) return <p className="text-sm text-muted-foreground">Carregando orçamento...</p>;

  const zap = quote.contacts?.whatsapp || quote.clients?.whatsapp;
  const mensagem = `Olá${quote.contacts?.nome ? `, ${quote.contacts.nome}` : ""}! Tudo bem?\n\nEstou entrando em contato referente ao orçamento ${quote.numero} enviado anteriormente.\nGostaria de saber se podemos avançar com a proposta.`;

  return (
    <div>
      <Link
        to="/orcamentos"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <PageHeader
        title={`Orçamento ${quote.numero}`}
        subtitle={`${quote.clients?.razao_social ?? ""} · versão ${quote.versao}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFuOpen(true)}>
              <Phone className="mr-2 h-4 w-4" /> Follow-up
            </Button>
            {zap ? (
              <Button variant="outline" asChild>
                <a href={whatsappLink(zap, mensagem)} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setMail({
                  to: quote.contacts?.email ?? quote.clients?.email ?? "",
                  subject: `Proposta comercial ${quote.numero} - EQSAN`,
                  body: `Prezado(a) ${quote.contacts?.nome ?? "cliente"},\n\nSegue em anexo a proposta comercial ${quote.numero}, no valor de ${brl(quote.total)}, com validade até ${fmtDate(quote.validade)}.\n\nFico à disposição para esclarecimentos.\n\nAtenciosamente,\n${quote.responsavel ?? ""}`,
                });
                setMailOpen(true);
              }}
            >
              <Mail className="mr-2 h-4 w-4" /> E-mail
            </Button>
            <Button variant="outline" onClick={() => duplicate.mutate()}>
              <Copy className="mr-2 h-4 w-4" /> Nova versão
            </Button>
            <Button asChild>
              <Link to="/proposta/$id" params={{ id }} target="_blank">
                <FileText className="mr-2 h-4 w-4" /> Gerar proposta PDF
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Excluir este orçamento e seus itens?")) removeQuote.mutate();
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
            <CardTitle className="text-base">Itens do orçamento</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => saveItem.mutate({ descricao: "Novo item", quantidade: 1 })}
            >
              <Plus className="mr-1 h-4 w-4" /> Adicionar item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((it) => (
              <ItemRow
                key={it.id}
                item={it}
                onSave={(v) => saveItem.mutate(v)}
                onRemove={() => {
                  if (confirm("Remover este item?")) removeItem.mutate(it.id);
                }}
              />
            ))}
            {!items.length ? (
              <p className="text-sm text-muted-foreground">
                Nenhum item. Adicione produtos ou serviços à proposta.
              </p>
            ) : null}

            <div className="flex flex-col items-end gap-2 border-t pt-4 text-sm">
              <div className="flex w-full max-w-xs justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{brl(quote.subtotal)}</span>
              </div>
              <div className="flex w-full max-w-xs items-center justify-between gap-2">
                <span className="text-muted-foreground">Desconto geral</span>
                <Input
                  className="h-8 w-32 text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={quote.desconto}
                  onBlur={(e) => saveQuote.mutate({ desconto: Number(e.target.value || 0) })}
                />
              </div>
              <div className="flex w-full max-w-xs justify-between text-lg font-bold">
                <span>Total</span>
                <span>{brl(quote.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Status</CardTitle>
              <StatusBadge status={quote.status} kind="quote" />
            </CardHeader>
            <CardContent>
              <Select value={quote.status} onValueChange={(v) => changeStatus.mutate(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Condições comerciais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  defaultValue={toInputDate(quote.data)}
                  onBlur={(e) => saveQuote.mutate({ data: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Validade</Label>
                <Input
                  type="date"
                  defaultValue={toInputDate(quote.validade)}
                  onBlur={(e) => saveQuote.mutate({ validade: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Prazo de entrega</Label>
                <Input
                  defaultValue={quote.prazo_entrega ?? ""}
                  onBlur={(e) => saveQuote.mutate({ prazo_entrega: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Condições de pagamento</Label>
                <Textarea
                  defaultValue={quote.condicoes_pagamento ?? ""}
                  onBlur={(e) => saveQuote.mutate({ condicoes_pagamento: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea
                  defaultValue={quote.observacoes ?? ""}
                  onBlur={(e) => saveQuote.mutate({ observacoes: e.target.value })}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                <Save className="mr-1 inline h-3 w-3" /> As alterações são salvas ao sair do campo.
              </p>
            </CardContent>
          </Card>
        </div>
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
        quoteId={id}
        opportunityId={quote.opportunity_id}
        clientId={quote.client_id}
      />

      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar por e-mail</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Destinatário</Label>
              <Input value={mail.to} onChange={(e) => setMail({ ...mail, to: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Assunto</Label>
              <Input
                value={mail.subject}
                onChange={(e) => setMail({ ...mail, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea
                rows={8}
                value={mail.body}
                onChange={(e) => setMail({ ...mail, body: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Gere o PDF da proposta e anexe no seu programa de e-mail antes de enviar.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMailOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                window.location.href = `mailto:${mail.to}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
                setMailOpen(false);
              }}
            >
              Abrir e-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemRow({
  item,
  onSave,
  onRemove,
}: {
  item: QuoteItem;
  onSave: (v: Partial<QuoteItem>) => void;
  onRemove: () => void;
}) {
  const [v, setV] = useState(item);
  const total = recalcItem(v);
  return (
    <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-12">
      <Input
        className="sm:col-span-2"
        placeholder="Código"
        value={v.codigo ?? ""}
        onChange={(e) => setV({ ...v, codigo: e.target.value })}
        onBlur={() => onSave(v)}
      />
      <Input
        className="sm:col-span-4"
        placeholder="Descrição"
        value={v.descricao}
        onChange={(e) => setV({ ...v, descricao: e.target.value })}
        onBlur={() => onSave(v)}
      />
      <Input
        className="sm:col-span-1"
        placeholder="Un."
        value={v.unidade}
        onChange={(e) => setV({ ...v, unidade: e.target.value })}
        onBlur={() => onSave(v)}
      />
      <Input
        className="sm:col-span-1 text-right"
        type="number"
        step="0.01"
        value={v.quantidade}
        onChange={(e) => setV({ ...v, quantidade: Number(e.target.value) })}
        onBlur={() => onSave(v)}
      />
      <Input
        className="sm:col-span-2 text-right"
        type="number"
        step="0.01"
        value={v.valor_unitario}
        onChange={(e) => setV({ ...v, valor_unitario: Number(e.target.value) })}
        onBlur={() => onSave(v)}
      />
      <Input
        className="sm:col-span-1 text-right"
        type="number"
        step="0.01"
        value={v.desconto}
        onChange={(e) => setV({ ...v, desconto: Number(e.target.value) })}
        onBlur={() => onSave(v)}
      />
      <div className="flex items-center justify-between gap-2 sm:col-span-1">
        <span className="text-sm font-medium">{brl(total)}</span>
        <button onClick={onRemove} aria-label="Remover item" className="rounded p-1 hover:bg-muted">
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  );
}
