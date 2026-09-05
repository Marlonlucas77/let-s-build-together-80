import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { QUOTE_STATUS } from "@/lib/constants";
import { brl, csvDownload, fmtDate, onlyDigits, toInputDate } from "@/lib/format";
import {
  fetchClients,
  fetchContacts,
  fetchSettings,
  logActivity,
  type Client,
  type Quote,
} from "@/lib/api";
import { useAuth, userName } from "@/hooks/useAuth";

type Search = { nova?: string };

export const Route = createFileRoute("/_authenticated/orcamentos")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    nova: typeof search["nova"] === "string" ? search["nova"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Orçamentos | EQSAN Comercial" },
      { name: "description", content: "Listagem, filtros e criação de orçamentos comerciais da EQSAN." },
      { property: "og:title", content: "Orçamentos | EQSAN Comercial" },
      { property: "og:description", content: "Controle de propostas, valores e validade." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QuotesPage,
});

function QuotesPage() {
  const { nova } = Route.useSearch();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [atrasado, setAtrasado] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", form["client_id"]],
    queryFn: () => fetchContacts(form["client_id"]),
    enabled: !!form["client_id"],
  });

  const { data: rows = [] } = useQuery({
    queryKey: ["quotes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(razao_social, cnpj), follow_ups(data, proximo_followup)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as (Quote & {
        clients: Pick<Client, "razao_social" | "cnpj"> | null;
        follow_ups: { data: string; proximo_followup: string | null }[];
      })[];
    },
  });

  // Pré-seleciona o cliente quando vier de uma oportunidade
  useEffect(() => {
    if (!nova) return;
    (async () => {
      const { data } = await supabase
        .from("opportunities")
        .select("id, client_id, contact_id, responsavel")
        .eq("id", nova)
        .maybeSingle();
      if (data) {
        setForm({
          client_id: data.client_id,
          contact_id: data.contact_id ?? "",
          opportunity_id: data.id,
          responsavel: data.responsavel ?? "",
        });
        setOpen(true);
      }
    })();
  }, [nova]);

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return rows.filter((q) => {
      const okStatus = statusFilter === "todos" || q.status === statusFilter;
      const okText =
        !t ||
        [q.numero, q.clients?.razao_social, q.responsavel].some((v) =>
          String(v ?? "").toLowerCase().includes(t),
        ) ||
        onlyDigits(q.clients?.cnpj).includes(onlyDigits(t));
      const okDe = !de || q.data >= de;
      const okAte = !ate || q.data <= ate;
      const proximos = q.follow_ups
        .map((f) => f.proximo_followup)
        .filter(Boolean)
        .sort() as string[];
      const okAtraso =
        !atrasado || (proximos.length > 0 && new Date(proximos[0]!).getTime() < Date.now());
      return okStatus && okText && okDe && okAte && okAtraso;
    });
  }, [rows, search, statusFilter, de, ate, atrasado]);

  const create = useMutation({
    mutationFn: async () => {
      const responsavel = form["responsavel"] || userName(profile, user);
      const dias = settings?.validade_padrao_dias ?? 15;
      const validade = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("quotes")
        .insert({
          client_id: form["client_id"],
          contact_id: form["contact_id"] || null,
          opportunity_id: form["opportunity_id"] || null,
          responsavel,
          data: new Date().toISOString().slice(0, 10),
          validade,
          condicoes_pagamento: settings?.condicoes_pagamento_padrao ?? null,
          status: "em_elaboracao",
        } as never)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        quote_id: data.id,
        opportunity_id: data.opportunity_id,
        client_id: data.client_id,
        tipo: "criacao",
        descricao: `Orçamento ${data.numero} criado.`,
        usuario: responsavel,
      });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({});
      navigate({ to: "/orcamentos/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  function exportCsv() {
    csvDownload("orcamentos.csv", [
      ["Número", "Cliente", "Responsável", "Valor", "Data", "Validade", "Status"],
      ...filtered.map((q) => [
        q.numero ?? "",
        q.clients?.razao_social ?? "",
        q.responsavel ?? "",
        Number(q.total).toFixed(2),
        q.data,
        q.validade ?? "",
        q.status,
      ]),
    ]);
  }

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        subtitle={`${rows.length} orçamentos cadastrados`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo orçamento
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Número, cliente ou CNPJ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {QUOTE_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm md:col-span-4">
          <input
            type="checkbox"
            checked={atrasado}
            onChange={(e) => setAtrasado(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Somente com follow-up atrasado
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Responsável</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="hidden px-4 py-3 md:table-cell">Data</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Validade</th>
                  <th className="hidden px-4 py-3 xl:table-cell">Próximo follow-up</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => {
                  const proximo = q.follow_ups
                    .map((f) => f.proximo_followup)
                    .filter(Boolean)
                    .sort()[0];
                  return (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link
                          to="/orcamentos/$id"
                          params={{ id: q.id }}
                          className="font-medium text-primary hover:underline"
                        >
                          {q.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{q.clients?.razao_social}</td>
                      <td className="hidden px-4 py-3 lg:table-cell">{q.responsavel}</td>
                      <td className="px-4 py-3 text-right font-medium">{brl(q.total)}</td>
                      <td className="hidden px-4 py-3 md:table-cell">{fmtDate(q.data)}</td>
                      <td className="hidden px-4 py-3 lg:table-cell">{fmtDate(q.validade)}</td>
                      <td className="hidden px-4 py-3 xl:table-cell">{fmtDate(proximo)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={q.status} kind="quote" />
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                      Nenhum orçamento encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo orçamento</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form["client_id"]) return toast.error("Selecione o cliente.");
              create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={form["client_id"] ?? ""}
                onValueChange={(v) => setForm({ ...form, client_id: v, contact_id: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contato</Label>
              <Select
                value={form["contact_id"] ?? ""}
                onValueChange={(v) => setForm({ ...form, contact_id: v })}
                disabled={!form["client_id"]}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              A validade padrão de {settings?.validade_padrao_dias ?? 15} dias e as condições de
              pagamento serão aplicadas automaticamente (
              {toInputDate(new Date().toISOString())}).
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                Criar e adicionar itens
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
