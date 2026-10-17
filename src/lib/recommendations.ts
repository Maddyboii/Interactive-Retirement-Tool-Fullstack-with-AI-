import { calculatePlan, retirementAgeToBeReady, sustainableMonthlyExpense, type PlanInputs, type PlanResult } from "./retirement";
import type { Questionnaire } from "./plan-store";

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  patch: Partial<PlanInputs> | null;
  after: PlanResult | null;
  kind: "action" | "info";
};

export function buildRecommendations(i: PlanInputs, r: PlanResult, q: Questionnaire, fmt: (n: number) => string): Recommendation[] {
  const recs: Recommendation[] = [];
  const mk = (id: string, title: string, description: string, patch: Partial<PlanInputs> | null, kind: Recommendation["kind"] = "action") =>
    recs.push({ id, title, description, patch, after: patch ? calculatePlan({ ...i, ...patch }) : null, kind });

  if (r.additionalMonthlySavings > 0 && Number.isFinite(r.requiredMonthlySavings)) {
    const target = Math.ceil(r.requiredMonthlySavings / 100) * 100;
    mk(
      "contrib",
      `Increase monthly contribution by ${fmt(target - i.monthlyContribution)}`,
      `Saving ${fmt(target)} a month (stepping up ${i.salaryGrowth}% each year) is projected to fully fund your goal.`,
      { monthlyContribution: target },
    );
    const half = Math.round((i.monthlyContribution + (target - i.monthlyContribution) / 2) / 100) * 100;
    mk("contrib-half", `Close half the gap: save ${fmt(half)}/month`, "A smaller, more manageable step that you can combine with other adjustments.", { monthlyContribution: half });
  }

  if (r.readiness < 100) {
    const age = retirementAgeToBeReady(i);
    if (age && age !== i.retirementAge) mk("age", `Consider retiring at ${age}`, `Working ${age - i.retirementAge} more year(s) adds contributions and growth, and shortens the withdrawal period.`, { retirementAge: age });
    const sustainable = sustainableMonthlyExpense(i);
    if (sustainable > 0 && sustainable < i.desiredMonthlyExpense)
      mk("expense", `Plan for ${fmt(Math.floor(sustainable / 500) * 500)}/month in retirement`, `That's what your current savings can sustain to age ${i.lifeExpectancy} (in today's money), versus your target of ${fmt(i.desiredMonthlyExpense)}.`, {
        desiredMonthlyExpense: Math.floor(sustainable / 500) * 500,
      });
    if (i.salaryGrowth < 10) mk("stepup", "Step up contributions with every raise", `Raising your annual contribution step-up from ${i.salaryGrowth}% to ${Math.min(i.salaryGrowth + 3, 15)}% compounds powerfully over ${r.yearsToRetirement} years.`, { salaryGrowth: Math.min(i.salaryGrowth + 3, 15) });
  } else {
    mk("surplus", "You're on track — consider a buffer", `Your projected surplus is ${fmt(r.gap)}. Keeping a margin protects you against lower returns or higher inflation than assumed.`, null, "info");
    if (i.retirementAge > i.currentAge + 1) {
      const earlier = i.retirementAge - 2;
      const after = calculatePlan({ ...i, retirementAge: earlier });
      if (after.readiness >= 100) mk("early", `You may be able to retire at ${earlier}`, "Your plan stays fully funded with an earlier retirement under current assumptions.", { retirementAge: earlier });
    }
  }

  mk("inflation", "Stress-test for higher inflation", `If inflation averages ${(i.inflation + 1).toFixed(1)}% instead of ${i.inflation}%, see how your readiness changes.`, { inflation: +(i.inflation + 1).toFixed(1) });
  mk("returns", "Check a lower-return scenario", `Returns can disappoint. Model ${Math.max(0, i.preReturn - 2)}% before retirement to see how robust your plan is.`, { preReturn: Math.max(0, i.preReturn - 2) });

  if (r.yearsToRetirement > 0)
    recs.push({
      id: "early-start",
      title: "Every year counts — start as early as possible",
      description: `Delaying contributions by just one year would cost roughly ${fmt(r.projectedCorpus - calculatePlan({ ...i, currentAge: i.currentAge + 1, existingSavings: i.existingSavings }).projectedCorpus)} of final corpus. Compounding rewards time in the market.`,
      patch: null,
      after: null,
      kind: "info",
    });

  if (q.risk === "low" && i.allocation.equity > 50)
    recs.push({ id: "risk", title: "Your allocation may exceed your comfort level", description: "You said you'd move to safer assets in a downturn, but your equity allocation is above 50%. Align your plan with what you can stick with.", patch: null, after: null, kind: "info" });
  if (q.risk === "high" && r.yearsToRetirement < 7)
    recs.push({ id: "risk-near", title: "Close to retirement? Mind sequence risk", description: "Large losses just before or after retirement are hard to recover from. Higher return assumptions aren't automatically better.", patch: null, after: null, kind: "info" });
  if (q.goal === "early" && i.retirementAge > 55) recs.push({ id: "goal-early", title: "Early retirement goal", description: `Your goal is to retire early, but your plan uses age ${i.retirementAge}. Try lowering it on the My Inputs page to see what it takes.`, patch: null, after: null, kind: "info" });

  return recs;
}
