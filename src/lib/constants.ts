export const OPP_STATUS = [
  { value: "nova_solicitacao", label: "Nova solicitação", tone: "slate" },
  { value: "em_analise", label: "Em análise", tone: "sky" },
  { value: "orcamento_elaboracao", label: "Orçamento em elaboração", tone: "amber" },
  { value: "proposta_enviada", label: "Proposta enviada", tone: "indigo" },
  { value: "negociacao", label: "Negociação", tone: "violet" },
  { value: "aprovada", label: "Aprovada", tone: "green" },
  { value: "perdida", label: "Perdida", tone: "red" },
  { value: "cancelada", label: "Cancelada", tone: "slate" },
] as const;

export type OppStatus = (typeof OPP_STATUS)[number]["value"];

export const QUOTE_STATUS = [
  { value: "em_elaboracao", label: "Em elaboração", tone: "amber" },
  { value: "enviado", label: "Enviado", tone: "indigo" },
  { value: "negociacao", label: "Negociação", tone: "violet" },
  { value: "aprovado", label: "Aprovado", tone: "green" },
  { value: "perdido", label: "Perdido", tone: "red" },
  { value: "cancelado", label: "Cancelado", tone: "slate" },
] as const;

export const CONTACT_TYPES = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "visita", label: "Visita" },
  { value: "outro", label: "Outro" },
] as const;

export const ORIGENS = [
  "Indicação",
  "Site",
  "Feira",
  "Prospecção ativa",
  "Cliente recorrente",
  "Outro",
];

export const LOSS_REASONS = [
  "Preço",
  "Prazo",
  "Concorrência",
  "Cliente desistiu",
  "Projeto cancelado",
  "Outro",
];

export const KANBAN_COLUMNS = [
  { status: "nova_solicitacao", label: "Novas" },
  { status: "em_analise", label: "Em análise" },
  { status: "orcamento_elaboracao", label: "Orçamento" },
  { status: "proposta_enviada", label: "Proposta enviada" },
  { status: "negociacao", label: "Negociação" },
  { status: "aprovada", label: "Aprovada" },
  { status: "perdida", label: "Perdida" },
] as const;

export function oppStatusLabel(value: string) {
  return OPP_STATUS.find((s) => s.value === value)?.label ?? value;
}
export function quoteStatusLabel(value: string) {
  return QUOTE_STATUS.find((s) => s.value === value)?.label ?? value;
}
export function contactTypeLabel(value: string) {
  return CONTACT_TYPES.find((s) => s.value === value)?.label ?? value;
}

export const TONE_CLASSES: Record<string, string> = {
  slate: "bg-muted text-muted-foreground border-border",
  sky: "bg-sky-100 text-sky-800 border-sky-200",
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200",
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  red: "bg-rose-100 text-rose-800 border-rose-200",
};

export function oppTone(value: string) {
  return OPP_STATUS.find((s) => s.value === value)?.tone ?? "slate";
}
export function quoteTone(value: string) {
  return QUOTE_STATUS.find((s) => s.value === value)?.tone ?? "slate";
}
