import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTACT_TYPES, OPP_STATUS, QUOTE_STATUS } from "@/lib/constants";
import { brl } from "@/lib/format";
import {
  fetchProducts,
  fetchSalesGoals,
  fetchSettings,
  type Product,
  type SalesGoal,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | EQSAN Comercial" },
      {
        name: "description",
        content: "Dados da empresa, textos da proposta, usuários e listas do sistema.",
      },
      { property: "og:title", content: "Configurações | EQSAN Comercial" },
      { property: "og:description", content: "Personalize o sistema comercial da EQSAN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { role, user } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [novoVendedor, setNovoVendedor] = useState("");
  const [novaMeta, setNovaMeta] = useState("");

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data: users = [] } = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role ?? "comercial",
      }));
    },
  });
  const { data: reasons = [] } = useQuery({
    queryKey: ["loss-reasons"],
    queryFn: async () => {
      const { data } = await supabase.from("loss_reasons").select("*").order("nome");
      return (data ?? []) as { id: string; nome: string; ativo: boolean }[];
    },
  });
  const { data: goals = [] } = useQuery({
    queryKey: ["sales-goals", ano, mes],
    queryFn: () => fetchSalesGoals(ano, mes),
  });
  const { data: products = [] } = useQuery({
    queryKey: ["products", "all"],
    queryFn: () => fetchProducts(false),
  });
  const [novoProduto, setNovoProduto] = useState({
    codigo: "",
    descricao: "",
    unidade: "un",
    preco: "",
  });

  const saveProduct = useMutation({
    mutationFn: async (p: {
      codigo: string;
      descricao: string;
      unidade: string;
      preco: string;
    }) => {
      if (!p.descricao.trim()) throw new Error("Informe a descrição.");
      const { error } = await supabase.from("products").insert({
        codigo: p.codigo.trim() || null,
        descricao: p.descricao.trim(),
        unidade: p.unidade.trim() || "un",
        preco_unitario: Number(p.preco || 0),
        created_by: user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Item adicionado ao catálogo.");
      setNovoProduto({ codigo: "", descricao: "", unidade: "un", preco: "" });
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const toggleProduct = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("products").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const saveGoal = useMutation({
    mutationFn: async (goal: { responsavel: string; meta_valor: number; id?: string }) => {
      if (goal.id) {
        const { error } = await supabase
          .from("sales_goals")
          .update({ meta_valor: goal.meta_valor })
          .eq("id", goal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sales_goals").insert({
          responsavel: goal.responsavel,
          ano,
          mes,
          meta_valor: goal.meta_valor,
          created_by: user?.id ?? null,
        } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales-goals", ano, mes] });
      toast.success("Meta salva.");
      setNovoVendedor("");
      setNovaMeta("");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  const removeGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-goals", ano, mes] }),
  });

  useEffect(() => {
    if (settings)
      setForm(
        Object.fromEntries(
          Object.entries(settings).map(([k, v]) => [k, v === null ? "" : String(v)]),
        ),
      );
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_nome: form["empresa_nome"] || "EQSAN",
        empresa_cnpj: form["empresa_cnpj"] || null,
        empresa_telefone: form["empresa_telefone"] || null,
        empresa_email: form["empresa_email"] || null,
        empresa_site: form["empresa_site"] || null,
        empresa_endereco: form["empresa_endereco"] || null,
        logo_url: form["logo_url"] || null,
        proposta_texto_abertura: form["proposta_texto_abertura"] || null,
        proposta_texto_rodape: form["proposta_texto_rodape"] || null,
        condicoes_pagamento_padrao: form["condicoes_pagamento_padrao"] || null,
        validade_padrao_dias: Number(form["validade_padrao_dias"] || 15),
      };
      if (settings?.id) {
        const { error } = await supabase.from("settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configurações salvas.");
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Dados da empresa e parâmetros das propostas" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da empresa</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" k="empresa_nome" form={form} setForm={setForm} />
            <Field label="CNPJ" k="empresa_cnpj" form={form} setForm={setForm} />
            <Field label="Telefone" k="empresa_telefone" form={form} setForm={setForm} />
            <Field label="E-mail" k="empresa_email" form={form} setForm={setForm} />
            <Field label="Site" k="empresa_site" form={form} setForm={setForm} />
            <Field label="Logo (URL)" k="logo_url" form={form} setForm={setForm} />
            <div className="sm:col-span-2">
              <Field label="Endereço" k="empresa_endereco" form={form} setForm={setForm} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposta comercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Texto de abertura</Label>
              <Textarea
                value={form["proposta_texto_abertura"] ?? ""}
                onChange={(e) => setForm({ ...form, proposta_texto_abertura: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Texto de rodapé</Label>
              <Textarea
                value={form["proposta_texto_rodape"] ?? ""}
                onChange={(e) => setForm({ ...form, proposta_texto_rodape: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Condições de pagamento padrão</Label>
              <Textarea
                value={form["condicoes_pagamento_padrao"] ?? ""}
                onChange={(e) => setForm({ ...form, condicoes_pagamento_padrao: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Validade padrão (dias)</Label>
              <Input
                type="number"
                min="1"
                value={form["validade_padrao_dias"] ?? "15"}
                onChange={(e) => setForm({ ...form, validade_padrao_dias: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar configurações
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Metas comerciais</CardTitle>
            <div className="flex items-center gap-1">
              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="h-8 w-20 text-xs"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value) || now.getFullYear())}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {goals.length ? (
              goals.map((g) => (
                <GoalRow
                  key={g.id}
                  goal={g}
                  admin={role === "admin"}
                  onSave={saveGoal.mutate}
                  onRemove={removeGoal.mutate}
                />
              ))
            ) : (
              <p className="text-muted-foreground">Nenhuma meta cadastrada para este período.</p>
            )}
            {role === "admin" ? (
              <div className="flex items-end gap-2 border-t pt-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Vendedor</Label>
                  <Input
                    value={novoVendedor}
                    onChange={(e) => setNovoVendedor(e.target.value)}
                    placeholder="Nome do vendedor"
                  />
                </div>
                <div className="w-32 space-y-1">
                  <Label className="text-xs">Meta (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={novaMeta}
                    onChange={(e) => setNovaMeta(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!novoVendedor.trim() || !novaMeta}
                  onClick={() =>
                    saveGoal.mutate({
                      responsavel: novoVendedor.trim(),
                      meta_valor: Number(novaMeta),
                    })
                  }
                >
                  Adicionar
                </Button>
              </div>
            ) : (
              <p className="pt-2 text-xs text-muted-foreground">
                Somente administradores definem as metas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários e permissões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between border-b py-2 last:border-0"
              >
                <div>
                  <p className="font-medium">{u.full_name || u.email}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-xs uppercase">{u.role}</span>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              {role === "admin"
                ? "Novos usuários entram como Comercial. O primeiro cadastro do sistema é Administrador."
                : "Somente administradores alteram perfis de acesso."}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Listas do sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <List
              title="Motivos de perda"
              items={reasons.filter((r) => r.ativo).map((r) => r.nome)}
            />
            <List title="Tipos de contato" items={CONTACT_TYPES.map((c) => c.label)} />
            <List title="Status de oportunidade" items={OPP_STATUS.map((s) => s.label)} />
            <List title="Status de orçamento" items={QUOTE_STATUS.map((s) => s.label)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Catálogo de produtos/serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {products.length ? (
              products.map((p) => (
                <div
                  key={p.id}
                  className={
                    "flex items-center justify-between gap-2 border-b py-1.5 last:border-0 " +
                    (p.ativo ? "" : "opacity-50")
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.codigo ? `${p.codigo} · ` : ""}
                      {p.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.unidade} · {brl(p.preco_unitario)}
                    </p>
                  </div>
                  {role === "admin" ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => toggleProduct.mutate({ id: p.id, ativo: !p.ativo })}
                        className="text-xs text-primary hover:underline"
                      >
                        {p.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Remover este item do catálogo?")) removeProduct.mutate(p.id);
                        }}
                        aria-label="Remover item"
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Catálogo vazio.</p>
            )}
            {role === "admin" ? (
              <div className="grid gap-2 border-t pt-3 sm:grid-cols-[80px_1fr_70px_100px_auto]">
                <Input
                  placeholder="Código"
                  className="h-8 text-xs"
                  value={novoProduto.codigo}
                  onChange={(e) => setNovoProduto({ ...novoProduto, codigo: e.target.value })}
                />
                <Input
                  placeholder="Descrição"
                  className="h-8 text-xs"
                  value={novoProduto.descricao}
                  onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                />
                <Input
                  placeholder="Un."
                  className="h-8 text-xs"
                  value={novoProduto.unidade}
                  onChange={(e) => setNovoProduto({ ...novoProduto, unidade: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Preço"
                  className="h-8 text-xs"
                  value={novoProduto.preco}
                  onChange={(e) => setNovoProduto({ ...novoProduto, preco: e.target.value })}
                />
                <Button size="sm" className="h-8" onClick={() => saveProduct.mutate(novoProduto)}>
                  Adicionar
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function GoalRow({
  goal,
  admin,
  onSave,
  onRemove,
}: {
  goal: SalesGoal;
  admin: boolean;
  onSave: (v: { id: string; responsavel: string; meta_valor: number }) => void;
  onRemove: (id: string) => void;
}) {
  const [valor, setValor] = useState(String(goal.meta_valor));
  return (
    <div className="flex items-center justify-between gap-2 border-b py-1.5 last:border-0">
      <span className="font-medium">{goal.responsavel}</span>
      {admin ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step="0.01"
            className="h-8 w-28 text-right text-xs"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onBlur={() =>
              onSave({ id: goal.id, responsavel: goal.responsavel, meta_valor: Number(valor || 0) })
            }
          />
          <button
            onClick={() => onRemove(goal.id)}
            aria-label="Remover meta"
            className="rounded p-1 hover:bg-muted"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </button>
        </div>
      ) : (
        <span className="text-muted-foreground">{brl(goal.meta_valor)}</span>
      )}
    </div>
  );
}

function Field({
  label,
  k,
  form,
  setForm,
}: {
  label: string;
  k: string;
  form: Record<string, string>;
  setForm: (v: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i} className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs">
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}
