import { describe, expect, it } from "vitest";
import {
  SAMPLE_INPUTS,
  calculatePlan,
  futureValueAnnuity,
  futureValueLumpSum,
  inflate,
  planInputsSchema,
  realReturn,
  requiredCorpusFor,
  readinessStatus,
  type PlanInputs,
} from "./retirement";

const base: PlanInputs = { ...SAMPLE_INPUTS, salaryGrowth: 0 };

describe("core formulas", () => {
  it("lump sum compounds monthly", () => {
    expect(futureValueLumpSum(100000, 12, 12)).toBeCloseTo(100000 * 1.01 ** 12, 4);
  });
  it("end-of-month annuity matches closed form", () => {
    expect(futureValueAnnuity(1000, 12, 12)).toBeCloseTo(1000 * ((1.01 ** 12 - 1) / 0.01), 4);
  });
  it("zero interest annuity is simple sum", () => {
    expect(futureValueAnnuity(1000, 0, 120)).toBe(120000);
  });
  it("inflation compounds annually", () => {
    expect(inflate(100, 6, 2)).toBeCloseTo(112.36, 6);
    expect(inflate(100, 0, 30)).toBe(100);
  });
  it("real return uses Fisher relation", () => {
    expect(realReturn(10, 6)).toBeCloseTo(3.7736, 3);
  });
});

describe("calculatePlan", () => {
  it("projected corpus = FV(existing) + FV(contributions) with no step-up", () => {
    const r = calculatePlan(base);
    const months = (base.retirementAge - base.currentAge) * 12;
    const expected = futureValueLumpSum(base.existingSavings, base.preReturn, months) + futureValueAnnuity(base.monthlyContribution, base.preReturn, months);
    expect(r.projectedCorpus).toBeCloseTo(expected, 2);
    expect(r.totalContributions).toBe(base.monthlyContribution * months);
  });

  it("zero return & zero inflation: corpus is plain sums and required = net need × years", () => {
    const i = { ...base, preReturn: 0, postReturn: 0, inflation: 0, currentAge: 30, retirementAge: 40, lifeExpectancy: 50, existingSavings: 1000, monthlyContribution: 100, desiredMonthlyExpense: 500, monthlyPension: 100 };
    const r = calculatePlan(i);
    expect(r.projectedCorpus).toBe(1000 + 100 * 120);
    expect(r.requiredCorpus).toBe(400 * 12 * 10);
  });

  it("required corpus exactly depletes at life expectancy", () => {
    const r = calculatePlan(base);
    const funded = calculatePlan({ ...base, monthlyContribution: r.requiredMonthlySavings });
    expect(funded.projectedCorpus).toBeCloseTo(r.requiredCorpus, 0);
    expect(Math.abs(funded.postRows.at(-1)!.endBalance)).toBeLessThan(1);
    expect(funded.depletionAge).toBeNull();
  });

  it("required corpus when return equals inflation = need × years", () => {
    expect(requiredCorpusFor(1000, 6, 6, 25)).toBeCloseTo(25000, 6);
  });

  it("already-funded goal needs zero additional savings and shows surplus", () => {
    const r = calculatePlan({ ...base, existingSavings: 1e9 });
    expect(r.requiredMonthlySavings).toBe(0);
    expect(r.additionalMonthlySavings).toBe(0);
    expect(r.gap).toBeGreaterThan(0);
    expect(readinessStatus(r.readiness)).toBe("healthy");
  });

  it("pension covering all expenses means required corpus is 0", () => {
    const r = calculatePlan({ ...base, monthlyPension: base.desiredMonthlyExpense });
    expect(r.requiredCorpus).toBe(0);
    expect(r.readiness).toBe(100);
  });

  it("insufficient savings produces negative gap and a depletion age", () => {
    const r = calculatePlan({ ...base, existingSavings: 0, monthlyContribution: 2000 });
    expect(r.gap).toBeLessThan(0);
    expect(r.depletionAge).not.toBeNull();
    expect(r.depletionAge!).toBeGreaterThanOrEqual(base.retirementAge);
    expect(r.depletionAge!).toBeLessThan(base.lifeExpectancy);
  });

  it("salary step-up increases contributions each year", () => {
    const r = calculatePlan({ ...base, salaryGrowth: 10 });
    expect(r.preRows[1]!.contributions).toBeCloseTo(r.preRows[0]!.contributions * 1.1, 4);
  });

  it("extreme but valid ages compute", () => {
    const r = calculatePlan({ ...base, currentAge: 89, retirementAge: 90, lifeExpectancy: 110 });
    expect(r.yearsToRetirement).toBe(1);
    expect(r.postRows).toHaveLength(20);
  });
});

describe("validation", () => {
  it("rejects retirement age <= current age", () => {
    expect(planInputsSchema.safeParse({ ...base, retirementAge: base.currentAge }).success).toBe(false);
  });
  it("rejects life expectancy <= retirement age", () => {
    expect(planInputsSchema.safeParse({ ...base, lifeExpectancy: base.retirementAge }).success).toBe(false);
  });
  it("rejects negative money", () => {
    expect(planInputsSchema.safeParse({ ...base, existingSavings: -1 }).success).toBe(false);
  });
  it("accepts sample values", () => {
    expect(planInputsSchema.safeParse(SAMPLE_INPUTS).success).toBe(true);
  });
});
