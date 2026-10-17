import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GitCompareArrows, LineChart, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/rw/theme-toggle";
import { Disclaimer } from "@/components/rw/common";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RetireWise – Smart Retirement Planner" },
      { name: "description", content: "Calculate your retirement corpus, find your savings gap and get personalised recommendations." },
      { property: "og:title", content: "RetireWise – Smart Retirement Planner" },
      { property: "og:description", content: "Calculate your retirement corpus, find your savings gap and get personalised recommendations." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: LineChart, title: "Accurate projections", text: "Year-by-year modelling of growth, inflation, withdrawals and pension." },
  { icon: GitCompareArrows, title: "Scenario comparison", text: "Compare conservative, moderate and aggressive assumptions." },
  { icon: Lightbulb, title: "Smart recommendations", text: "Know exactly how much more to save to close your gap." },
  { icon: ShieldCheck, title: "Private by design", text: "Try it without an account. Save securely when you're ready." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-hero text-navy-foreground">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="h-5 w-5 text-primary" /> RetireWise</span>
          <div className="flex items-center gap-2"><ThemeToggle /><Button variant="secondary" size="sm" asChild><Link to="/auth">Sign in</Link></Button></div>
        </header>
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 animate-rise">
          <p className="text-sm font-medium text-primary">Smart Retirement Planner</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">Your Future. Your Freedom. Your Retirement Plan.</h1>
          <p className="mt-5 max-w-xl text-lg opacity-80">See how much you'll need, whether you're on track, and exactly what to change — in minutes.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link to="/planner">Start Planning <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="secondary" asChild><Link to="/dashboard">Explore Your Future</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-card p-5 shadow-card transition-transform hover:-translate-y-1">
            <f.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
      <footer className="mx-auto max-w-6xl px-6 pb-12"><Disclaimer /></footer>
    </div>
  );
}
