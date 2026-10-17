import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileText, Printer, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/rw/common";
import { usePlan, type PlanSnapshot } from "@/lib/plan-store";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatCompact } from "@/lib/format";
import { toCsv } from "@/lib/retirement";

export const Route = createFileRoute("/_shell/plans")({
  head: () => ({
    meta: [
      { title: "Plans & Export – RetireWise" },
      { name: "description", content: "Save, load and export your retirement plans as PDF or CSV." },
      { property: "og:title", content: "Plans & Export – RetireWise" },
      { property: "og:description", content: "Save, load and export your retirement plans as PDF or CSV." },
    ],
  }),
  component: Plans,
});

type SavedPlan = { id: string; name: string; data: PlanSnapshot; updated_at: string };
const LOCAL = "retirewise:local-plans";

function Plans() {
  const plan = usePlan();
  const { user } = useAuth();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [name, setName] = useState("");

  const refresh = async () => {
    if (user) {
      const { data, error } = await supabase.from("retirement_plans").select("id,name,data,updated_at").order("updated_at", { ascending: false });
      if (error) { toast.error("Couldn't load plans"); return; }
      setPlans((data ?? []) as unknown as SavedPlan[]);
    } else setPlans(JSON.parse(localStorage.getItem(LOCAL) ?? "[]"));
  };
  useEffect(() => {
    refresh();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (asNew: boolean) => {
    const n = (name || plan.activePlan?.name || "My retirement plan").trim().slice(0, 100);
    const snap = plan.snapshot();
    const existingId = !asNew && plan.activePlan ? plan.activePlan.id : null;
    if (user) {
      const res = existingId
        ? await supabase.from("retirement_plans").update({ name: n, data: snap as never, updated_at: new Date().toISOString() }).eq("id", existingId).select("id").single()
        : await supabase.from("retirement_plans").insert({ name: n, data: snap as never, user_id: user.id }).select("id").single();
      if (res.error) { toast.error("Save failed", { description: res.error.message }); return; }
      plan.setActivePlan({ id: res.data.id, name: n, source: "cloud" });
    } else {
      const list: SavedPlan[] = JSON.parse(localStorage.getItem(LOCAL) ?? "[]");
      const id = existingId ?? crypto.randomUUID();
      const item = { id, name: n, data: snap, updated_at: new Date().toISOString() };
      localStorage.setItem(LOCAL, JSON.stringify([item, ...list.filter((p) => p.id !== id)]));
      plan.setActivePlan({ id, name: n, source: "local" });
    }
    setName("");
    toast.success(`Saved "${n}"`);
    refresh();
  };

  const remove = async (p: SavedPlan) => {
    if (user) {
      const { error } = await supabase.from("retirement_plans").delete().eq("id", p.id);
      if (error) { toast.error("Delete failed"); return; }
    } else localStorage.setItem(LOCAL, JSON.stringify(plans.filter((x) => x.id !== p.id)));
    if (plan.activePlan?.id === p.id) plan.setActivePlan(null);
    toast.success("Plan deleted");
    refresh();
  };

  const downloadCsv = () => {
    const blob = new Blob([toCsv(plan.inputs, plan.result)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "retirewise-projection.csv";
    a.click();
    toast.success("CSV downloaded");
  };

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const { inputs: i, result: r } = plan;
    const m = (n: number) => formatCompact(n, plan.currency).replace("₹", "Rs ");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("RetireWise – Retirement Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 25);
    autoTable(doc, {
      startY: 32,
      head: [["Metric", "Value"]],
      body: [
        ["Age / retirement / life expectancy", `${i.currentAge} / ${i.retirementAge} / ${i.lifeExpectancy}`],
        ["Projected corpus", m(r.projectedCorpus)],
        ["Required corpus", m(r.requiredCorpus)],
        [r.gap >= 0 ? "Surplus" : "Shortfall", m(Math.abs(r.gap))],
        ["Readiness", `${Math.round(r.readiness)}%`],
        ["Monthly savings needed", m(r.requiredMonthlySavings)],
        ["Savings last until", r.depletionAge ? `Age ${r.depletionAge}` : `${i.lifeExpectancy}+`],
        ["Assumptions", `Return ${i.preReturn}% / ${i.postReturn}%, inflation ${i.inflation}%`],
      ],
    });
    autoTable(doc, {
      head: [["Age", "Start", "Contrib/Withdraw", "Growth", "End"]],
      body: [
        ...r.preRows.map((p) => [p.age, m(p.startBalance), m(p.contributions), m(p.growth), m(p.endBalance)]),
        ...r.postRows.map((p) => [p.age, m(p.startBalance), "-" + m(p.withdrawal), m(p.growth), m(p.endBalance)]),
      ],
      styles: { fontSize: 8 },
    });
    doc.setFontSize(8);
    doc.text("Projections are estimates, not guarantees. Not financial advice.", 14, doc.internal.pageSize.height - 10);
    doc.save("retirewise-report.pdf");
    toast.success("PDF downloaded");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Plans & export" description={user ? "Plans are saved securely to your account." : "Demo mode: plans are saved only in this browser. Sign in to save to your account."} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Save current plan">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder={plan.activePlan?.name ?? "Plan name"} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => save(false)}>
              <Save className="h-4 w-4" /> {plan.activePlan ? "Update" : "Save"}
            </Button>
            {plan.activePlan && (
              <Button variant="outline" onClick={() => save(true)}>
                Save as new
              </Button>
            )}
          </div>
          {!user && (
            <p className="mt-3 text-xs text-muted-foreground">
              <Link to="/auth" className="font-medium text-primary underline">Sign in</Link> to sync plans across devices.
            </p>
          )}
        </Panel>
        <Panel title="Export & tools">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadPdf}><FileText className="h-4 w-4" /> PDF report</Button>
            <Button variant="outline" onClick={downloadCsv}><Download className="h-4 w-4" /> CSV projections</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            <Button variant="outline" onClick={() => { plan.resetSample(); plan.setActivePlan(null); }}><RotateCcw className="h-4 w-4" /> New from sample</Button>
          </div>
        </Panel>
      </div>
      <Panel title={`Saved plans (${plans.length})`}>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved plans yet.</p>
        ) : (
          <ul className="divide-y">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium">{p.name} {plan.activePlan?.id === p.id && <span className="ml-1 rounded-full bg-accent px-2 text-xs text-accent-foreground">active</span>}</p>
                  <p className="text-xs text-muted-foreground">Updated {new Date(p.updated_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { plan.loadSnapshot(p.data, { id: p.id, name: p.name, source: user ? "cloud" : "local" }); toast.success(`Loaded "${p.name}"`); }}>
                    <Upload className="h-4 w-4" /> Load
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
