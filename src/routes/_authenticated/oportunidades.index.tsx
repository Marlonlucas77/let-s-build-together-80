import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { OPP_STATUS, ORIGENS } from "@/lib/constants";
import { brl, fmtDate } from "@/lib/format";
import { fetchClients, fetchContacts, logActivity, type Opportunity } from "@/lib/api";
import { useAuth, userName } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/oportunidades/")({
  head: () => ({
    meta: [
      { title: "Oportunidades | EQSAN Comercial" },
      {
        name: "description",
        content: "Registro e acompanhamento das oportunidades comerciais da EQSAN.",
      },
      { property: "og:title", content: "Oportunidades | EQSAN Comercial" },
      { property: "og:description", content: "Da solicitação ao fechamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: opps = [] } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, clients(razao_social)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (Opportunity & { clients: { razao_social: string } | null })[];
    },
  });
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts", form["client_id"]],
    queryFn: () => fetchContacts(form["client_id"]),
    enabled: !!form["client_id"],
  });

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return opps.filter((o) => {
      const okStatus = statusFilter === "todos" || o.status === statusFilter;
      const okText =
        !t ||
        [o.titulo, o.numero, o.clients?.razao_social].some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(t),
        );
      return okStatus && okText;
    });
  }, [opps, search, statusFilter]);

  const create = useMutation({
    mutationFn: async () => {
      const responsavel = form["responsavel"] || userName(profile, user);
      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          client_id: form["client_id"],
          contact_id: form["contact_id"] || null,
          titulo: form["titulo"],
          descricao: form["descricao"] || null,
          produto_servico: form["produto_servico"] || null,
          valor_estimado: Number(form["valor_estimado"] || 0),
          probabilidade: Number(form["probabilidade"] || 50),
          prazo_desejado: form["prazo_desejado"] || null,
          origem: form["origem"] || null,
          status: form["status"] || "nova_solicitacao",
          observacoes: form["observacoes"] || null,
          responsavel,
        } as never)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        opportunity_id: data.id,
        client_id: data.client_id,
        tipo: "criacao",
        descricao: "Oportunidade criada.",
        usuario: responsavel,
      });
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries();
      setOpen(false);
      setForm({});
      toast.success("Oportunidade criada.");
      navigate({ to: "/oportunidades/$id", params: { id: data.id } });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <div>
      <PageHeader
        title="Oportunidades"
        subtitle={`${opps.length} oportunidades registradas`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova oportunidade
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por título, número ou cliente"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-64">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {OPP_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Número</th>
                  <th className="px-4 py-3">Título</th>
                  <th className="hidden px-4 py-3 md:table-cell">Cliente</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Responsável</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Criada em</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        to="/oportunidades/$id"
                        params={{ id: o.id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {o.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{o.titulo}</td>
                    <td className="hidden px-4 py-3 md:table-cell">{o.clients?.razao_social}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">{o.responsavel}</td>
                    <td className="px-4 py-3 text-right font-medium">{brl(o.valor_estimado)}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">{fmtDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
                {!filtered.length ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={7}>
                      Nenhuma oportunidade encontrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova oportunidade</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form["client_id"]) {
                toast.error("Selecione o cliente.");
                return;
              }
              if (!form["titulo"]) {
                toast.error("Informe o título.");
                return;
              }
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Título *</Label>
              <Input
                value={form["titulo"] ?? ""}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                value={form["descricao"] ?? ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Produto / serviço</Label>
              <Input
                value={form["produto_servico"] ?? ""}
                onChange={(e) => setForm({ ...form, produto_servico: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Valor estimado (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form["valor_estimado"] ?? ""}
                onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Probabilidade (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form["probabilidade"] ?? "50"}
                onChange={(e) => setForm({ ...form, probabilidade: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo desejado</Label>
              <Input
                type="date"
                value={form["prazo_desejado"] ?? ""}
                onChange={(e) => setForm({ ...form, prazo_desejado: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Origem</Label>
              <Select
                value={form["origem"] ?? ""}
                onValueChange={(v) => setForm({ ...form, origem: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form["status"] ?? "nova_solicitacao"}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea
                value={form["observacoes"] ?? ""}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={create.isPending}>
                Criar oportunidade
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
