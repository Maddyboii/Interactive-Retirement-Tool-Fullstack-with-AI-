/**
 * RetireWise financial engine.
 *
 * Conventions (applied consistently everywhere):
 * - All rates are nominal annual percentages (e.g. 10 = 10% p.a.).
 * - Before retirement: monthly compounding at preReturn/12; contributions are made
 *   at the END of each month; the monthly contribution steps up once a year by
 *   the salary growth rate (contributions follow income).
 * - Existing savings compound for the full accumulation period.
 * - Expenses and pension are entered in TODAY's money and inflated annually
 *   (compounded) to retirement and through retirement — inflation is applied once.
 * - After retirement: yearly simulation. At the START of each retirement year the
 *   net need (expenses − pension, both inflation-indexed) is withdrawn, then the
 *   remaining balance grows at postReturn for the year.
 * - Required corpus = present value at retirement of those inflation-growing net
 *   withdrawals, discounted at postReturn, over (lifeExpectancy − retirementAge) years.
 *   It is exactly the balance that reaches zero at life expectancy under the simulation.
 */
import { z } from "zod";

export type Allocation = { equity: number; debt: number; gold: number; cash: number };

export type PlanInputs = {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingSavings: number;
  monthlyContribution: number;
  salaryGrowth: number;
  preReturn: number;
  postReturn: number;
  inflation: number;
  desiredMonthlyExpense: number;
  monthlyPension: number;
  emergencyFund: number;
  allocation: Allocation;
};

export const SAMPLE_INPUTS: PlanInputs = {
  currentAge: 32,
  retirementAge: 60,
  lifeExpectancy: 85,
  monthlyIncome: 150000,
  monthlyExpenses: 80000,
  existingSavings: 1500000,
  monthlyContribution: 25000,
  salaryGrowth: 5,
  preReturn: 10,
  postReturn: 7,
  inflation: 6,
  desiredMonthlyExpense: 60000,
  monthlyPension: 10000,
  emergencyFund: 300000,
  allocation: { equity: 60, debt: 30, gold: 5, cash: 5 },
};

const pct = (min: number, max: number) => z.number().finite().min(min).max(max);
const money = z.number().finite().min(0).max(1e12);

export const planInputsSchema = z
  .object({
    currentAge: z.number().int().min(18, "Age must be at least 18").max(90),
    retirementAge: z.number().int().min(30).max(90),
    lifeExpectancy: z.number().int().min(40).max(110),
    monthlyIncome: money,
    monthlyExpenses: money,
    existingSavings: money,
    monthlyContribution: money,
    salaryGrowth: pct(0, 25),
    preReturn: pct(0, 25),
    postReturn: pct(0, 20),
    inflation: pct(0, 20),
    desiredMonthlyExpense: money,
    monthlyPension: money,
    emergencyFund: money,
    allocation: z.object({ equity: pct(0, 100), debt: pct(0, 100), gold: pct(0, 100), cash: pct(0, 100) }),
  })
  .refine((v) => v.retirementAge > v.currentAge, {
    message: "Retirement age must be greater than current age",
    path: ["retirementAge"],
  })
  .refine((v) => v.lifeExpectancy > v.retirementAge, {
    message: "Life expectancy must be greater than retirement age",
    path: ["lifeExpectancy"],
  })
  .refine((v) => Math.abs(v.allocation.equity + v.allocation.debt + v.allocation.gold + v.allocation.cash - 100) < 0.5, {
    message: "Allocation must add up to 100%",
    path: ["allocation"],
  });

export type PreRow = {
  age: number;
  yearIndex: number;
  startBalance: number;
  contributions: number;
  growth: number;
  endBalance: number;
  cumulativeContributions: number;
};

export type PostRow = {
  age: number;
  yearIndex: number;
  startBalance: number;
  expenses: number;
  pension: number;
  withdrawal: number;
  growth: number;
  endBalance: number;
  shortfall: number;
  depleted: boolean;
};

export type PlanResult = {
  yearsToRetirement: number;
  retirementYears: number;
  fvExistingSavings: number;
  fvContributions: number;
  totalContributions: number;
  investmentGrowth: number;
  projectedCorpus: number;
  monthlyExpenseAtRetirement: number;
  annualExpenseAtRetirement: number;
  monthlyPensionAtRetirement: number;
  annualPensionAtRetirement: number;
  requiredCorpus: number;
  requiredMonthlySavings: number;
  additionalMonthlySavings: number;
  gap: number;
  readiness: number;
  depletionAge: number | null;
  preRows: PreRow[];
  postRows: PostRow[];
};

/** FV of a lump sum with monthly compounding. */
export function futureValueLumpSum(pv: number, annualRatePct: number, months: number): number {
  return pv * Math.pow(1 + annualRatePct / 100 / 12, months);
}

/** FV of level end-of-month contributions. Handles zero rate. */
export function futureValueAnnuity(monthly: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (months <= 0) return 0;
  if (r === 0) return monthly * months;
  return monthly * ((Math.pow(1 + r, months) - 1) / r);
}

/** Inflate a today's-money amount by compounded annual inflation. */
export function inflate(amount: number, inflationPct: number, years: number): number {
  return amount * Math.pow(1 + inflationPct / 100, years);
}

/** Simulate accumulation with yearly step-up; returns rows and FV of contributions alone. */
function accumulate(i: PlanInputs, monthlyContribution: number) {
  const years = i.retirementAge - i.currentAge;
  const r = i.preReturn / 100 / 12;
  const rows: PreRow[] = [];
  let balance = i.existingSavings;
  let contribOnly = 0;
  let cumulative = 0;
  let contribution = monthlyContribution;
  for (let y = 0; y < years; y++) {
    const start = balance;
    let yearContrib = 0;
    for (let m = 0; m < 12; m++) {
      balance = balance * (1 + r) + contribution;
      contribOnly = contribOnly * (1 + r) + contribution;
      yearContrib += contribution;
    }
    cumulative += yearContrib;
    rows.push({
      age: i.currentAge + y,
      yearIndex: y + 1,
      startBalance: start,
      contributions: yearContrib,
      growth: balance - start - yearContrib,
      endBalance: balance,
      cumulativeContributions: cumulative,
    });
    contribution *= 1 + i.salaryGrowth / 100;
  }
  return { rows, balance, contribOnly, cumulative };
}

/** PV at retirement of inflation-growing, start-of-year net withdrawals. */
export function requiredCorpusFor(netAnnualNeedAtRetirement: number, inflationPct: number, postReturnPct: number, years: number): number {
  if (netAnnualNeedAtRetirement <= 0 || years <= 0) return 0;
  const g = 1 + inflationPct / 100;
  const r = 1 + postReturnPct / 100;
  let pv = 0;
  for (let k = 0; k < years; k++) pv += (netAnnualNeedAtRetirement * Math.pow(g, k)) / Math.pow(r, k);
  return pv;
}

export function calculatePlan(i: PlanInputs): PlanResult {
  const yearsToRetirement = Math.max(0, i.retirementAge - i.currentAge);
  const retirementYears = Math.max(0, i.lifeExpectancy - i.retirementAge);
  const months = yearsToRetirement * 12;

  const acc = accumulate(i, i.monthlyContribution);
  const projectedCorpus = acc.balance;
  const fvExistingSavings = futureValueLumpSum(i.existingSavings, i.preReturn, months);
  const fvContributions = acc.contribOnly;
  const totalContributions = acc.cumulative;
  const investmentGrowth = projectedCorpus - i.existingSavings - totalContributions;

  const monthlyExpenseAtRetirement = inflate(i.desiredMonthlyExpense, i.inflation, yearsToRetirement);
  const monthlyPensionAtRetirement = inflate(i.monthlyPension, i.inflation, yearsToRetirement);
  const annualExpenseAtRetirement = monthlyExpenseAtRetirement * 12;
  const annualPensionAtRetirement = monthlyPensionAtRetirement * 12;
  const netNeed = Math.max(0, annualExpenseAtRetirement - annualPensionAtRetirement);

  const requiredCorpus = requiredCorpusFor(netNeed, i.inflation, i.postReturn, retirementYears);

  // Projected corpus is linear in the starting monthly contribution: solve exactly.
  const unit = accumulate({ ...i, existingSavings: 0 }, 1).contribOnly;
  const needFromContrib = requiredCorpus - fvExistingSavings;
  const requiredMonthlySavings = needFromContrib <= 0 ? 0 : unit > 0 ? needFromContrib / unit : Infinity;
  const additionalMonthlySavings = Math.max(0, requiredMonthlySavings - i.monthlyContribution);

  // Decumulation simulation
  const postRows: PostRow[] = [];
  let balance = projectedCorpus;
  let depletionAge: number | null = null;
  const g = 1 + i.inflation / 100;
  for (let k = 0; k < retirementYears; k++) {
    const expenses = annualExpenseAtRetirement * Math.pow(g, k);
    const pension = annualPensionAtRetirement * Math.pow(g, k);
    const need = Math.max(0, expenses - pension);
    const start = balance;
    const withdrawal = Math.min(need, Math.max(0, start));
    const shortfall = need - withdrawal;
    const after = start - withdrawal;
    const growth = after * (i.postReturn / 100);
    balance = after + growth;
    const depleted = shortfall > 0.5;
    if (depleted && depletionAge === null) depletionAge = i.retirementAge + k;
    postRows.push({
      age: i.retirementAge + k,
      yearIndex: k + 1,
      startBalance: start,
      expenses,
      pension,
      withdrawal,
      growth,
      endBalance: balance,
      shortfall,
      depleted,
    });
  }

  const gap = projectedCorpus - requiredCorpus;
  const readiness = requiredCorpus <= 0 ? 100 : (projectedCorpus / requiredCorpus) * 100;

  return {
    yearsToRetirement,
    retirementYears,
    fvExistingSavings,
    fvContributions,
    totalContributions,
    investmentGrowth,
    projectedCorpus,
    monthlyExpenseAtRetirement,
    annualExpenseAtRetirement,
    monthlyPensionAtRetirement,
    annualPensionAtRetirement,
    requiredCorpus,
    requiredMonthlySavings,
    additionalMonthlySavings,
    gap,
    readiness,
    depletionAge,
    preRows: acc.rows,
    postRows,
  };
}

export type Status = "healthy" | "warning" | "shortfall";
export function readinessStatus(readiness: number): Status {
  if (readiness >= 100) return "healthy";
  if (readiness >= 75) return "warning";
  return "shortfall";
}

/** Real (inflation-adjusted) return using the Fisher relation. */
export function realReturn(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

/** Months of expenses covered by the emergency fund. */
export function emergencyMonths(fund: number, monthlyExpenses: number): number {
  if (monthlyExpenses <= 0) return Infinity;
  return fund / monthlyExpenses;
}

/** Smallest retirement age (up to 75 / life-1) that reaches 100% readiness, or null. */
export function retirementAgeToBeReady(i: PlanInputs): number | null {
  for (let age = i.retirementAge; age < Math.min(76, i.lifeExpectancy); age++) {
    if (calculatePlan({ ...i, retirementAge: age }).readiness >= 100) return age;
  }
  return null;
}

/** Desired monthly expense (today's money) the current plan can sustain. */
export function sustainableMonthlyExpense(i: PlanInputs): number {
  let lo = 0;
  let hi = Math.max(i.desiredMonthlyExpense * 4, 1000);
  for (let n = 0; n < 60; n++) {
    const mid = (lo + hi) / 2;
    if (calculatePlan({ ...i, desiredMonthlyExpense: mid }).readiness >= 100) lo = mid;
    else hi = mid;
  }
  return lo;
}

export type ScenarioKey = "conservative" | "moderate" | "aggressive";
export type ScenarioAssumptions = { preReturn: number; postReturn: number; inflation: number };
export const DEFAULT_SCENARIOS: Record<ScenarioKey, ScenarioAssumptions> = {
  conservative: { preReturn: 7, postReturn: 5.5, inflation: 6.5 },
  moderate: { preReturn: 10, postReturn: 7, inflation: 6 },
  aggressive: { preReturn: 12.5, postReturn: 8, inflation: 6 },
};

export function toCsv(i: PlanInputs, r: PlanResult): string {
  const lines = [
    "Phase,Age,Year,Start Balance,Contributions,Withdrawal,Expenses,Pension,Growth,End Balance,Shortfall",
    ...r.preRows.map((p) =>
      ["Accumulation", p.age, p.yearIndex, p.startBalance, p.contributions, 0, 0, 0, p.growth, p.endBalance, 0]
        .map((v) => (typeof v === "number" ? Math.round(v) : v))
        .join(","),
    ),
    ...r.postRows.map((p) =>
      ["Retirement", p.age, p.yearIndex, p.startBalance, 0, p.withdrawal, p.expenses, p.pension, p.growth, p.endBalance, p.shortfall]
        .map((v) => (typeof v === "number" ? Math.round(v) : v))
        .join(","),
    ),
  ];
  void i;
  return lines.join("\n");
}
