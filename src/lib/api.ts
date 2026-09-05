import { supabase } from "@/integrations/supabase/client";

export type Client = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  client_id: string;
  nome: string;
  cargo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  observacoes: string | null;
};

export type Opportunity = {
  id: string;
  numero: string | null;
  client_id: string;
  contact_id: string | null;
  responsavel: string | null;
  titulo: string;
  descricao: string | null;
  produto_servico: string | null;
  valor_estimado: number;
  probabilidade: number;
  prazo_desejado: string | null;
  origem: string | null;
  status: string;
  motivo_perda: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  numero: string | null;
  client_id: string;
  contact_id: string | null;
  opportunity_id: string | null;
  responsavel: string | null;
  data: string;
  validade: string | null;
  prazo_entrega: string | null;
  condicoes_pagamento: string | null;
  observacoes: string | null;
  status: string;
  versao: number;
  subtotal: number;
  desconto: number;
  total: number;
  created_at: string;
  updated_at: string;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  codigo: string | null;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  total: number;
  ordem: number;
};

export type FollowUp = {
  id: string;
  opportunity_id: string | null;
  quote_id: string | null;
  client_id: string | null;
  data: string;
  tipo: string;
  responsavel: string | null;
  observacao: string | null;
  proximo_followup: string | null;
  status: string;
};

export async function logActivity(input: {
  opportunity_id?: string | null;
  quote_id?: string | null;
  client_id?: string | null;
  tipo?: string;
  descricao: string;
  usuario?: string | null;
}) {
  await supabase.from("activities").insert({
    opportunity_id: input.opportunity_id ?? null,
    quote_id: input.quote_id ?? null,
    client_id: input.client_id ?? null,
    tipo: input.tipo ?? "evento",
    descricao: input.descricao,
    usuario: input.usuario ?? null,
  });
}

export async function fetchClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("razao_social");
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function fetchContacts(clientId?: string) {
  let q = supabase.from("contacts").select("*").order("nome");
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function fetchSettings() {
  const { data, error } = await supabase.from("settings").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export function recalcItem(item: {
  quantidade: number;
  valor_unitario: number;
  desconto: number;
}) {
  const bruto = Number(item.quantidade || 0) * Number(item.valor_unitario || 0);
  return Math.max(0, Number((bruto - Number(item.desconto || 0)).toFixed(2)));
}
