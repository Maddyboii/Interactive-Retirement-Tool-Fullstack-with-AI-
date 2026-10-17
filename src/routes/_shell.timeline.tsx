import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Disclaimer, PageHeader, Panel } from "@/components/rw/common";
import { CorpusGrowthChart } from "@/components/rw/charts";
import { usePlan } from "@/lib/plan-store";
import { formatCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline – RetireWise" },
      { name: "description", content: "Year-by-year projection of your savings before and after retirement." },
      { property: "og:title", content: "Timeline – RetireWise" },
      { property: "og:description", content: "Year-by-year projection of your savings before and after retirement." },
    ],
  }),
  component: Timeline,
});

function Timeline() {
  const { inputs, result: r, currency } = usePlan();
  const cmp = (n: number) => formatCompact(n, currency);
  const [preOpen, setPreOpen] = useState(true);
  const [postOpen, setPostOpen] = useState(true);

  return (
    <div className="space-y-6">
      <PageHeader title="Retirement timeline" description={`Every year of your plan, from today to age ${inputs.lifeExpectancy}. All amounts are in future (nominal) money.`} />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Today", age: inputs.currentAge, value: cmp(inputs.existingSavings), note: "Current savings" },
          { label: "Retirement", age: inputs.retirementAge, value: cmp(r.projectedCorpus), note: "Projected corpus" },
          r.depletionAge
            ? { label: "Savings may run out", age: r.depletionAge, value: `${inputs.lifeExpectancy - r.depletionAge} yrs short`, note: "Before life expectancy", danger: true }
            : { label: "Life expectancy", age: inputs.lifeExpectancy, value: cmp(r.postRows.at(-1)?.endBalance ?? 0), note: "Remaining balance" },
        ].map((m) => (
          <div key={m.label} className={cn("rounded-2xl border bg-card p-5 shadow-card", "danger" in m && m.danger && "border-destructive/50")}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{m.label}</p>
            <p className="mt-1 font-display text-lg font-semibold">Age {m.age}</p>
            <p className={cn("mt-2 text-xl font-semibold tabular", "danger" in m && m.danger && "text-destructive")}>{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.note}</p>
          </div>
        ))}
      </div>

      <Panel title="Portfolio over time">
        <CorpusGrowthChart result={r} currency={currency} height={320} />
      </Panel>

      {r.depletionAge && (
        <p role="alert" className="flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          Your savings may become insufficient at age {r.depletionAge}. From then on, your pension would cover only part of your expenses. Highlighted rows show the shortfall.
        </p>
      )}

      <Collapsible open={preOpen} onOpenChange={setPreOpen}>
        <Panel
          title={`Before retirement · ${r.preRows.length} years`}
          description="Annual contributions and projected growth"
          action={
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={preOpen ? "Collapse" : "Expand"}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", preOpen && "rotate-180")} /> {preOpen ? "Collapse" : "Expand"}
              </Button>
            </CollapsibleTrigger>
          }
        >
          <CollapsibleContent>
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Start balance</TableHead>
                    <TableHead className="text-right">Contributions</TableHead>
                    <TableHead className="text-right">Growth</TableHead>
                    <TableHead className="text-right">End balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular">
                  {r.preRows.map((p) => (
                    <TableRow key={p.age}>
                      <TableCell>{p.age}</TableCell>
                      <TableCell className="text-right">{cmp(p.startBalance)}</TableCell>
                      <TableCell className="text-right">{cmp(p.contributions)}</TableCell>
                      <TableCell className="text-right text-success">{cmp(p.growth)}</TableCell>
                      <TableCell className="text-right font-medium">{cmp(p.endBalance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Panel>
      </Collapsible>

      <Collapsible open={postOpen} onOpenChange={setPostOpen}>
        <Panel
          title={`After retirement · ${r.postRows.length} years`}
          description="Withdrawals at the start of each year, then growth on the remainder"
          action={
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={postOpen ? "Collapse" : "Expand"}>
                <ChevronDown className={cn("h-4 w-4 transition-transform", postOpen && "rotate-180")} /> {postOpen ? "Collapse" : "Expand"}
              </Button>
            </CollapsibleTrigger>
          }
        >
          <CollapsibleContent>
            <div className="max-h-[480px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Age</TableHead>
                    <TableHead className="text-right">Start balance</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Pension</TableHead>
                    <TableHead className="text-right">Withdrawal</TableHead>
                    <TableHead className="text-right">Growth</TableHead>
                    <TableHead className="text-right">End balance</TableHead>
                    <TableHead className="text-right">Shortfall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular">
                  {r.postRows.map((p) => (
                    <TableRow key={p.age} className={cn(p.depleted && "bg-destructive/8", p.age === r.depletionAge && "border-l-4 border-l-destructive")}>
                      <TableCell>{p.age}</TableCell>
                      <TableCell className="text-right">{cmp(p.startBalance)}</TableCell>
                      <TableCell className="text-right">{cmp(p.expenses)}</TableCell>
                      <TableCell className="text-right">{cmp(p.pension)}</TableCell>
                      <TableCell className="text-right">{cmp(p.withdrawal)}</TableCell>
                      <TableCell className="text-right text-success">{cmp(p.growth)}</TableCell>
                      <TableCell className="text-right font-medium">{cmp(p.endBalance)}</TableCell>
                      <TableCell className={cn("text-right", p.shortfall > 0 && "font-semibold text-destructive")}>{p.shortfall > 0 ? cmp(p.shortfall) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CollapsibleContent>
        </Panel>
      </Collapsible>
      <Disclaimer />
    </div>
  );
}
