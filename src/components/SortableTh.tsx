import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortState<K extends string> = { key: K; dir: "asc" | "desc" } | null;

export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const active = sort?.key === sortKey;
  return (
    <th className={cn("px-4 py-3", className)}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex items-center gap-1 hover:text-foreground",
          align === "right" ? "ml-auto flex-row-reverse" : "",
        )}
      >
        {label}
        {active ? (
          sort!.dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

export function toggleSort<K extends string>(current: SortState<K>, key: K): SortState<K> {
  if (!current || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}

export function applySort<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  getValue: (row: T, key: K) => string | number | null | undefined,
): T[] {
  if (!sort) return rows;
  const sorted = [...rows].sort((a, b) => {
    const va = getValue(a, sort.key);
    const vb = getValue(b, sort.key);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return va - vb;
    return String(va).localeCompare(String(vb), "pt-BR");
  });
  return sort.dir === "desc" ? sorted.reverse() : sorted;
}
