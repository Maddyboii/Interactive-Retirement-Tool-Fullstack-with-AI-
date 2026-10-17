import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NumberField } from "./common";
import { QuestionnaireForm } from "./questionnaire";
import { usePlan } from "@/lib/plan-store";
import { CURRENCIES } from "@/lib/format";

const STEPS = ["About you", "Income & savings", "Retirement needs", "Your goals"];

export function OnboardingWizard() {
  const { hydrated, onboarded, setOnboarded, inputs, setInputs, errors, currency, setQuestionnaire } = usePlan();
  const [step, setStep] = useState(0);
  const sym = CURRENCIES[currency].symbol;
  const open = hydrated && !onboarded;

  const stepErrors = [
    ["currentAge", "retirementAge", "lifeExpectancy"],
    ["monthlyIncome", "monthlyExpenses", "existingSavings", "monthlyContribution"],
    ["desiredMonthlyExpense", "monthlyPension", "inflation"],
    [],
  ][step]!.some((k) => errors[k as keyof typeof errors]);

  const finish = () => {
    setQuestionnaire({ completed: true });
    setOnboarded(true);
    setStep(0);
    toast.success("Your plan is ready", { description: "All numbers update live as you change inputs." });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setOnboarded(true)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Welcome to RetireWise</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length} · {STEPS[step]}. We've filled in example values — adjust them to match your situation.
          </DialogDescription>
        </DialogHeader>
        <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
        <div className="space-y-5 py-2">
          {step === 0 && (
            <>
              <NumberField id="ob-age" label="Current age" value={inputs.currentAge} min={18} max={90} onChange={(v) => setInputs({ currentAge: v })} error={errors.currentAge} />
              <NumberField id="ob-ret" label="Planned retirement age" value={inputs.retirementAge} min={30} max={90} onChange={(v) => setInputs({ retirementAge: v })} error={errors.retirementAge} />
              <NumberField id="ob-life" label="Life expectancy" value={inputs.lifeExpectancy} min={40} max={110} onChange={(v) => setInputs({ lifeExpectancy: v })} error={errors.lifeExpectancy} help="Plan conservatively — many planners use 85–95." />
            </>
          )}
          {step === 1 && (
            <>
              <NumberField id="ob-inc" label="Monthly income" prefix={sym} value={inputs.monthlyIncome} min={0} max={2000000} step={1000} onChange={(v) => setInputs({ monthlyIncome: v })} error={errors.monthlyIncome} />
              <NumberField id="ob-exp" label="Monthly expenses" prefix={sym} value={inputs.monthlyExpenses} min={0} max={2000000} step={1000} onChange={(v) => setInputs({ monthlyExpenses: v })} error={errors.monthlyExpenses} />
              <NumberField id="ob-sav" label="Existing retirement savings" prefix={sym} value={inputs.existingSavings} min={0} max={50000000} step={10000} onChange={(v) => setInputs({ existingSavings: v })} error={errors.existingSavings} />
              <NumberField id="ob-con" label="Monthly retirement contribution" prefix={sym} value={inputs.monthlyContribution} min={0} max={500000} step={500} onChange={(v) => setInputs({ monthlyContribution: v })} error={errors.monthlyContribution} />
            </>
          )}
          {step === 2 && (
            <>
              <NumberField id="ob-des" label="Desired monthly expenses in retirement (today's money)" prefix={sym} value={inputs.desiredMonthlyExpense} min={0} max={1000000} step={1000} onChange={(v) => setInputs({ desiredMonthlyExpense: v })} error={errors.desiredMonthlyExpense} />
              <NumberField id="ob-pen" label="Expected monthly pension (today's money)" prefix={sym} value={inputs.monthlyPension} min={0} max={500000} step={500} onChange={(v) => setInputs({ monthlyPension: v })} error={errors.monthlyPension} />
              <NumberField id="ob-inf" label="Expected inflation" suffix="%" value={inputs.inflation} min={0} max={15} step={0.1} onChange={(v) => setInputs({ inflation: v })} error={errors.inflation} />
            </>
          )}
          {step === 3 && <QuestionnaireForm compact />}
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => setOnboarded(true)}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={stepErrors}>
                Next
              </Button>
            ) : (
              <Button onClick={finish}>See my plan</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
