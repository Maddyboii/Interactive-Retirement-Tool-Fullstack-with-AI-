import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  DEFAULT_SCENARIOS,
  SAMPLE_INPUTS,
  calculatePlan,
  planInputsSchema,
  readinessStatus,
  type PlanInputs,
  type PlanResult,
  type ScenarioAssumptions,
  type ScenarioKey,
} from "./retirement";
import type { CurrencyCode } from "./format";

export type Questionnaire = {
  goal: "comfortable" | "early" | "legacy" | "basic";
  risk: "low" | "medium" | "high";
  horizonComfort: "worried" | "neutral" | "confident";
  completed: boolean;
};

export type AppNotification = { id: string; at: number; title: string; body: string; tone: "healthy" | "warning" | "shortfall" | "info"; read: boolean };

export type PlanSnapshot = { inputs: PlanInputs; scenarios: Record<ScenarioKey, ScenarioAssumptions>; questionnaire: Questionnaire };

type State = {
  inputs: PlanInputs;
  scenarios: Record<ScenarioKey, ScenarioAssumptions>;
  questionnaire: Questionnaire;
  currency: CurrencyCode;
  notifications: AppNotification[];
  activePlan: { id: string; name: string; source: "cloud" | "local" } | null;
  onboarded: boolean;
};

const DEFAULT_Q: Questionnaire = { goal: "comfortable", risk: "medium", horizonComfort: "neutral", completed: false };
const DEFAULT_STATE: State = {
  inputs: SAMPLE_INPUTS,
  scenarios: DEFAULT_SCENARIOS,
  questionnaire: DEFAULT_Q,
  currency: "INR",
  notifications: [],
  activePlan: null,
  onboarded: false,
};
const KEY = "retirewise:state:v1";

type Ctx = State & {
  result: PlanResult;
  valid: boolean;
  errors: { [K in keyof PlanInputs]?: string };
  hydrated: boolean;
  setInputs: (patch: Partial<PlanInputs>) => void;
  replaceInputs: (i: PlanInputs) => void;
  resetSample: () => void;
  setScenario: (k: ScenarioKey, patch: Partial<ScenarioAssumptions>) => void;
  resetScenarios: () => void;
  setQuestionnaire: (q: Partial<Questionnaire>) => void;
  setCurrency: (c: CurrencyCode) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
  setActivePlan: (p: State["activePlan"]) => void;
  loadSnapshot: (s: PlanSnapshot, plan: State["activePlan"]) => void;
  snapshot: () => PlanSnapshot;
  setOnboarded: (v: boolean) => void;
};

const PlanContext = createContext<Ctx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  // last valid inputs keep the dashboard stable while a field is mid-edit/invalid
  const lastValid = useRef<PlanInputs>(SAMPLE_INPUTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        setState((s) => ({ ...s, ...parsed, inputs: { ...SAMPLE_INPUTS, ...parsed.inputs } }));
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const parsed = planInputsSchema.safeParse(state.inputs);
  const errorMap: Record<string, string> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) errorMap[issue.path.join(".")] ??= issue.message;
  const errors = errorMap as { [K in keyof PlanInputs]?: string };
  if (parsed.success) lastValid.current = state.inputs;
  const result = useMemo(() => calculatePlan(lastValid.current), [state.inputs]); // eslint-disable-line react-hooks/exhaustive-deps

  // readiness change notifications
  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const status = readinessStatus(result.readiness);
    if (prevStatus.current && prevStatus.current !== status) {
      const copy: [string, string] = ({
        healthy: ["You're on track", "Your plan now meets your retirement goal."],
        warning: ["Almost there", "Your readiness is between 75% and 100%. A small increase in savings can close the gap."],
        shortfall: ["Funding shortfall", "Your projected corpus covers less than 75% of what you need."],
      } as Record<string, [string, string]>)[status]!;
      const n: AppNotification = { id: crypto.randomUUID(), at: Date.now(), title: copy[0], body: `${copy[1]} Readiness: ${Math.round(result.readiness)}%.`, tone: status, read: false };
      setState((s) => ({ ...s, notifications: [n, ...s.notifications].slice(0, 30) }));
    }
    prevStatus.current = status;
  }, [result.readiness, hydrated]);

  const setInputs = useCallback((patch: Partial<PlanInputs>) => setState((s) => ({ ...s, inputs: { ...s.inputs, ...patch } })), []);
  const value: Ctx = {
    ...state,
    result,
    valid: parsed.success,
    errors,
    hydrated,
    setInputs,
    replaceInputs: (i) => setState((s) => ({ ...s, inputs: i })),
    resetSample: () => {
      setState((s) => ({ ...s, inputs: SAMPLE_INPUTS, scenarios: DEFAULT_SCENARIOS }));
      toast.success("Calculator reset to sample values");
    },
    setScenario: (k, patch) => setState((s) => ({ ...s, scenarios: { ...s.scenarios, [k]: { ...s.scenarios[k], ...patch } } })),
    resetScenarios: () => setState((s) => ({ ...s, scenarios: DEFAULT_SCENARIOS })),
    setQuestionnaire: (q) => setState((s) => ({ ...s, questionnaire: { ...s.questionnaire, ...q } })),
    setCurrency: (c) => setState((s) => ({ ...s, currency: c })),
    markAllRead: () => setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    clearNotifications: () => setState((s) => ({ ...s, notifications: [] })),
    setActivePlan: (p) => setState((s) => ({ ...s, activePlan: p })),
    loadSnapshot: (snap, plan) =>
      setState((s) => ({ ...s, inputs: { ...SAMPLE_INPUTS, ...snap.inputs }, scenarios: snap.scenarios ?? DEFAULT_SCENARIOS, questionnaire: snap.questionnaire ?? DEFAULT_Q, activePlan: plan })),
    snapshot: () => ({ inputs: state.inputs, scenarios: state.scenarios, questionnaire: state.questionnaire }),
    setOnboarded: (v) => setState((s) => ({ ...s, onboarded: v })),
  };
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}
