import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_TYPES, OPP_STATUS, QUOTE_STATUS } from "@/lib/constants";
import { fetchSettings } from "@/lib/api";
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
  const { role } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({});

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
      </div>
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
