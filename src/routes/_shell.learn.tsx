import { createFileRoute } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Disclaimer, PageHeader, Panel } from "@/components/rw/common";

export const Route = createFileRoute("/_shell/learn")({
  head: () => ({
    meta: [
      { title: "Learn & FAQ – RetireWise" },
      { name: "description", content: "Retirement planning guide, glossary, assumptions, FAQ and privacy notice." },
      { property: "og:title", content: "Learn & FAQ – RetireWise" },
      { property: "og:description", content: "Retirement planning guide, glossary, assumptions, FAQ and privacy notice." },
    ],
  }),
  component: Learn,
});

const GLOSSARY: [string, string][] = [
  ["Corpus", "The total pool of savings you have at retirement to fund your expenses."],
  ["Compounding", "Earning returns on past returns. Small monthly amounts grow dramatically over decades."],
  ["Inflation", "The rise in prices over time. At 6%, costs roughly double every 12 years."],
  ["Nominal amount", "Money in future rupees, not adjusted for inflation. Dashboard figures at retirement are nominal."],
  ["Real return", "Return after inflation: (1 + nominal) / (1 + inflation) − 1."],
  ["Readiness", "Projected corpus divided by required corpus. 100% or more means fully funded."],
  ["Sequence risk", "The risk that poor returns early in retirement deplete savings faster."],
];
const GUIDE = ["Build an emergency fund of 6 months of expenses.", "Estimate retirement expenses in today's money.", "Start contributing early and step up with every raise.", "Use realistic, even conservative, return assumptions.", "Review your plan yearly and after major life events."];
const FAQ: [string, string][] = [
  ["How is the required corpus calculated?", "We inflate your desired expenses and pension to retirement, then compute the amount that funds inflation-rising net withdrawals each year until life expectancy, earning your post-retirement return."],
  ["Are returns guaranteed?", "No. All projections are hypothetical and depend on your assumptions."],
  ["Is my data shared?", "No. See the privacy notice below."],
  ["Why does salary growth matter?", "Your monthly contribution increases by this rate each year, mirroring a rising income."],
];

function Learn() {
  return (
    <div className="space-y-6">
      <PageHeader title="Learn & FAQ" description="Understand the numbers behind your plan." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Retirement planning guide">
          <ol className="list-decimal space-y-2 pl-5 text-sm">{GUIDE.map((g) => <li key={g}>{g}</li>)}</ol>
        </Panel>
        <Panel title="Calculation assumptions">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>Contributions at the end of each month; monthly compounding before retirement.</li>
            <li>Contributions step up yearly by your salary growth rate.</li>
            <li>Expenses and pension entered in today's money and inflated annually — applied once, never double-counted.</li>
            <li>In retirement, withdrawals happen at the start of each year; the rest grows at your post-retirement return.</li>
            <li>Taxes and fees are not modelled.</li>
          </ul>
        </Panel>
      </div>
      <Panel title="Glossary">
        <dl className="grid gap-4 sm:grid-cols-2">{GLOSSARY.map(([t, d]) => <div key={t}><dt className="font-semibold">{t}</dt><dd className="text-sm text-muted-foreground">{d}</dd></div>)}</dl>
      </Panel>
      <Panel title="Frequently asked questions">
        <Accordion type="single" collapsible>{FAQ.map(([q, a]) => <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion>
      </Panel>
      <Panel title="Privacy notice">
        <p className="text-sm text-muted-foreground">In demo mode your inputs are stored only in this browser. When signed in, saved plans are stored in your private account and protected so only you can access them. We never connect to bank or investment accounts and never sell your data.</p>
      </Panel>
      <Disclaimer />
    </div>
  );
}
