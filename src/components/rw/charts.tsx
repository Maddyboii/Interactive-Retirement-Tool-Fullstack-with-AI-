import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatMoney, type CurrencyCode } from "@/lib/format";
import type { PlanInputs, PlanResult } from "@/lib/retirement";

const C = { 1: "var(--chart-1)", 2: "var(--chart-2)", 3: "var(--chart-3)", 4: "var(--chart-4)", 5: "var(--chart-5)" };
const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false };
const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--popover-foreground)", fontSize: 12 },
  labelStyle: { color: "var(--muted-foreground)" },
};

export function CorpusGrowthChart({ result, currency, height = 300 }: { result: PlanResult; currency: CurrencyCode; height?: number }) {
  const data = [
    ...result.preRows.map((r) => ({ age: r.age + 1, balance: r.endBalance, contributed: r.cumulativeContributions })),
    ...result.postRows.map((r) => ({ age: r.age + 1, balance: Math.max(0, r.endBalance), contributed: null })),
  ];
  const retireAge = result.preRows.at(-1) ? result.preRows.at(-1)!.age + 1 : undefined;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gBal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C[1]} stopOpacity={0.4} />
            <stop offset="100%" stopColor={C[1]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="age" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => formatCompact(v, currency)} />
        <Tooltip {...tooltipStyle} labelFormatter={(a) => `Age ${a}`} formatter={(v: number, n) => [formatMoney(v, currency), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {retireAge && <ReferenceLine x={retireAge} stroke={C[3]} strokeDasharray="4 4" label={{ value: "Retire", fill: "var(--muted-foreground)", fontSize: 11, position: "top" }} />}
        {result.depletionAge && <ReferenceLine x={result.depletionAge + 1} stroke={C[4]} strokeDasharray="4 4" label={{ value: "Runs out", fill: C[4], fontSize: 11, position: "insideTopRight" }} />}
        <Area type="monotone" dataKey="balance" name="Portfolio balance" stroke={C[1]} strokeWidth={2} fill="url(#gBal)" />
        <Area type="monotone" dataKey="contributed" name="Total contributed" stroke={C[2]} fill="transparent" strokeWidth={2} strokeDasharray="5 4" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RequiredVsProjectedChart({ result, currency }: { result: PlanResult; currency: CurrencyCode }) {
  const data = [
    { name: "Projected", value: result.projectedCorpus, fill: C[1] },
    { name: "Required", value: result.requiredCorpus, fill: C[2] },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => formatCompact(v, currency)} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number) => [formatMoney(v, currency), "Corpus"]} />
        <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={80}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SavingsBreakdownChart({ inputs, result, currency }: { inputs: PlanInputs; result: PlanResult; currency: CurrencyCode }) {
  const data = [
    { name: "Existing savings", value: inputs.existingSavings, fill: C[2] },
    { name: "Future contributions", value: result.totalContributions, fill: C[5] },
    { name: "Investment growth", value: Math.max(0, result.investmentGrowth), fill: C[1] },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="var(--card)">
          {data.map((d) => (
            <Cell key={d.name} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v: number, n) => [formatMoney(v, currency), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function IncomeVsExpensesChart({ result, currency }: { result: PlanResult; currency: CurrencyCode }) {
  const data = result.postRows.map((r) => ({ age: r.age, pension: r.pension, withdrawal: r.withdrawal, expenses: r.expenses }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="age" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => formatCompact(v, currency)} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} labelFormatter={(a) => `Age ${a}`} formatter={(v: number, n) => [formatMoney(v, currency), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="pension" stackId="i" name="Pension income" fill={C[2]} />
        <Bar dataKey="withdrawal" stackId="i" name="Portfolio withdrawal" fill={C[1]} radius={[4, 4, 0, 0]} />
        <Line dataKey="expenses" name="Expenses" stroke={C[4]} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function InflationImpactChart({ inputs, currency }: { inputs: PlanInputs; currency: CurrencyCode }) {
  const data = [];
  for (let age = inputs.currentAge; age <= inputs.lifeExpectancy; age++) {
    const y = age - inputs.currentAge;
    data.push({ age, nominal: inputs.desiredMonthlyExpense * Math.pow(1 + inputs.inflation / 100, y), today: inputs.desiredMonthlyExpense });
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="age" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => formatCompact(v, currency)} />
        <Tooltip {...tooltipStyle} labelFormatter={(a) => `Age ${a}`} formatter={(v: number, n) => [formatMoney(v, currency), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <ReferenceLine x={inputs.retirementAge} stroke={C[3]} strokeDasharray="4 4" />
        <Line dataKey="nominal" name="Monthly cost (future money)" stroke={C[4]} strokeWidth={2} dot={false} />
        <Line dataKey="today" name="Same lifestyle in today's money" stroke={C[2]} strokeDasharray="5 5" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ScenarioChart({ rows, currency }: { rows: { name: string; projected: number; required: number }[]; currency: CurrencyCode }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" {...axis} />
        <YAxis {...axis} width={70} tickFormatter={(v) => formatCompact(v, currency)} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number, n) => [formatMoney(v, currency), n]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="projected" name="Projected corpus" fill={C[1]} radius={[8, 8, 0, 0]} />
        <Bar dataKey="required" name="Required corpus" fill={C[2]} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
