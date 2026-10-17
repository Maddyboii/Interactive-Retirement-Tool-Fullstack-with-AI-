import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, PiggyBank, RotateCcw, ShieldCheck, Target, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Disclaimer, NumberField, PageHeader, Panel, statusBg, statusText } from "@/components/rw/common";
import { CorpusGrowthChart, IncomeVsExpensesChart, InflationImpactChart, RequiredVsProjectedChart, SavingsBreakdownChart } from "@/components/rw/charts";
import { usePlan } from "@/lib/plan-store";
import { calculatePlan, emergencyMonths, readinessStatus, type PlanInputs } from "@/lib/retirement";
import { CURRENCIES, formatCompact, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard – RetireWise" },
      { name: "description", content: "Your retirement corpus, savings gap and readiness at a glance." },
      { property: "og:title", content: "Dashboard – RetireWise" },
      { property: "og:description", content: "Your retirement corpus, savings gap and readiness at a glance." },
    ],
  }),
  component: Dashboard,
});

function StatCard({ label, value, sub, icon: Icon, tone, delay }: { label: string; value: string; sub?: string; icon: typeof Wallet; tone?: "healthy" | "warning" | "shortfall" | undefined; delay: number }) {
  return (
    <div className="animate-rise rounded-2xl border bg-card p-5 shadow-card transition-all hover:-translate-y-0.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", tone ? statusBg[tone] : "bg-accent text-accent-foreground")}>
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className={cn("mt-3 font-display text-2xl font-semibold tabular", tone && statusText[tone])}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ReadinessRing({ value }: { value: number }) {
  const status = readinessStatus(value);
  const pct = Math.min(value, 100);
  const r = 62;
  const c = 2 * Math.PI * r;
  const color = { healthy: "var(--success)", warning: "var(--warning)", shortfall: "var(--destructive)" }[status];
  return (
    <div className="relative grid place-items-center" role="img" aria-label={`Retirement readiness ${Math.round(value)} percent`}>
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
        <circle cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute text-center">
        <p className={cn("font-display text-3xl font-semibold tabular", statusText[status])}>{Math.round(Math.min(value, 999))}%</p>
        <p className="text-xs text-muted-foreground">ready</p>
      </div>
    </div>
  );
}

function Dashboard() {
  const { inputs, result: r, currency, resetSample, valid } = usePlan();
  const fmt = (n: number) => formatMoney(n, currency);
  const cmp = (n: number) => formatCompact(n, currency);
  const status = readinessStatus(r.readiness);
  const gapTone = r.gap >= 0 ? "healthy" : status;

  const summary =
    status === "healthy"
      ? `You're on track. Your projected corpus of ${cmp(r.projectedCorpus)} covers the ${cmp(r.requiredCorpus)} you need, leaving a surplus of ${cmp(r.gap)}. Your savings are projected to last beyond age ${inputs.lifeExpectancy}.`
      : status === "warning"
        ? `You're close. Increasing your monthly contribution by about ${fmt(r.additionalMonthlySavings)} would close the ${cmp(-r.gap)} gap. ${r.depletionAge ? `Otherwise savings may run out around age ${r.depletionAge}.` : ""}`
        : `Your plan has a significant shortfall of ${cmp(-r.gap)}. ${r.depletionAge ? `Savings may run out around age ${r.depletionAge}, ${inputs.lifeExpectancy - r.depletionAge} years before your planning horizon.` : ""} Consider saving ${fmt(r.additionalMonthlySavings)} more per month, retiring later, or adjusting your retirement lifestyle.`;

  const emMonths = emergencyMonths(inputs.emergencyFund, inputs.monthlyExpenses);
  const emTone = emMonths >= 6 ? "healthy" : emMonths >= 3 ? "warning" : "shortfall";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your retirement dashboard"
        description="All figures update instantly as you change your inputs. Amounts at retirement are in future (inflated) money."
        actions={
          <>
            <Button variant="outline" onClick={resetSample}>
              <RotateCcw className="h-4 w-4" /> Reset to sample
            </Button>
            <Button asChild>
              <Link to="/planner">Edit inputs</Link>
            </Button>
          </>
        }
      />
      {!valid && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> Some inputs are invalid. Showing results for your last valid values. <Link to="/planner" className="font-semibold underline">Fix inputs</Link>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard delay={0} label="Projected Retirement Corpus" value={cmp(r.projectedCorpus)} sub={`At age ${inputs.retirementAge}`} icon={TrendingUp} tone={status === "healthy" ? "healthy" : undefined} />
        <StatCard delay={50} label="Required Retirement Corpus" value={cmp(r.requiredCorpus)} sub={`To fund ages ${inputs.retirementAge}–${inputs.lifeExpectancy}`} icon={Target} />
        <StatCard delay={100} label="Monthly Savings Needed" value={Number.isFinite(r.requiredMonthlySavings) ? fmt(r.requiredMonthlySavings) : "—"} sub={r.additionalMonthlySavings > 0 ? `${fmt(r.additionalMonthlySavings)} more than today` : "You're already saving enough"} icon={PiggyBank} tone={r.additionalMonthlySavings > 0 ? status : "healthy"} />
        <StatCard delay={150} label="Retirement Readiness" value={`${Math.round(Math.min(r.readiness, 999))}%`} sub={status === "healthy" ? "On track" : status === "warning" ? "Needs attention" : "Funding shortfall"} icon={ShieldCheck} tone={status} />
        <StatCard delay={200} label={r.gap >= 0 ? "Projected Surplus" : "Savings Gap"} value={cmp(Math.abs(r.gap))} sub={r.gap >= 0 ? "Above your target" : "Below your target"} icon={Wallet} tone={gapTone} />
        <StatCard delay={250} label="Years Until Retirement" value={`${r.yearsToRetirement} years`} sub={`${r.retirementYears} years in retirement`} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Retirement readiness" className="lg:col-span-1">
          <div className="flex flex-col items-center gap-4">
            <ReadinessRing value={r.readiness} />
            <div className={cn("flex w-full gap-2 rounded-xl p-3 text-sm", statusBg[status])}>
              {status === "healthy" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
              <p className="text-foreground">{summary}</p>
            </div>
          </div>
        </Panel>
        <Panel title="Retirement corpus growth" description="Projected portfolio balance by age, through accumulation and retirement" className="lg:col-span-2">
          <CorpusGrowthChart result={r} currency={currency} />
        </Panel>
      </div>

      <WhatIf />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Required vs. projected corpus" description="At your retirement age, in future money">
          <RequiredVsProjectedChart result={r} currency={currency} />
        </Panel>
        <Panel title="Savings breakdown" description="Where your projected corpus comes from">
          <SavingsBreakdownChart inputs={inputs} result={r} currency={currency} />
        </Panel>
        <Panel title="Retirement income vs. expenses" description="Annual pension + withdrawals against inflation-adjusted expenses">
          <IncomeVsExpensesChart result={r} currency={currency} />
        </Panel>
        <Panel title="Inflation impact" description={`What ${fmt(inputs.desiredMonthlyExpense)}/month today costs in the future at ${inputs.inflation}% inflation`}>
          <InflationImpactChart inputs={inputs} currency={currency} />
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Retirement goal">
          <p className="text-sm text-muted-foreground">Live on</p>
          <p className="font-display text-xl font-semibold">{fmt(inputs.desiredMonthlyExpense)}/month</p>
          <p className="mt-1 text-xs text-muted-foreground">in today's money, from age {inputs.retirementAge}. That's {fmt(r.monthlyExpenseAtRetirement)}/month in {r.yearsToRetirement} years.</p>
        </Panel>
        <Panel title="Emergency savings">
          <p className={cn("font-display text-xl font-semibold", statusText[emTone])}>{Number.isFinite(emMonths) ? `${emMonths.toFixed(1)} months` : "Fully covered"}</p>
          <p className="mt-1 text-xs text-muted-foreground">of expenses covered by {fmt(inputs.emergencyFund)}. Aim for 6 months before investing aggressively.</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", emTone === "healthy" ? "bg-success" : emTone === "warning" ? "bg-warning" : "bg-destructive")} style={{ width: `${Math.min(100, (emMonths / 6) * 100)}%` }} />
          </div>
        </Panel>
        <Panel title="Savings rate">
          <p className="font-display text-xl font-semibold">{inputs.monthlyIncome > 0 ? ((inputs.monthlyContribution / inputs.monthlyIncome) * 100).toFixed(1) : "0"}%</p>
          <p className="mt-1 text-xs text-muted-foreground">of your monthly income goes to retirement. Spare cash after expenses: {fmt(Math.max(0, inputs.monthlyIncome - inputs.monthlyExpenses - inputs.monthlyContribution))}.</p>
        </Panel>
      </div>
      <Disclaimer />
    </div>
  );
}

function WhatIf() {
  const { inputs, result: base, currency, replaceInputs } = usePlan();
  const [w, setW] = useState<Pick<PlanInputs, "monthlyContribution" | "retirementAge" | "preReturn" | "desiredMonthlyExpense"> | null>(null);
  const cur = w ?? { monthlyContribution: inputs.monthlyContribution, retirementAge: inputs.retirementAge, preReturn: inputs.preReturn, desiredMonthlyExpense: inputs.desiredMonthlyExpense };
  const trial = { ...inputs, ...cur };
  const ok = trial.retirementAge > trial.currentAge && trial.lifeExpectancy > trial.retirementAge;
  const res = useMemo(() => (ok ? calculatePlan(trial) : null), [JSON.stringify(trial)]); // eslint-disable-line react-hooks/exhaustive-deps
  const sym = CURRENCIES[currency].symbol;
  const cmp = (n: number) => formatCompact(n, currency);
  const delta = res ? res.readiness - base.readiness : 0;

  return (
    <Panel
      title="What if?"
      description="Experiment without changing your saved inputs"
      action={
        w && (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setW(null)}>
              Reset
            </Button>
            <Button
              size="sm"
              disabled={!ok}
              onClick={() => {
                replaceInputs(trial);
                setW(null);
              }}
            >
              Apply to plan
            </Button>
          </div>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField id="wi-c" label="Monthly contribution" prefix={sym} value={cur.monthlyContribution} min={0} max={Math.max(200000, inputs.monthlyContribution * 3)} step={500} onChange={(v) => setW({ ...cur, monthlyContribution: v })} />
          <NumberField id="wi-a" label="Retirement age" value={cur.retirementAge} min={inputs.currentAge + 1} max={Math.min(80, inputs.lifeExpectancy - 1)} onChange={(v) => setW({ ...cur, retirementAge: v })} error={ok ? undefined : "Must be between current age and life expectancy"} />
          <NumberField id="wi-r" label="Return before retirement" suffix="%" value={cur.preReturn} min={0} max={18} step={0.5} onChange={(v) => setW({ ...cur, preReturn: v })} />
          <NumberField id="wi-e" label="Retirement expenses (today)" prefix={sym} value={cur.desiredMonthlyExpense} min={0} max={Math.max(300000, inputs.desiredMonthlyExpense * 3)} step={1000} onChange={(v) => setW({ ...cur, desiredMonthlyExpense: v })} />
        </div>
        <div className="rounded-xl bg-muted/60 p-4">
          {res ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Readiness</dt>
                <dd className={cn("font-semibold tabular", statusText[readinessStatus(res.readiness)])}>
                  {Math.round(res.readiness)}%{" "}
                  {Math.abs(delta) >= 0.5 && <span className="text-xs text-muted-foreground">({delta > 0 ? "+" : ""}{Math.round(delta)})</span>}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Projected</dt>
                <dd className="font-semibold tabular">{cmp(res.projectedCorpus)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Required</dt>
                <dd className="font-semibold tabular">{cmp(res.requiredCorpus)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{res.gap >= 0 ? "Surplus" : "Gap"}</dt>
                <dd className={cn("font-semibold tabular", res.gap >= 0 ? "text-success" : "text-destructive")}>{cmp(Math.abs(res.gap))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Money lasts to</dt>
                <dd className="font-semibold">{res.depletionAge ? `age ${res.depletionAge}` : `${inputs.lifeExpectancy}+`}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-destructive">Adjust the retirement age to see results.</p>
          )}
        </div>
      </div>
    </Panel>
  );
}
