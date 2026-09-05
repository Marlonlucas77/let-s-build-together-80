import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, FileText, PhoneCall, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EQSAN | Gestão de Orçamentos e Follow-up Comercial" },
      {
        name: "description",
        content:
          "Plataforma comercial da EQSAN: registre oportunidades, monte orçamentos, gere propostas em PDF e acompanhe follow-ups até o fechamento.",
      },
      { property: "og:title", content: "EQSAN | Gestão de Orçamentos e Follow-up Comercial" },
      {
        property: "og:description",
        content: "Oportunidades, orçamentos, propostas e follow-ups em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Target, title: "Oportunidades", desc: "Da solicitação ao fechamento, com funil visual." },
  { icon: FileText, title: "Orçamentos", desc: "Itens, cálculos automáticos e proposta em PDF." },
  {
    icon: PhoneCall,
    title: "Follow-ups",
    desc: "Alertas de atrasados, de hoje e dos próximos dias.",
  },
  {
    icon: BarChart3,
    title: "Indicadores",
    desc: "Conversão, valores em negociação e motivos de perda.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              EQ
            </span>
            <span className="text-lg font-semibold">EQSAN</span>
          </div>
          <Button asChild>
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Gestão de Orçamentos e Follow-up Comercial
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Registre oportunidades, monte orçamentos profissionais e nunca mais perca um retorno de
            cliente por falta de acompanhamento.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Acessar o sistema</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <f.icon className="h-6 w-6 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        EQSAN · Setor Comercial
      </footer>
    </div>
  );
}
