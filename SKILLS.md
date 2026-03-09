# GymGurus — Skills Registry

> Always check ALL locations below before starting any task.
> Read every relevant SKILL.md. Report what you loaded BEFORE writing code.

---

## Location 1: `C:/Users/tvarv/.claude/skills/` — Workflow & Engineering

### Engineering Workflow (use before any code task)

| Skill                            | Trigger                                          |
| -------------------------------- | ------------------------------------------------ |
| `brainstorming`                  | **HARD GATE** — any new feature/component        |
| `writing-plans`                  | Have requirements? Create PLAN.md first          |
| `executing-plans`                | Have PLAN.md? Execute with atomic commits        |
| `systematic-debugging`           | Any bug — find root cause BEFORE fixing          |
| `test-driven-development`        | Write tests before implementation                |
| `verification-before-completion` | Before ANY "done" claim — run verification first |
| `requesting-code-review`         | Before merging                                   |
| `receiving-code-review`          | Before implementing feedback                     |
| `finishing-a-development-branch` | Integration decision when impl is done           |
| `dispatching-parallel-agents`    | 2+ independent tasks                             |
| `using-git-worktrees`            | Feature work needing isolation                   |

### Engineering Specialties (`engineering-team/`)

`senior-frontend` · `senior-backend` · `senior-architect` · `senior-fullstack` · `senior-qa` · `senior-devops` · `senior-security` · `senior-secops` · `code-reviewer` · `playwright-pro` · `aws-solution-architect` · `ms365-tenant-manager` · `tdd-guide`

### Other Skill Packs

- `marketing-skill/` — 42 skills across 7 pods (content, SEO, CRO, channels, growth, intel, GTM)
- `c-level-advisor/` — 28 skills (CEO/CTO/CFO/CMO/CPO + board meetings + culture)
- `business-growth/` — customer-success-manager, revenue-operations, sales-engineer
- `product-team/` — product-manager-toolkit, agile-product-owner, ux-researcher-designer
- `project-management/` — senior-pm, scrum-master, jira-expert, confluence-expert
- `ra-qm-team/` — ISO 13485, MDR, FDA, ISO 27001, GDPR (12 skills)
- `finance/` — financial-analyst (DCF, ratio analysis, forecasting)
- `documentation/` — doc-coauthoring
- `design-md/` — Stitch → DESIGN.md synthesis
- `react-components/` — Stitch designs → Vite/React components

---

## Location 2: `C:/Users/tvarv/.claude/agents/` — GSD Orchestrators

12 agents for structured project delivery with goal-backward verification.

**Key workflow:** `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:verify-work`

| Agent                 | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `gsd-planner`         | Creates PLAN.md with task breakdown + goal-backward verification |
| `gsd-executor`        | Executes PLAN.md with atomic commits + deviation handling        |
| `gsd-verifier`        | Verifies goal achievement (not just task completion)             |
| `gsd-debugger`        | Scientific debugging with persistent state                       |
| `gsd-codebase-mapper` | Produces STACK.md, ARCHITECTURE.md, TESTING.md, CONCERNS.md      |
| `gsd-plan-checker`    | Validates plan will achieve goal before execution                |

---

## Location 3: `C:/Users/tvarv/.claude/commands/` — CLI Commands

| Command          | When                                          |
| ---------------- | --------------------------------------------- |
| `/git:cm`        | Stage + commit (no push)                      |
| `/git:cp`        | Stage + commit + push                         |
| `/git:pr`        | Create pull request                           |
| `/review`        | Quality gate: linting + validation            |
| `/security-scan` | Secret detection + dependency vulnerabilities |

**Workflow:** changes → `/review` → `/security-scan` → `/git:cp` → `/git:pr`

---

## Location 4: `C:/Users/tvarv/.claude/plugins/cache/claude-plugins-official/` — Anthropic Plugins

| Plugin            | Purpose                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `frontend-design` | **Auto-active.** Bold aesthetic direction. Avoids generic AI aesthetics. Use for ALL UI work. |

---

## Location 5: `.agents/skills/` — Project-Scoped Skills

| Skill                            | When                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `ui-ux-pro-max`                  | Any UI — 50 styles, 99 UX guidelines, pre-delivery checklist |
| `vercel-react-best-practices`    | React components — 40+ performance rules                     |
| `web-design-guidelines`          | Audit files against Vercel Web Interface Guidelines          |
| `verification-before-completion` | Iron Law before any completion claim                         |
| `writing-plans`                  | Multi-step task planning                                     |
| `executing-plans`                | Plan execution with review checkpoints                       |

---

## UI/Frontend Workflow

```
1. frontend-design      → aesthetic direction first
2. ui-ux-pro-max        → design system (palette, fonts, UX rules)
3. senior-frontend      → implement (React/TypeScript/Tailwind)
4. vercel-react-best-practices → check React performance
5. web-design-guidelines → audit accessibility + semantics
6. ui-ux-pro-max pre-delivery checklist → verify before commit
```

## GymGurus File → Skills Map

| File / Area              | Load These Skills                                                         |
| ------------------------ | ------------------------------------------------------------------------- |
| `client/src/components/` | `brainstorming` → `frontend-design` → `ui-ux-pro-max` → `senior-frontend` |
| `client/src/pages/`      | `ux-researcher-designer` + `ui-ux-pro-max` + `senior-frontend`            |
| `server/routes.ts`       | `senior-backend` + `code-reviewer`                                        |
| `shared/schema.ts`       | `database-designer`                                                       |
| Any bug                  | `systematic-debugging` first                                              |
| Any PR                   | `verification-before-completion` + `requesting-code-review`               |
| Any new feature          | `brainstorming` (HARD GATE)                                               |
