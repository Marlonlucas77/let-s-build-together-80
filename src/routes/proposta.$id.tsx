import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { brl, fmtDate, num } from "@/lib/format";
import { fetchSettings, type Client, type Contact, type Quote, type QuoteItem } from "@/lib/api";

export const Route = createFileRoute("/proposta/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Proposta comercial | EQSAN" },
      {
        name: "description",
        content: "Proposta comercial EQSAN pronta para visualizar, imprimir ou salvar em PDF.",
      },
      { property: "og:title", content: "Proposta comercial | EQSAN" },
      {
        property: "og:description",
        content: "Documento comercial com itens, valores e condições.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProposalPage,
});

function ProposalPage() {
  const { id } = Route.useParams();

  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const { data } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data: quote } = await supabase
        .from("quotes")
        .select("*, clients(*), contacts(*)")
        .eq("id", id)
        .maybeSingle();
      const { data: items } = await supabase
        .from("quote_items")
        .select("*")
        .eq("quote_id", id)
        .order("ordem");
      return {
        quote: quote as unknown as
          (Quote & { clients: Client | null; contacts: Contact | null }) | null,
        items: (items ?? []) as QuoteItem[],
      };
    },
  });

  useEffect(() => {
    document.body.classList.add("bg-white");
    return () => document.body.classList.remove("bg-white");
  }, []);

  const quote = data?.quote;
  const items = data?.items ?? [];
  if (!quote) return <p className="p-8 text-sm text-muted-foreground">Carregando proposta...</p>;

  const empresa = settings?.empresa_nome ?? "EQSAN";

  return (
    <div className="mx-auto max-w-4xl bg-white p-6 text-slate-900 print:p-0">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          to="/orcamentos/$id"
          params={{ id }}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao orçamento
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-primary pb-4">
        <div className="flex items-center gap-4">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt={`Logo ${empresa}`} className="h-14 w-auto" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded bg-primary text-xl font-bold text-primary-foreground">
              EQ
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{empresa}</h1>
            <p className="text-xs text-slate-600">
              {[
                settings?.empresa_cnpj && `CNPJ ${settings.empresa_cnpj}`,
                settings?.empresa_telefone,
                settings?.empresa_email,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-xs text-slate-600">{settings?.empresa_endereco}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-slate-500">Proposta comercial</p>
          <p className="text-xl font-bold">{quote.numero}</p>
          <p className="text-xs text-slate-600">Data: {fmtDate(quote.data)}</p>
          <p className="text-xs text-slate-600">Validade: {fmtDate(quote.validade)}</p>
          <p className="text-xs text-slate-600">Versão: {quote.versao}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-slate-200 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cliente
          </h2>
          <p className="font-semibold">{quote.clients?.razao_social}</p>
          {quote.clients?.cnpj ? <p className="text-sm">CNPJ: {quote.clients.cnpj}</p> : null}
          {quote.clients?.endereco ? <p className="text-sm">{quote.clients.endereco}</p> : null}
          <p className="text-sm">
            {[quote.clients?.cidade, quote.clients?.estado].filter(Boolean).join("/")}
          </p>
        </div>
        <div className="rounded border border-slate-200 p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Contato
          </h2>
          <p className="font-semibold">{quote.contacts?.nome ?? "-"}</p>
          <p className="text-sm">{quote.contacts?.cargo}</p>
          <p className="text-sm">{quote.contacts?.email ?? quote.clients?.email}</p>
          <p className="text-sm">{quote.contacts?.telefone ?? quote.clients?.telefone}</p>
        </div>
      </section>

      {settings?.proposta_texto_abertura ? (
        <p className="mt-6 text-sm leading-relaxed text-slate-700">
          {settings.proposta_texto_abertura}
        </p>
      ) : null}

      <section className="mt-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="px-2 py-2 text-left">Item</th>
              <th className="px-2 py-2 text-left">Descrição</th>
              <th className="px-2 py-2 text-center">Un.</th>
              <th className="px-2 py-2 text-right">Qtd.</th>
              <th className="px-2 py-2 text-right">Valor unit.</th>
              <th className="px-2 py-2 text-right">Desconto</th>
              <th className="px-2 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className="border-b border-slate-200">
                <td className="px-2 py-2">{it.codigo || String(i + 1).padStart(2, "0")}</td>
                <td className="px-2 py-2">{it.descricao}</td>
                <td className="px-2 py-2 text-center">{it.unidade}</td>
                <td className="px-2 py-2 text-right">{num(it.quantidade)}</td>
                <td className="px-2 py-2 text-right">{brl(it.valor_unitario)}</td>
                <td className="px-2 py-2 text-right">{brl(it.desconto)}</td>
                <td className="px-2 py-2 text-right font-medium">{brl(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span>{brl(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Desconto</span>
              <span>- {brl(quote.desconto)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 text-lg font-bold">
              <span>Total</span>
              <span>{brl(quote.total)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Condições de pagamento
          </h3>
          <p>{quote.condicoes_pagamento || "-"}</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prazo de entrega
          </h3>
          <p>{quote.prazo_entrega || "-"}</p>
        </div>
        {quote.observacoes ? (
          <div className="sm:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Observações
            </h3>
            <p className="whitespace-pre-line">{quote.observacoes}</p>
          </div>
        ) : null}
      </section>

      <footer className="mt-10 border-t pt-4 text-sm">
        <p className="font-semibold">{quote.responsavel}</p>
        <p className="text-slate-600">Consultor comercial · {empresa}</p>
        {settings?.proposta_texto_rodape ? (
          <p className="mt-4 text-xs text-slate-500">{settings.proposta_texto_rodape}</p>
        ) : null}
      </footer>
    </div>
  );
}
