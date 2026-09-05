import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Search, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { brl } from "@/lib/format";

type Results = {
  clients: { id: string; razao_social: string; nome_fantasia: string | null }[];
  opportunities: { id: string; numero: string | null; titulo: string }[];
  quotes: { id: string; numero: string | null; total: number }[];
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data } = useQuery({
    queryKey: ["global-search", term],
    enabled: open && term.trim().length >= 2,
    queryFn: async (): Promise<Results> => {
      const q = term.trim();
      const [clients, opportunities, quotes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, razao_social, nome_fantasia")
          .or(`razao_social.ilike.%${q}%,nome_fantasia.ilike.%${q}%,cnpj.ilike.%${q}%`)
          .limit(6),
        supabase
          .from("opportunities")
          .select("id, numero, titulo")
          .or(`titulo.ilike.%${q}%,numero.ilike.%${q}%`)
          .limit(6),
        supabase.from("quotes").select("id, numero, total").ilike("numero", `%${q}%`).limit(6),
      ]);
      return {
        clients: clients.data ?? [],
        opportunities: opportunities.data ?? [],
        quotes: quotes.data ?? [],
      };
    },
  });

  type Destino = "/clientes/$id" | "/oportunidades/$id" | "/orcamentos/$id";

  function go(to: Destino, params: { id: string }) {
    setOpen(false);
    setTerm("");
    navigate({ to, params });
  }

  const semResultado =
    term.trim().length >= 2 &&
    !data?.clients.length &&
    !data?.opportunities.length &&
    !data?.quotes.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted sm:flex"
      >
        <Search className="h-3.5 w-3.5" />
        Buscar...
        <kbd className="ml-2 rounded border bg-background px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        aria-label="Buscar"
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar cliente, oportunidade ou orçamento..."
          value={term}
          onValueChange={setTerm}
        />
        <CommandList>
          {term.trim().length < 2 ? (
            <CommandEmpty>Digite ao menos 2 letras para buscar.</CommandEmpty>
          ) : semResultado ? (
            <CommandEmpty>Nada encontrado para "{term}".</CommandEmpty>
          ) : null}

          {data?.clients.length ? (
            <CommandGroup heading="Clientes">
              {data.clients.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`cliente-${c.id}`}
                  onSelect={() => go("/clientes/$id", { id: c.id })}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  {c.razao_social}
                  {c.nome_fantasia ? (
                    <span className="ml-2 text-xs text-muted-foreground">{c.nome_fantasia}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {data?.opportunities.length ? (
            <CommandGroup heading="Oportunidades">
              {data.opportunities.map((o) => (
                <CommandItem
                  key={o.id}
                  value={`oportunidade-${o.id}`}
                  onSelect={() => go("/oportunidades/$id", { id: o.id })}
                >
                  <Target className="mr-2 h-4 w-4" />
                  {o.numero ? `${o.numero} · ` : ""}
                  {o.titulo}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {data?.quotes.length ? (
            <CommandGroup heading="Orçamentos">
              {data.quotes.map((q) => (
                <CommandItem
                  key={q.id}
                  value={`orcamento-${q.id}`}
                  onSelect={() => go("/orcamentos/$id", { id: q.id })}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {q.numero}
                  <span className="ml-2 text-xs text-muted-foreground">{brl(q.total)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
