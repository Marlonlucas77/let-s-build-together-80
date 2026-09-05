import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CONTACT_TYPES, contactTypeLabel } from "@/lib/constants";
import { logActivity } from "@/lib/api";
import { useAuth, userName } from "@/hooks/useAuth";

export function FollowUpDialog({
  open,
  onOpenChange,
  opportunityId,
  quoteId,
  clientId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  opportunityId?: string | null;
  quoteId?: string | null;
  clientId?: string | null;
}) {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const [tipo, setTipo] = useState("ligacao");
  const [observacao, setObservacao] = useState("");
  const [proximo, setProximo] = useState("");
  const [status, setStatus] = useState("realizado");

  const save = useMutation({
    mutationFn: async () => {
      const responsavel = userName(profile, user);
      const { error } = await supabase.from("follow_ups").insert({
        opportunity_id: opportunityId ?? null,
        quote_id: quoteId ?? null,
        client_id: clientId ?? null,
        data: new Date().toISOString(),
        tipo,
        responsavel,
        observacao,
        proximo_followup: proximo ? new Date(proximo).toISOString() : null,
        status,
      } as never);
      if (error) throw error;
      await logActivity({
        opportunity_id: opportunityId,
        quote_id: quoteId,
        client_id: clientId,
        tipo: "followup",
        descricao: `Follow-up por ${contactTypeLabel(tipo)}: ${observacao || "sem observação"}`,
        usuario: responsavel,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Follow-up registrado.");
      setObservacao("");
      setProximo("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar follow-up</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!observacao.trim()) return toast.error("Descreva o contato realizado.");
            save.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo de contato</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: Cliente informou que irá analisar a proposta."
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Próximo follow-up</Label>
            <Input
              type="datetime-local"
              value={proximo}
              onChange={(e) => setProximo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Salvar follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
