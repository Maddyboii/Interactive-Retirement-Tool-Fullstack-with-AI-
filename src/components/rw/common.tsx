import type { ReactNode } from "react";
import { Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Status } from "@/lib/retirement";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-rise">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className, action }: { title?: string; description?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <Card className={cn("rounded-2xl border p-5 shadow-card transition-shadow", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Card>
  );
}

export const statusText: Record<Status, string> = { healthy: "text-success", warning: "text-warning", shortfall: "text-destructive" };
export const statusBg: Record<Status, string> = { healthy: "bg-success/12 text-success", warning: "bg-warning/15 text-warning", shortfall: "bg-destructive/12 text-destructive" };

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex gap-2 rounded-xl border border-dashed bg-muted/50 p-3 text-xs text-muted-foreground", className)}>
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        Projections are estimates based on your assumptions, not guarantees. Actual investment returns, inflation, taxes and expenses may differ significantly. This tool is educational and is not financial advice — consider speaking with a registered adviser.
      </span>
    </p>
  );
}

export function HelpTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger type="button" aria-label="More info" className="text-muted-foreground hover:text-foreground">
        <Info className="h-3.5 w-3.5" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  help?: string | undefined;
  error?: string | undefined;
  slider?: boolean;
};

export function NumberField({ id, label, value, onChange, min, max, step = 1, suffix, prefix, help, error, slider = true }: FieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium">
          {label}
          {help && <HelpTip text={help} />}
        </Label>
        <div className="relative w-36">
          {prefix && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            value={Number.isFinite(value) ? value : ""}
            min={min}
            max={max}
            step={step}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
            className={cn("h-8 text-right tabular", prefix && "pl-6", suffix && "pr-8", error && "border-destructive focus-visible:ring-destructive")}
          />
          {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
        </div>
      </div>
      {slider && (
        <Slider
          aria-label={label}
          value={[Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v ?? min)}
        />
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
