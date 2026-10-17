import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarRange,
  FolderOpen,
  GitCompareArrows,
  LayoutDashboard,
  Lightbulb,
  LogIn,
  LogOut,
  Menu,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/rw/theme-toggle";
import { OnboardingWizard } from "@/components/rw/onboarding";
import { usePlan } from "@/lib/plan-store";
import { CURRENCIES, type CurrencyCode } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell")({ component: Shell });

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "My Inputs", icon: SlidersHorizontal },
  { to: "/scenarios", label: "Scenarios", icon: GitCompareArrows },
  { to: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { to: "/timeline", label: "Timeline", icon: CalendarRange },
  { to: "/plans", label: "Plans & Export", icon: FolderOpen },
  { to: "/learn", label: "Learn & FAQ", icon: BookOpen },
] as const;

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          activeProps={{ className: "bg-sidebar-accent !text-sidebar-accent-foreground shadow-inner" }}
        >
          <Icon className="h-4.5 w-4.5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">RetireWise</span>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { result } = usePlan();
  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4">
      <Brand />
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto rounded-2xl bg-sidebar-accent p-4 text-sidebar-accent-foreground">
        <p className="text-xs text-sidebar-foreground/70">Retirement readiness</p>
        <p className="mt-1 font-display text-2xl font-semibold tabular">{Math.round(Math.min(result.readiness, 999))}%</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
          <div className="h-full rounded-full bg-sidebar-primary transition-all duration-500" style={{ width: `${Math.min(result.readiness, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function Notifications() {
  const { notifications, markAllRead, clearNotifications } = usePlan();
  const unread = notifications.filter((n) => !n.read).length;
  const tone = { healthy: "bg-success", warning: "bg-warning", shortfall: "bg-destructive", info: "bg-primary" };
  return (
    <Popover onOpenChange={(o) => !o && markAllRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Readiness updates</p>
          {notifications.length > 0 && (
            <button onClick={clearNotifications} className="text-xs text-muted-foreground hover:text-foreground">
              Clear all
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No updates yet. You'll be notified when your readiness level changes.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="flex gap-3 border-b px-4 py-3 last:border-0">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", tone[n.tone])} />
                <div>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.at).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Shell() {
  const [open, setOpen] = useState(false);
  const { currency, setCurrency, activePlan } = usePlan();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block no-print">
        <SidebarBody />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur sm:px-6 no-print">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-muted-foreground">
              {activePlan ? (
                <>
                  Plan: <span className="font-medium text-foreground">{activePlan.name}</span>
                </>
              ) : user ? (
                "Unsaved plan"
              ) : (
                <>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">Demo mode</span>
                  <span className="ml-2 hidden sm:inline">Data stays in this browser</span>
                </>
              )}
            </p>
          </div>
          <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
            <SelectTrigger className="h-9 w-[92px]" aria-label="Currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCIES[c].symbol} {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Notifications />
          <ThemeToggle />
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out");
                navigate({ to: "/dashboard" });
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            </Button>
          )}
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
      <OnboardingWizard />
    </div>
  );
}
