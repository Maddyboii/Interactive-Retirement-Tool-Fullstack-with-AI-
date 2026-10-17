import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer, NumberField, PageHeader, Panel, statusText } from "@/components/rw/common";
import { QuestionnaireForm } from "@/components/rw/questionnaire";
import { usePlan } from "@/lib/plan-store";
import { CURRENCIES, formatCompact, formatMoney } from "@/lib/format";
import { readinessStatus, realReturn, type Allocation } from "@/lib/retirement";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/planner")({
  head: () => ({
    meta: [
      { title: "My Inputs – RetireWise" },
      { name: "description", content: "Enter your age, income, savings and assumptions to build your retirement plan." },
      { property: "og:title", content: "My Inputs – RetireWise" },
      { property: "og:description", content: "Enter your age, income, savings and assumptions to build your retirement plan." },
    ],
  }),
  component: Planner,
});

function Planner() {
  const { inputs, setInputs, errors, result: r, currency, resetSample, setOnboarded } = usePlan();
  const sym = CURRENCIES[currency].symbol;
  const cmp = (n: number) => formatCompact(n, currency);
  const status = readinessStatus(r.readiness);
  const setAlloc = (k: keyof Allocation, v: number) => setInputs({ allocation: { ...inputs.allocation, [k]: v } });
  const allocTotal = inputs.allocation.equity + inputs.allocation.debt + inputs.allocation.gold + inputs.allocation.cash;

  return (
    <div>
      <PageHeader
        title="Your financial inputs"
        description="Enter amounts in today's money. Results recalculate instantly."
        actions={
          <>
            <Button variant="outline" onClick={() => setOnboarded(false)}>
              <Wand2 className="h-4 w-4" /> Guided setup
            </Button>
            <Button variant="outline" onClick={resetSample}>
              <RotateCcw className="h-4 w-4" /> Reset to sample
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <Panel title="About you">
            <div className="grid gap-6 md:grid-cols-3">
              <NumberField id="age" label="Current age" value={inputs.currentAge} min={18} max={90} onChange={(v) => setInputs({ currentAge: v })} error={errors.currentAge} />
              <NumberField id="ret" label="Retirement age" value={inputs.retirementAge} min={30} max={90} onChange={(v) => setInputs({ retirementAge: v })} error={errors.retirementAge} />
              <NumberField id="life" label="Life expectancy" value={inputs.lifeExpectancy} min={40} max={110} onChange={(v) => setInputs({ lifeExpectancy: v })} error={errors.lifeExpectancy} help="Your plan funds expenses up to this age. Planning to 85–95 reduces the risk of outliving savings." />
            </div>
          </Panel>

          <Panel title="Income & savings">
            <div className="grid gap-6 md:grid-cols-2">
              <NumberField id="inc" label="Monthly income" prefix={sym} value={inputs.monthlyIncome} min={0} max={2000000} step={1000} onChange={(v) => setInputs({ monthlyIncome: v })} error={errors.monthlyIncome} help="Take-home monthly income." />
              <NumberField id="exp" label="Monthly expenses" prefix={sym} value={inputs.monthlyExpenses} min={0} max={2000000} step={1000} onChange={(v) => setInputs({ monthlyExpenses: v })} error={errors.monthlyExpenses} help="Used for the emergency-fund indicator and savings-rate checks." />
              <NumberField id="sav" label="Existing retirement savings" prefix={sym} value={inputs.existingSavings} min={0} max={50000000} step={10000} onChange={(v) => setInputs({ existingSavings: v })} error={errors.existingSavings} help="Current value of investments earmarked for retirement (EPF, PPF, NPS, mutual funds, etc.)." />
              <NumberField id="con" label="Monthly retirement contribution" prefix={sym} value={inputs.monthlyContribution} min={0} max={500000} step={500} onChange={(v) => setInputs({ monthlyContribution: v })} error={errors.monthlyContribution} help="Invested at the end of each month." />
              <NumberField id="sg" label="Annual salary growth" suffix="%" value={inputs.salaryGrowth} min={0} max={20} step={0.5} onChange={(v) => setInputs({ salaryGrowth: v })} error={errors.salaryGrowth} help="Your monthly contribution steps up by this rate once a year, in line with income." />
              <NumberField id="em" label="Emergency fund" prefix={sym} value={inputs.emergencyFund} min={0} max={10000000} step={10000} onChange={(v) => setInputs({ emergencyFund: v })} error={errors.emergencyFund} help="Liquid savings set aside for emergencies — not counted in your retirement corpus." />
            </div>
          </Panel>

          <Panel title="Growth & inflation assumptions" description={`Real return before retirement: ${realReturn(inputs.preReturn, inputs.inflation).toFixed(2)}% · after: ${realReturn(inputs.postReturn, inputs.inflation).toFixed(2)}%`}>
            <div className="grid gap-6 md:grid-cols-3">
              <NumberField id="pre" label="Return before retirement" suffix="%" value={inputs.preReturn} min={0} max={20} step={0.1} onChange={(v) => setInputs({ preReturn: v })} error={errors.preReturn} help="Expected nominal annual return, compounded monthly." />
              <NumberField id="post" label="Return after retirement" suffix="%" value={inputs.postReturn} min={0} max={15} step={0.1} onChange={(v) => setInputs({ postReturn: v })} error={errors.postReturn} help="Usually lower, as portfolios shift to safer assets." />
              <NumberField id="inf" label="Inflation" suffix="%" value={inputs.inflation} min={0} max={15} step={0.1} onChange={(v) => setInputs({ inflation: v })} error={errors.inflation} help="Applied annually to expenses and pension." />
            </div>
          </Panel>

          <Panel title="Retirement needs">
            <div className="grid gap-6 md:grid-cols-2">
              <NumberField id="des" label="Desired monthly expenses in retirement" prefix={sym} value={inputs.desiredMonthlyExpense} min={0} max={1000000} step={1000} onChange={(v) => setInputs({ desiredMonthlyExpense: v })} error={errors.desiredMonthlyExpense} help="In today's money. Many people need 60–80% of current expenses." />
              <NumberField id="pen" label="Pension / other retirement income (monthly)" prefix={sym} value={inputs.monthlyPension} min={0} max={500000} step={500} onChange={(v) => setInputs({ monthlyPension: v })} error={errors.monthlyPension} help="In today's money; assumed to rise with inflation. Includes pension, annuity or rental income." />
            </div>
          </Panel>

          <Panel title="Current investment allocation" description="Used to personalise recommendations. It does not change your return assumptions automatically.">
            <div className="grid gap-6 md:grid-cols-2">
              {(["equity", "debt", "gold", "cash"] as const).map((k) => (
                <NumberField key={k} id={`al-${k}`} label={k[0]!.toUpperCase() + k.slice(1)} suffix="%" value={inputs.allocation[k]} min={0} max={100} onChange={(v) => setAlloc(k, v)} />
              ))}
            </div>
            <p className={cn("mt-4 text-sm font-medium", Math.abs(allocTotal - 100) < 0.5 ? "text-success" : "text-destructive")} role={errors.allocation ? "alert" : undefined}>
              Total: {allocTotal}% {errors.allocation && `— ${errors.allocation}`}
            </p>
          </Panel>

          <Panel title="Personalisation questionnaire" description="Optional — tailors your recommendations to your goals and risk tolerance.">
            <QuestionnaireForm />
          </Panel>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Panel title="Live results">
            <dl className="space-y-3 text-sm">
              {[
                ["Years to retirement", `${r.yearsToRetirement}`],
                ["FV of existing savings", cmp(r.fvExistingSavings)],
                ["FV of contributions", cmp(r.fvContributions)],
                ["Projected corpus", cmp(r.projectedCorpus)],
                ["Monthly expense at retirement", formatMoney(r.monthlyExpenseAtRetirement, currency)],
                ["Annual expense at retirement", cmp(r.annualExpenseAtRetirement)],
                ["Pension at retirement (yr)", cmp(r.annualPensionAtRetirement)],
                ["Required corpus", cmp(r.requiredCorpus)],
                ["Monthly savings needed", Number.isFinite(r.requiredMonthlySavings) ? formatMoney(r.requiredMonthlySavings, currency) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium tabular">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t pt-3">
                <dt className="font-medium">{r.gap >= 0 ? "Surplus" : "Shortfall"}</dt>
                <dd className={cn("font-semibold tabular", r.gap >= 0 ? "text-success" : "text-destructive")}>{cmp(Math.abs(r.gap))}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="font-medium">Readiness</dt>
                <dd className={cn("font-semibold tabular", statusText[status])}>{Math.round(r.readiness)}%</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="font-medium">Savings last until</dt>
                <dd className="font-semibold">{r.depletionAge ? `age ${r.depletionAge}` : `${inputs.lifeExpectancy}+`}</dd>
              </div>
            </dl>
          </Panel>
          <Disclaimer className="mt-4" />
        </aside>
      </div>
    </div>
  );
}
