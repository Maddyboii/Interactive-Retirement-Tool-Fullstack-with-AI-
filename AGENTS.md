<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

- All retirement math lives in `src/lib/retirement.ts` (pure, tested in `retirement.test.ts`); UI never computes finances inline — keeps results consistent and testable.
- Plan state (inputs, scenarios, currency, notifications) lives in `src/lib/plan-store.tsx` and persists to localStorage for demo mode; signed-in users save plans to the `retirement_plans` table (RLS per user).
- App pages live under the pathless `_shell` layout (sidebar + header); landing `/` and `/auth` are outside it.
