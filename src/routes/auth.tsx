import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in – RetireWise" },
      { name: "description", content: "Sign in to save and sync your retirement plans." },
      { property: "og:title", content: "Sign in – RetireWise" },
      { property: "og:description", content: "Sign in to save and sync your retirement plans." },
    ],
  }),
  component: Auth,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email").max(255), password: z.string().min(8, "Password must be at least 8 characters").max(72) });

function Auth() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Invalid input"); return; }
    setBusy(true);
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword(p.data)
        : await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${window.location.origin}/dashboard` } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up" && !data.session) { toast.success("Check your email to confirm your account"); return; }
    toast.success("Welcome!");
    navigate({ to: "/plans" });
  };

  const oauth = async (provider: "google" | "lovable") => {
    const res = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Sign-in failed"); return; }
    if (!res.redirected) navigate({ to: "/plans" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-hero px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-card">
        <Link to="/" className="font-display text-lg font-semibold">RetireWise</Link>
        <h1 className="mt-4 text-2xl font-semibold">{mode === "in" ? "Sign in" : "Create account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Save multiple plans securely and access them anywhere.</p>
        <div className="mt-5 grid gap-2">
          <Button variant="outline" onClick={() => oauth("google")}>Continue with Google</Button>
          <Button variant="outline" onClick={() => oauth("lovable")}>Continue with Lovable</Button>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Sign in" : "Create account"}</Button>
        </form>
        <button className="mt-4 text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
        <p className="mt-4 text-xs text-muted-foreground"><Link to="/dashboard" className="underline">Continue in demo mode</Link> — no account needed.</p>
      </div>
    </div>
  );
}
