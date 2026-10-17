import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Disclaimer, NumberField, PageHeader, Panel, statusText } from "@/components/rw/common";
import { ScenarioChart } from "@/components/rw/charts";
import { usePlan } from "@/lib/plan-store";
import { calculatePlan, readinessStatus, type ScenarioKey } from "@/lib/retirement";
import { formatCompact, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios – RetireWise" },
      { name: "description", content: "Compare conservative, moderate and aggressive retirement assumptions side by side." },
      { property: "og:title", content: "Scenarios – RetireWise" },
      { property: "og:description", content: "Compare conservative, moderate and aggressive retirement assumptions side by side." },
    ],
  }),
  component: Scenarios,
});

const META: Record<ScenarioKey, { label: string; desc: string }> = {
  conservative: { label: "Conservative", desc: "Lower returns, higher inflation — a cautious baseline." },
  moderate: { label: "Moderate", desc: "Balanced, long-run average assumptions." },
  aggressive: { label: "Aggressive", desc: "Higher expected returns with much greater uncertainty and volatility." },
};

function Scenarios() {
  const { inputs, scenarios, setScenario, resetScenarios, currency, setInputs } = usePlan();
  const keys = Object.keys(META) as ScenarioKey[];
  const results = keys.map((k) => ({ k, r: calculatePlan({ ...inputs, ...scenarios[k] }) }));
  const cmp = (n: number) => formatCompact(n, currency);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scenario comparison"
        description="Same personal inputs, different market assumptions. Edit any scenario to see how sensitive your plan is."
        actions={
          <Button variant="outline" onClick={resetScenarios}>
            <RotateCcw className="h-4 w-4" /> Reset scenarios
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {results.map(({ k, r }) => {
          const st = readinessStatus(r.readiness);
          return (
            <Panel key={k} title={META[k].label} description={META[k].desc}>
              <div className="space-y-5">
                <NumberField id={`${k}-pre`} label="Return before" suffix="%" value={scenarios[k].preReturn} min={0} max={20} step={0.5} onChange={(v) => setScenario(k, { preReturn: v })} />
                <NumberField id={`${k}-post`} label="Return after" suffix="%" value={scenarios[k].postReturn} min={0} max={15} step={0.5} onChange={(v) => setScenario(k, { postReturn: v })} />
                <NumberField id={`${k}-inf`} label="Inflation" suffix="%" value={scenarios[k].inflation} min={0} max={15} step={0.25} onChange={(v) => setScenario(k, { inflation: v })} />
              </div>
              <div className="mt-5 flex items-end justify-between border-t pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Readiness</p>
                  <p className={cn("font-display text-2xl font-semibold tabular", statusText[st])}>{Math.round(r.readiness)}%</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setInputs(scenarios[k]);
                    toast.success(`${META[k].label} assumptions applied to your plan`);
                  }}
                >
                  Use in my plan
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title="Side-by-side comparison">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                {keys.map((k) => (
                  <TableHead key={k} className="text-right">
                    {META[k].label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="tabular">
              {[
                ["Projected corpus", (r: ReturnType<typeof calculatePlan>) => cmp(r.projectedCorpus)],
                ["Required corpus", (r: ReturnType<typeof calculatePlan>) => cmp(r.requiredCorpus)],
                ["Surplus / gap", (r: ReturnType<typeof calculatePlan>) => <span className={r.gap >= 0 ? "text-success" : "text-destructive"}>{(r.gap >= 0 ? "+" : "−") + cmp(Math.abs(r.gap))}</span>],
                ["Readiness", (r: ReturnType<typeof calculatePlan>) => <span className={statusText[readinessStatus(r.readiness)]}>{Math.round(r.readiness)}%</span>],
                ["Monthly savings needed", (r: ReturnType<typeof calculatePlan>) => (Number.isFinite(r.requiredMonthlySavings) ? formatMoney(r.requiredMonthlySavings, currency) : "—")],
                ["Savings last until", (r: ReturnType<typeof calculatePlan>) => (r.depletionAge ? `Age ${r.depletionAge}` : `${inputs.lifeExpectancy}+`)],
              ].map(([label, f]) => (
                <TableRow key={label as string}>
                  <TableCell className="font-medium">{label as string}</TableCell>
                  {results.map(({ k, r }) => (
                    <TableCell key={k} className="text-right">
                      {(f as (r: ReturnType<typeof calculatePlan>) => React.ReactNode)(r)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>

      <Panel title="Projected vs. required by scenario">
        <ScenarioChart rows={results.map(({ k, r }) => ({ name: META[k].label, projected: r.projectedCorpus, required: r.requiredCorpus }))} currency={currency} />
      </Panel>
      <p className="rounded-xl bg-accent p-4 text-sm text-accent-foreground">
        These are hypothetical projections, not guaranteed returns. Higher return assumptions come with higher risk of losses — including just before or after you retire — and are not automatically better. A plan that works under conservative assumptions is more robust.
      </p>
      <Disclaimer />
    </div>
  );
}
