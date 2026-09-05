import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Preset<F> = { nome: string; filtros: F };

function storageKey(namespace: string) {
  return `eqsan:filtros-salvos:${namespace}`;
}

function loadPresets<F>(namespace: string): Preset<F>[] {
  try {
    const raw = localStorage.getItem(storageKey(namespace));
    return raw ? (JSON.parse(raw) as Preset<F>[]) : [];
  } catch {
    return [];
  }
}

/**
 * Barra de "filtros salvos": permite nomear e salvar a combinação atual de
 * filtros de uma listagem (busca, status, período etc.) e reaplicá-la depois
 * com um clique. Fica só no navegador do usuário (localStorage), não é
 * compartilhado entre pessoas nem sincronizado com o banco.
 */
export function SavedFilters<F extends Record<string, unknown>>({
  namespace,
  currentFilters,
  onApply,
}: {
  namespace: string;
  currentFilters: F;
  onApply: (filtros: F) => void;
}) {
  const [presets, setPresets] = useState<Preset<F>[]>([]);
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setPresets(loadPresets<F>(namespace));
  }, [namespace]);

  function persist(next: Preset<F>[]) {
    setPresets(next);
    localStorage.setItem(storageKey(namespace), JSON.stringify(next));
  }

  function save() {
    if (!name.trim()) return;
    const next = [
      ...presets.filter((p) => p.nome !== name.trim()),
      { nome: name.trim(), filtros: currentFilters },
    ];
    persist(next);
    setName("");
    setOpen(false);
  }

  function remove(nome: string) {
    persist(presets.filter((p) => p.nome !== nome));
  }

  return (
    <div className="flex items-center gap-2">
      {presets.length ? (
        <Select onValueChange={(v) => onApply(presets.find((p) => p.nome === v)!.filtros)}>
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue placeholder="Filtros salvos" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((p) => (
              <div key={p.nome} className="flex items-center justify-between pr-1">
                <SelectItem value={p.nome} className="flex-1">
                  {p.nome}
                </SelectItem>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(p.nome);
                  }}
                  aria-label={`Remover filtro salvo ${p.nome}`}
                  className="rounded p-1 hover:bg-muted"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Bookmark className="mr-1 h-3.5 w-3.5" /> Salvar filtro
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <p className="mb-2 text-xs text-muted-foreground">
            Salva a combinação atual de filtros com um nome, só neste navegador.
          </p>
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs"
              placeholder="Nome do filtro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
            <Button size="sm" className="h-8" onClick={save} disabled={!name.trim()}>
              Salvar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
