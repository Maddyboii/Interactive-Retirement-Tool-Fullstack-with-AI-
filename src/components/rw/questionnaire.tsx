import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { usePlan, type Questionnaire } from "@/lib/plan-store";
import { cn } from "@/lib/utils";

const QUESTIONS: { key: "goal" | "risk" | "horizonComfort"; label: string; options: { value: string; label: string; hint: string }[] }[] = [
  {
    key: "goal",
    label: "What does retirement look like for you?",
    options: [
      { value: "basic", label: "Cover essentials", hint: "Security first" },
      { value: "comfortable", label: "Comfortable lifestyle", hint: "Travel, hobbies" },
      { value: "early", label: "Retire early", hint: "Freedom sooner" },
      { value: "legacy", label: "Leave a legacy", hint: "Support family" },
    ],
  },
  {
    key: "risk",
    label: "If your portfolio fell 20% in a year, you would…",
    options: [
      { value: "low", label: "Move to safer assets", hint: "Low risk tolerance" },
      { value: "medium", label: "Hold and wait", hint: "Moderate tolerance" },
      { value: "high", label: "Invest more", hint: "High tolerance" },
    ],
  },
  {
    key: "horizonComfort",
    label: "How do you feel about your retirement today?",
    options: [
      { value: "worried", label: "Worried", hint: "" },
      { value: "neutral", label: "Unsure", hint: "" },
      { value: "confident", label: "Confident", hint: "" },
    ],
  },
];

export function QuestionnaireForm({ compact }: { compact?: boolean }) {
  const { questionnaire, setQuestionnaire } = usePlan();
  return (
    <div className="space-y-5">
      {QUESTIONS.map((q) => (
        <fieldset key={q.key}>
          <legend className="mb-2 text-sm font-medium">{q.label}</legend>
          <RadioGroup
            value={questionnaire[q.key]}
            onValueChange={(v) => setQuestionnaire({ [q.key]: v, completed: true } as Partial<Questionnaire>)}
            className={cn("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-4")}
          >
            {q.options.map((o) => (
              <Label
                key={o.value}
                htmlFor={`${q.key}-${o.value}`}
                className="flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors hover:bg-muted has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-accent"
              >
                <RadioGroupItem id={`${q.key}-${o.value}`} value={o.value} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">{o.label}</span>
                  {o.hint && <span className="block text-xs font-normal text-muted-foreground">{o.hint}</span>}
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>
      ))}
    </div>
  );
}
