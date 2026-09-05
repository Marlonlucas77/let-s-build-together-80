import {
  TONE_CLASSES,
  oppStatusLabel,
  oppTone,
  quoteStatusLabel,
  quoteTone,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  kind = "opp",
  className,
}: {
  status: string;
  kind?: "opp" | "quote";
  className?: string;
}) {
  const tone = kind === "opp" ? oppTone(status) : quoteTone(status);
  const label = kind === "opp" ? oppStatusLabel(status) : quoteStatusLabel(status);
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
