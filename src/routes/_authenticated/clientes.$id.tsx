import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MessageCircle, Pencil, Plus, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
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
import { brl, fmtDate, validEmail, whatsappLink } from "@/lib/format";
import type { Client, Contact, Opportunity, Quote } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente | EQSAN Comercial" },
      {
        name: "description",
        content: "Dados cadastrais, contatos, oportunidades e orçamentos do cliente.",
      },
      { property: "og:title", content: "Ficha do cliente | EQSAN Comercial" },
      { property: "og:description", content: "Histórico comercial completo do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<Partial<Contact>>({});

  const { data } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [c, ct, op, qt] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).maybeSingle(),
        supabase.from("contacts").select("*").eq("client_id", id).order("nome"),
        supabase
          .from("opportunities")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("quotes")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
      ]);
      return {
        client: c.data as Client | null,
        contacts: (ct.data ?? []) as Contact[],
        opportunities: (op.data ?? []) as Opportunity[],
        quotes: (qt.data ?? []) as Quote[],
      };
    },
  });

  const client = data?.client;
  const contacts = data?.contacts ?? [];
  const opportunities = data?.opportunities ?? [];
  const quotes = data?.quotes ?? [];

  const saveContact = useMutation({
    mutationFn: async (payload: Partial<Contact>) => {
      if (payload.id) {
        const { error } = await supabase.from("contacts").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contacts")
          .insert({ ...payload, client_id: id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      setOpen(false);
      setContact({});
      toast.success("Contato salvo.");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeContact = useMutation({
    mutationFn: async (cid: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", cid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client", id] });
      toast.success("Contato removido.");
    },
  });

  if (!client) {
    return <p className="text-sm text-muted-foreground">Carregando cliente...</p>;
  }

  const aprovados = opportunities.filter((o) => o.status === "aprovada").length;
  const perdidos = opportunities.filter((o) => o.status === "perdida").length;

  return (
    <div>
      <Link
        to="/clientes"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </Link>

      <PageHeader
        title={client.razao_social}
        subtitle={[client.nome_fantasia, client.cnpj].filter(Boolean).join(" · ")}
        actions={
          client.whatsapp ? (
            <Button variant="outline" asChild>
              <a
                href={whatsappLink(client.whatsapp, `Olá! Aqui é da EQSAN.`)}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
              </a>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="CNPJ" value={client.cnpj} />
            <Info label="Telefone" value={client.telefone} />
            <Info label="WhatsApp" value={client.whatsapp} />
            <Info label="E-mail" value={client.email} />
            <Info label="Site" value={client.site} />
            <Info label="Endereço" value={client.endereco} />
            <Info
              label="Cidade/UF"
              value={client.cidade ? `${client.cidade}/${client.estado ?? ""}` : null}
            />
            <Info label="CEP" value={client.cep} />
            {client.observacoes ? (
              <p className="pt-2 text-muted-foreground">{client.observacoes}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Oportunidades" value={String(opportunities.length)} />
            <Info label="Orçamentos" value={String(quotes.length)} />
            <Info label="Aprovados" value={String(aprovados)} />
            <Info label="Perdidos" value={String(perdidos)} />
            <Info
              label="Valor aprovado"
              value={brl(
                quotes
                  .filter((q) => q.status === "aprovado")
                  .reduce((s, q) => s + Number(q.total), 0),
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Contatos</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setContact({});
                setOpen(true);
              }}
            >
              <Plus className="mr-1 h-4 w-4" /> Novo
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.cargo}</p>
                  </div>
                  <div className="flex gap-1">
                    {c.whatsapp ? (
                      <a
                        href={whatsappLink(c.whatsapp, `Olá, ${c.nome}! Aqui é da EQSAN.`)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1.5 hover:bg-muted"
                        aria-label="WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                      </a>
                    ) : null}
                    {c.email ? (
                      <a
                        href={`mailto:${c.email}`}
                        className="rounded p-1.5 hover:bg-muted"
                        aria-label="E-mail"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    ) : null}
                    <button
                      className="rounded p-1.5 hover:bg-muted"
                      aria-label="Editar contato"
                      onClick={() => {
                        setContact(c);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className="rounded p-1.5 hover:bg-muted"
                      aria-label="Remover contato"
                      onClick={() => {
                        if (confirm(`Remover o contato ${c.nome}?`)) removeContact.mutate(c.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[c.telefone, c.email].filter(Boolean).join(" · ")}
                </p>
              </div>
            ))}
            {!contacts.length ? (
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Oportunidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {opportunities.map((o) => (
              <Link
                key={o.id}
                to="/oportunidades/$id"
                params={{ id: o.id }}
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.numero} · {fmtDate(o.created_at)}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
            {!opportunities.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma oportunidade.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orçamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quotes.map((q) => (
              <Link
                key={q.id}
                to="/orcamentos/$id"
                params={{ id: q.id }}
                className="flex items-center justify-between gap-2 rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{q.numero}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(q.data)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{brl(q.total)}</span>
                  <StatusBadge status={q.status} kind="quote" />
                </div>
              </Link>
            ))}
            {!quotes.length ? (
              <p className="text-sm text-muted-foreground">Nenhum orçamento.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contact.id ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!contact.nome || contact.nome.trim().length < 2) {
                toast.error("Informe o nome do contato.");
                return;
              }
              if (contact.email && !validEmail(contact.email)) {
                toast.error("E-mail inválido.");
                return;
              }
              saveContact.mutate(contact);
            }}
          >
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={contact.nome ?? ""}
                onChange={(e) => setContact({ ...contact, nome: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={contact.cargo ?? ""}
                  onChange={(e) => setContact({ ...contact, cargo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={contact.telefone ?? ""}
                  onChange={(e) => setContact({ ...contact, telefone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={contact.whatsapp ?? ""}
                  onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={contact.email ?? ""}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={contact.observacoes ?? ""}
                onChange={(e) => setContact({ ...contact, observacoes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "-"}</span>
    </div>
  );
}
