import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Info, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Disclaimer, PageHeader, Panel, statusText } from "@/components/rw/common";
import { usePlan } from "@/lib/plan-store";
import { buildRecommendations } from "@/lib/recommendations";
import { readinessStatus } from "@/lib/retirement";
import { formatCompact, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/recommendations")({
  head: () => ({
    meta: [
      { title: "Recommendations – RetireWise" },
      { name: "description", content: "Personalised, calculated suggestions to close your retirement savings gap." },
      { property: "og:title", content: "Recommendations – RetireWise" },
      { property: "og:description", content: "Personalised, calculated suggestions to close your retirement savings gap." },
    ],
  }),
  component: Recommendations,
});

function Recommendations() {
  const { inputs, result: r, questionnaire, currency, setInputs } = usePlan();
  const fmt = (n: number) => formatMoney(n, currency);
  const cmp = (n: number) => formatCompact(n, currency);
  const recs = buildRecommendations(inputs, r, questionnaire, fmt);
  const actions = recs.filter((x) => x.after);

  return (
    <div className="space-y-6">
      <PageHeader title="Smart recommendations" description="Calculated from your current plan. Apply any suggestion to update your plan instantly — you can always change it back." />
      <div className="grid gap-4 md:grid-cols-2">
        {recs.map((rec) => (
          <Panel key={rec.id} className="flex flex-col">
            <div className="flex gap-3">
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", rec.kind === "action" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground")}>
                {rec.kind === "action" ? <Lightbulb className="h-4.5 w-4.5" /> : <Info className="h-4.5 w-4.5" />}
              </span>
              <div className="flex-1">
                <h3 className="font-semibold">{rec.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{rec.description}</p>
              </div>
            </div>
            {rec.after && rec.patch && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <p className="flex items-center gap-2 text-sm">
                  <span className={statusText[readinessStatus(r.readiness)]}>{Math.round(r.readiness)}%</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className={cn("font-semibold", statusText[readinessStatus(rec.after.readiness)])}>{Math.round(rec.after.readiness)}% ready</span>
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setInputs(rec.patch!);
                    toast.success("Plan updated", { description: rec.title });
                  }}
                >
                  Apply
                </Button>
              </div>
            )}
          </Panel>
        ))}
      </div>

      <Panel title="Impact comparison" description="How each adjustment changes your outcome versus your current plan">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adjustment</TableHead>
                <TableHead className="text-right">Projected</TableHead>
                <TableHead className="text-right">Required</TableHead>
                <TableHead className="text-right">Gap / surplus</TableHead>
                <TableHead className="text-right">Readiness</TableHead>
                <TableHead className="text-right">Lasts to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular">
              <TableRow className="bg-muted/50">
                <TableCell className="font-medium">Current plan</TableCell>
                <TableCell className="text-right">{cmp(r.projectedCorpus)}</TableCell>
                <TableCell className="text-right">{cmp(r.requiredCorpus)}</TableCell>
                <TableCell className={cn("text-right", r.gap >= 0 ? "text-success" : "text-destructive")}>{cmp(r.gap)}</TableCell>
                <TableCell className={cn("text-right", statusText[readinessStatus(r.readiness)])}>{Math.round(r.readiness)}%</TableCell>
                <TableCell className="text-right">{r.depletionAge ?? `${inputs.lifeExpectancy}+`}</TableCell>
              </TableRow>
              {actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[260px] font-medium">{a.title}</TableCell>
                  <TableCell className="text-right">{cmp(a.after!.projectedCorpus)}</TableCell>
                  <TableCell className="text-right">{cmp(a.after!.requiredCorpus)}</TableCell>
                  <TableCell className={cn("text-right", a.after!.gap >= 0 ? "text-success" : "text-destructive")}>{cmp(a.after!.gap)}</TableCell>
                  <TableCell className={cn("text-right", statusText[readinessStatus(a.after!.readiness)])}>{Math.round(a.after!.readiness)}%</TableCell>
                  <TableCell className="text-right">{a.after!.depletionAge ?? `${(a.patch?.lifeExpectancy ?? inputs.lifeExpectancy)}+`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
      <p className="text-xs text-muted-foreground">RetireWise does not recommend specific investment products. Suggestions are mathematical illustrations based on your inputs.</p>
      <Disclaimer />
    </div>
  );
}
