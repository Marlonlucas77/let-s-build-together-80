import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, Clock, MailQuestion } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      ).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

      const [atrasados, hoje, semRetorno] = await Promise.all([
        supabase
          .from("follow_ups")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente")
          .lt("proximo_followup", startOfDay),
        supabase
          .from("follow_ups")
          .select("id", { count: "exact", head: true })
          .eq("status", "pendente")
          .gte("proximo_followup", startOfDay)
          .lte("proximo_followup", endOfDay),
        supabase
          .from("quotes")
          .select("id", { count: "exact", head: true })
          .eq("status", "enviado")
          .lt("updated_at", sevenDaysAgo),
      ]);

      return {
        atrasados: atrasados.count ?? 0,
        hoje: hoje.count ?? 0,
        semRetorno: semRetorno.count ?? 0,
      };
    },
    refetchOnWindowFocus: true,
  });
}

export function AlertsBell() {
  const { data } = useAlerts();
  const total = (data?.atrasados ?? 0) + (data?.hoje ?? 0) + (data?.semRetorno ?? 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Alertas">
          <Bell className="h-5 w-5" />
          {total > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-3 text-sm font-semibold">Alertas</p>
        <div className="space-y-2 text-sm">
          <Link
            to="/followups"
            className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-rose-900"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Você possui <strong>{data?.atrasados ?? 0}</strong> follow-ups atrasados.
            </span>
          </Link>
          <Link
            to="/followups"
            className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900"
          >
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Você possui <strong>{data?.hoje ?? 0}</strong> follow-ups para hoje.
            </span>
          </Link>
          <Link
            to="/orcamentos"
            className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sky-900"
          >
            <MailQuestion className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Existem <strong>{data?.semRetorno ?? 0}</strong> propostas enviadas sem retorno há
              mais de 7 dias.
            </span>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
