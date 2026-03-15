# CLAUDE.md — GymGurus Developer Reference

> Last updated: 2026-03-13 | Full skills inventory — 139+ skills across 5 locations including frontend-design plugin + ui-ux-pro-max

---

## Second Brain — Obsidian Knowledge System

This project uses `_brain/` as a shared knowledge base between Obsidian and Claude Code.

### On EVERY task — read first:

1. `_brain/maps/gymgurus-overview.md` — project orientation
2. `_brain/notes/gotchas.md` — hours of debugging stored here, check before touching anything
3. Any relevant note from `_brain/notes/` before starting work

### When you discover something new — write immediately:

- New gotcha → append to `_brain/notes/gotchas.md`
- New architectural decision → append to `_brain/notes/decisions.md`
- New pattern discovered → create `_brain/notes/[topic].md`

### When researching external libraries or APIs — always use webfetch:

- Fetch the official docs URL
- Save to `_brain/resources/[library-name].md` with source URL and fetch date at top
- Add entry to `_brain/maps/resources-index.md`
- NEVER rely on training data alone for library APIs — always fetch current docs first

### Zettelkasten rules:

- Every note is self-contained — readable without needing other notes
- Link related notes with `[[note-name]]` syntax
- Maps link, they do not explain
- Inbox is temporary — process into notes within the same session

---

## ⚡ CLAUDE CODE — MANDATORY PRE-TASK RITUAL

**Before writing a single line of code, run this checklist every session, every task:**

1. Read MEMORY.md — check memory for prior learnings from previous sessions
2. FULL SKILLS INVENTORY — check ALL FIVE locations:
   - `C:/Users/tvarv/.claude/skills/` ← 30 workflow + meta skills
   - `C:/Users/tvarv/.claude/agents/` ← 12 GSD orchestrator agents
   - `C:/Users/tvarv/.claude/commands/` ← git + review + security-scan CLI commands
   - `C:/Users/tvarv/.claude/plugins/cache/claude-plugins-official/frontend-design/` ← Anthropic frontend-design plugin (aesthetic direction for all UI)
   - `C:/Users/tvarv/Desktop/GymGurus - Copy/.agents/skills/` ← project-scoped: ui-ux-pro-max, vercel-react-best-practices, verification-before-completion, web-design-guidelines, writing-plans, executing-plans
     Engineering skills live in `C:/Users/tvarv/.claude/skills/engineering-team/` and `engineering/`
     Marketing skills live in `C:/Users/tvarv/.claude/skills/marketing-skill/`
     C-Level advisory in `C:/Users/tvarv/.claude/skills/c-level-advisor/`
     GSD project management in `C:/Users/tvarv/.claude/get-shit-done/workflows/`
3. MAP skills to the task — identify ALL relevant skills across ALL categories from ALL FOUR locations.
   A landing page task needs ui-ux-pro-max + marketing/seo + cro + psychology, not just senior-frontend.
   A DB task may need observability + runbook skills too.
   Report which skills you loaded from which location and what each contributes BEFORE acting.
4. Read every SKILL.md — use Read tool on every matched skill before writing any code
5. Check .claude/rules/ — read scoped rules matching your working files
6. Brainstorm first — for ANY new feature/component, read brainstorming/SKILL.md BEFORE coding.
   HARD GATE: no implementation until design is presented and approved.
7. Update MEMORY.md at end — write new patterns, fixes, and learnings from this session

**This is non-negotiable. Every task. Every time. No exceptions.**

**The core principle:** You have 139+ skills across engineering, GSD project management, marketing (42 skills/7 pods), C-level advisory (28 roles), RA/QM compliance, finance, design, and more — spread across FOUR locations. The right skills for any task are rarely just the obvious ones. Always inventory all four locations. Always report what you loaded.

---

## 🎨 Design & Frontend Skills — Full Reference

Five dedicated skills across 3 locations. Use ALL relevant ones for any UI/frontend task.

| Skill                             | Location                                                           | What it does                                                                                                                                                                      | When to use                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **`frontend-design`**             | `~/.claude/plugins/cache/claude-plugins-official/frontend-design/` | Generates distinctive, production-grade UI with bold aesthetic choices, creative typography, animations, spatial composition. Avoids generic AI aesthetics. Built by Anthropic.   | Any UI build task — components, pages, landing pages, dashboards. Goes first to set aesthetic direction.                             |
| **`ui-ux-pro-max`**               | `.agents/skills/ui-ux-pro-max/`                                    | 50 styles, 97 palettes, 57 font pairings, 99 UX guidelines, 25 chart types across 9 stacks. Has a pre-delivery checklist. Run `python3 scripts/search.py "query" --design-system` | After `frontend-design` direction is set. Use for palette/font/UX compliance checks. Run pre-delivery checklist before every commit. |
| **`web-design-guidelines`**       | `.agents/skills/web-design-guidelines/`                            | Fetches Vercel's Web Interface Guidelines and audits files against them (accessibility, aria, focus, keyboard nav, semantic HTML).                                                | Before committing UI code — run audit against guidelines source.                                                                     |
| **`vercel-react-best-practices`** | `.agents/skills/vercel-react-best-practices/`                      | 40+ rules on React performance: passive event listeners, bundle optimization, deduplication, memo, suspense.                                                                      | Any React component work — catches performance anti-patterns.                                                                        |
| **`senior-frontend`**             | `~/.claude/skills/engineering-team/senior-frontend/`               | React/Next.js/TypeScript/Tailwind. Bundle analysis, a11y, component scaffolding, Python automation tools.                                                                         | Implementation — component architecture, state management, performance optimization.                                                 |

**Workflow for any UI task:**

```
1. frontend-design      → commit to bold aesthetic direction first
2. ui-ux-pro-max        → get design system (palette, fonts, UX rules)
3. senior-frontend      → implement with React/TypeScript/Tailwind
4. vercel-react-best-practices → check React performance patterns
5. web-design-guidelines → audit accessibility + semantic HTML
6. ui-ux-pro-max pre-delivery checklist → verify before claiming done
```

**Supporting skills for design work:**

- `design-md` — analyze Stitch projects → synthesize DESIGN.md source of truth
- `react-components` — convert Stitch designs → modular Vite/React components (uses Stitch MCP)
- `brainstorming` — HARD GATE before any new component/page design
- `ux-researcher-designer` — persona generation, journey mapping, usability test plans

---

## 🗺️ Complete Skill Directory — 139+ Skills Across 4 Locations

### LOCATION 1: `C:/Users/tvarv/.claude/skills/` — Workflow & Meta Skills

#### Engineering Workflow (activate before ANY code task)

| Skill                            | When to use                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `brainstorming`                  | **HARD GATE** — any new feature/component. Present design, get approval FIRST |
| `writing-plans`                  | Have a spec/requirements? Use this BEFORE touching code to create PLAN.md     |
| `executing-plans`                | Have an approved PLAN.md? Use this to execute it with atomic commits          |
| `systematic-debugging`           | Any bug, test failure, or unexpected behavior — BEFORE proposing fixes        |
| `test-driven-development`        | Implementing any feature or bugfix — write tests BEFORE implementation        |
| `verification-before-completion` | Before ANY claim of "done" — run verification commands first                  |
| `requesting-code-review`         | Before merging — verify work meets requirements                               |
| `receiving-code-review`          | When getting feedback — before implementing suggestions                       |
| `finishing-a-development-branch` | Implementation complete, tests pass — guides integration decisions            |
| `dispatching-parallel-agents`    | 2+ independent tasks that can run without shared state                        |
| `subagent-driven-development`    | Executing plans with independent tasks in current session                     |
| `using-git-worktrees`            | Starting feature work needing isolation from current workspace                |
| `using-superpowers`              | Start of any conversation — establishes how to find and use skills            |
| `enhance-prompt`                 | Vague UI idea → polished Stitch-optimized prompt                              |
| `design-md`                      | Analyze Stitch projects → synthesize DESIGN.md design system                  |
| `react-components`               | Convert Stitch designs → modular Vite/React components                        |

#### Meta/Self-Improvement

| Skill                                       | When to use                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `self-improving-agent` (`engineering-team`) | `/si:review` · `/si:promote` · `/si:extract` — end of every session          |
| `writing-skills`                            | Creating new skills, editing existing skills, verifying skills before deploy |
| `agents`                                    | Reference skill for building multi-agent systems                             |
| `verification-before-completion`            | Iron Law: evidence before any completion claim                               |

#### Engineering Specialties (`engineering-team/` + `engineering/`)

| Skill                    | When to use                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `senior-architect`       | Architecture analysis, system design, dependency audit            |
| `senior-backend`         | Express routes, middleware, DB operations, API design             |
| `senior-frontend`        | React components, state, performance, bundle analysis             |
| `senior-fullstack`       | Cross-layer code quality + security scoring                       |
| `senior-qa`              | Testing strategy, coverage analysis, automation                   |
| `senior-devops`          | CI/CD, containers, infrastructure, monitoring                     |
| `senior-secops`          | Security ops, incident response, vulnerability management         |
| `senior-security`        | Threat modeling, pen testing, compliance, secure architecture     |
| `senior-data-scientist`  | ML, statistics, experiments, feature engineering                  |
| `senior-data-engineer`   | Data pipelines, ETL, data quality                                 |
| `senior-ml-engineer`     | Model deployment, MLOps, LLM integration                          |
| `senior-prompt-engineer` | Prompt optimization, A/B testing, evaluation                      |
| `senior-computer-vision` | CV models, YOLO, Detectron2, ONNX/TensorRT                        |
| `code-reviewer`          | PR analysis, quality metrics, auto-flags `as any` / `console.log` |
| `aws-solution-architect` | Lambda, API Gateway, ECS, CloudFormation IaC                      |
| `ms365-tenant-manager`   | M365 admin, PowerShell, Azure AD, Conditional Access              |
| `tdd-guide`              | TDD workflow, test-first design, acceptance testing               |
| `tech-stack-evaluator`   | Framework comparison, TCO analysis, ecosystem health              |
| `playwright-pro`         | E2E tests, `/pw:generate`, `/pw:fix`, `/pw:coverage`              |

#### Business & Growth (`business-growth/`)

| Skill                      | When to use                                                  |
| -------------------------- | ------------------------------------------------------------ |
| `customer-success-manager` | Customer health scoring, churn risk, expansion opportunities |
| `revenue-operations`       | Pipeline coverage, MAPE forecast, GTM efficiency             |
| `sales-engineer`           | RFP analysis, competitive matrix, POC planning               |

#### Product Management (`product-team/`)

| Skill                     | When to use                                               |
| ------------------------- | --------------------------------------------------------- |
| `product-manager-toolkit` | RICE prioritization, customer interview synthesis, PRD    |
| `agile-product-owner`     | User story generation, sprint planning, INVEST criteria   |
| `ux-researcher-designer`  | Persona generation, journey mapping, usability test plans |
| `scrum-master`            | Sprint facilitation, retrospectives, team coaching        |

#### Project Management (`project-management/`)

| Skill                 | When to use                                               |
| --------------------- | --------------------------------------------------------- |
| `senior-pm`           | WSJF, Monte Carlo simulation, EMV risk, portfolio health  |
| `jira-expert`         | Jira config, custom workflows, JQL, automation            |
| `confluence-expert`   | Knowledge bases, documentation strategy                   |
| `atlassian-admin`     | Atlassian suite admin, SSO, user provisioning             |
| `atlassian-templates` | Sprint planning, retrospective, project charter templates |

#### RA/QM Compliance (`ra-qm-team/`) — use for MedTech/regulated industries

| Skill                                   | When to use                              |
| --------------------------------------- | ---------------------------------------- |
| `regulatory-affairs-head`               | RA strategy, regulatory intelligence     |
| `quality-manager-qms-iso13485`          | ISO 13485 compliance, QMS                |
| `capa-officer`                          | CAPA system, root cause analysis         |
| `risk-management-specialist`            | ISO 14971, FMEA, risk analysis           |
| `information-security-manager-iso27001` | ISO 27001, ISMS, data protection         |
| `mdr-745-specialist`                    | EU MDR 2017/745, technical documentation |
| `fda-consultant-specialist`             | FDA 510(k), PMA, QSR                     |
| `gdpr-dsgvo-expert`                     | GDPR/DSGVO compliance, data privacy      |

#### Finance (`finance/`)

| Skill               | When to use                                                 |
| ------------------- | ----------------------------------------------------------- |
| `financial-analyst` | DCF valuation, ratio analysis, budget variance, forecasting |

#### Documentation, Standards, Templates

| Skill             | When to use                                                  |
| ----------------- | ------------------------------------------------------------ |
| `doc-coauthoring` | 3-stage documentation: context → refinement → reader testing |
| `standards`       | Code standards, style guides, quality gates                  |
| `templates`       | Ready-to-use templates across domains                        |

#### C-Level Advisory (`c-level-advisor/`) — 28 skills

**Roles:** `ceo-advisor`, `cto-advisor`, `coo-advisor`, `cpo-advisor`, `cmo-advisor`, `cfo-advisor`, `cro-advisor`, `ciso-advisor`, `chro-advisor`, `executive-mentor`

**Orchestration:** `cs-onboard` (setup), `chief-of-staff` (router), `board-meeting` (multi-role deliberation), `decision-logger`

**Cross-cutting:** `board-deck-builder`, `scenario-war-room`, `competitive-intel`, `org-health-diagnostic`, `ma-playbook`, `intl-expansion`

**Culture:** `culture-architect`, `company-os`, `founder-coach`, `strategic-alignment`, `change-management`, `internal-narrative`

Start with `/cs:setup` first time, then use `chief-of-staff` to route questions.

#### Marketing (`marketing-skill/`) — 42 skills across 7 pods

Start with `marketing-ops` skill to route to the correct specialist. Available pods:

| Pod                  | Skills                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Content** (8)      | content-strategy, content-production, content-editing, humanizer, social-media, brand-voice, repurposing, writing |
| **SEO** (5)          | traditional-seo, ai-seo (AEO/GEO), schema-optimizer, site-architecture, technical-seo                             |
| **CRO** (6)          | page-optimizer, form-conversion, signup-flows, onboarding, popups, paywall-design                                 |
| **Channels** (5)     | email-sequences, paid-advertising, cold-email, ad-creative, social-media-mgmt                                     |
| **Growth** (4)       | ab-testing, referral-programs, free-tools-acquisition, churn-prevention                                           |
| **Intelligence** (4) | competitor-analysis, marketing-psychology, analytics-tracking, campaign-measurement                               |
| **Sales/GTM** (2)    | pricing-strategy, launch-planning                                                                                 |

---

### LOCATION 2: `C:/Users/tvarv/.claude/agents/` — GSD Orchestrator Agents

The GSD system (Get Shit Done v1.22.4) is a structured project delivery framework with goal-backward verification. Use `/gsd:*` commands to activate.

| Agent                      | Purpose                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `gsd-planner`              | Creates PLAN.md with task breakdown, dependency analysis, goal-backward verification |
| `gsd-executor`             | Executes PLAN.md with atomic commits, deviation handling, checkpoint protocol        |
| `gsd-verifier`             | Verifies phase goal achievement — checks codebase delivers what was promised         |
| `gsd-plan-checker`         | Validates plan WILL achieve goal before execution starts                             |
| `gsd-debugger`             | Scientific debugging with persistent state across sessions                           |
| `gsd-codebase-mapper`      | Produces STACK.md, ARCHITECTURE.md, TESTING.md, CONCERNS.md                          |
| `gsd-roadmapper`           | Creates project roadmap with phases, success criteria, coverage validation           |
| `gsd-phase-researcher`     | Researches phase requirements and dependencies before planning                       |
| `gsd-project-researcher`   | Researches existing codebase context (tech, arch, quality, concerns)                 |
| `gsd-integration-checker`  | Verifies cross-phase integration and E2E user workflows                              |
| `gsd-nyquist-auditor`      | Audits plan completeness (sufficient detail for execution without guessing)          |
| `gsd-research-synthesizer` | Synthesizes multiple research docs into actionable planner context                   |

**GSD slash commands** (30+ available): `/gsd:new-project`, `/gsd:plan-phase`, `/gsd:execute-phase`, `/gsd:debug`, `/gsd:verify-work`, `/gsd:progress`, `/gsd:health`, `/gsd:map-codebase` and more.

---

### LOCATION 3: `C:/Users/tvarv/.claude/commands/` — CLI Commands

| Command          | When to use                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| `/git:cm`        | Stage + commit (no push) with conventional commit message                            |
| `/git:cp`        | Stage + commit + push to origin                                                      |
| `/git:pr`        | Create pull request from current branch                                              |
| `/review`        | Local quality gate: YAML linting, workflow validation, Python syntax, Markdown links |
| `/security-scan` | Secret detection (Gitleaks) + dependency vulnerabilities (Safety)                    |

**Workflow:** Make changes → `/review` → `/security-scan` → `/git:cp` → `/git:pr`

---

### LOCATION 4: `C:/Users/tvarv/Desktop/GymGurus - Copy/.agents/skills/` — Project-Scoped Skills

| Skill                            | When to use                                                       |
| -------------------------------- | ----------------------------------------------------------------- |
| `ui-ux-pro-max`                  | Any UI work — 50 styles, 99 UX guidelines, pre-delivery checklist |
| `vercel-react-best-practices`    | React/Next.js performance, bundle optimization, 40+ rules         |
| `verification-before-completion` | Iron Law before ANY completion claim                              |
| `web-design-guidelines`          | Web interface design standards                                    |
| `writing-plans`                  | Creating PLAN.md files for multi-step tasks                       |
| `executing-plans`                | Executing approved plans with review checkpoints                  |
| `nano-banana`                    | (check SKILL.md for description)                                  |

---

## 🗺️ GymGurus Task → Skill Quick Reference

### Engineering Skills (activate before ANY code task)

| Task                      | Skill                                            | Key Command / Capability                                                  |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| **Any new feature**       | `brainstorming`                                  | HARD GATE — present design, get approval BEFORE implementing              |
| **Code review / PR**      | `code-reviewer` + `pr-review-expert`             | `python scripts/code_quality_checker.py ./server --language typescript`   |
| **Architecture analysis** | `senior-architect`                               | `python scripts/project_architect.py . --verbose`                         |
| **Dependency audit**      | `senior-architect` + `dependency-auditor`        | `python scripts/dependency_analyzer.py . --verbose` + CVE + license scan  |
| **Tech debt**             | `tech-debt-tracker` + `cto-advisor`              | Debt scanner → WSJF prioritizer → dashboard                               |
| **Backend / Express**     | `senior-backend`                                 | `python scripts/api_scaffolder.py` · security hardening workflow          |
| **Frontend / React**      | `senior-frontend` + `frontend-design`            | Bundle analysis · a11y · component scaffolding                            |
| **Fullstack changes**     | `senior-fullstack`                               | Code quality + security scoring across full stack                         |
| **DB schema changes**     | `database-designer` + `database-schema-designer` | Schema analyzer · Expand-Contract migrations · RLS · index optimizer      |
| **API design**            | `api-design-reviewer`                            | REST conventions · breaking change detection · design scorecard           |
| **API tests**             | `api-test-suite-builder` + `playwright-pro`      | Route scanner → test scaffold · `/pw:generate`                            |
| **Stripe / billing**      | `stripe-integration-expert`                      | Subscription state machine · idempotent webhooks                          |
| **CI/CD pipeline**        | `ci-cd-pipeline-builder`                         | Stack detection → GitHub Actions / GitLab CI generation                   |
| **Observability**         | `observability-designer`                         | SLI/SLO design · golden signals · burn rate alerting                      |
| **Performance**           | `performance-profiler`                           | Flamegraphs · bundle analysis · EXPLAIN ANALYZE · k6 load tests           |
| **Security audit**        | `skill-security-auditor` + `env-secrets-manager` | Secret leak scan · .env lifecycle · rotation workflow                     |
| **Incident response**     | `incident-commander`                             | `python scripts/incident_classifier.py` · PIR generation                  |
| **Runbooks**              | `runbook-generator`                              | Stack detection → deployment/incident/DB runbooks                         |
| **Email templates**       | `email-template-builder`                         | React Email templates · Resend/Postmark/SES integration                   |
| **AI features (RAG)**     | `rag-architect`                                  | Chunking strategies · embedding benchmarks · retrieval eval               |
| **Multi-agent design**    | `agent-designer` + `agent-workflow-designer`     | Supervisor/swarm/pipeline/hierarchical patterns                           |
| **3+ independent bugs**   | `dispatching-parallel-agents`                    | `Task()` per independent domain — parallel execution                      |
| **MCP integration**       | `mcp-server-builder`                             | OpenAPI → MCP tool definitions · validation                               |
| **Memory curation**       | `self-improving-agent`                           | `/si:review` · `/si:promote` · `/si:extract`                              |
| **Skill validation**      | `skill-tester` + `skill-security-auditor`        | Structure compliance · quality scoring · security gate                    |
| **AWS migration**         | `aws-solution-architect`                         | Lambda · API Gateway · ECS · CloudFormation IaC                           |
| **Prompt improvement**    | `prompt-engineer-toolkit`                        | A/B eval · versioned prompt templates · quality scoring                   |
| **UI visual design**      | `frontend-design` + `ui-ux-pro-max`              | Intentional aesthetic · 99 UX guidelines · pre-delivery checklist         |
| **Design system**         | `design-md`                                      | `DESIGN.md` synthesis from existing screens                               |
| **Web artifacts**         | `web-artifacts-builder` + `react-components`     | Multi-component React artifacts · shadcn/ui · Stitch designs → components |
| **Any bug**               | `systematic-debugging`                           | Scientific method debugging — BEFORE proposing fixes                      |
| **Multi-step plan**       | `writing-plans` + `executing-plans`              | PLAN.md creation → atomic execution with checkpoints                      |
| **Branch complete**       | `finishing-a-development-branch`                 | Integration decision guide when implementation is done                    |
| **Before any commit**     | `verification-before-completion`                 | Iron Law: run verification BEFORE claiming done                           |
| **Marketing copy/SEO**    | `marketing-skill` (route via `marketing-ops`)    | 42 skills across 7 pods: content, SEO, CRO, channels, growth, intel, GTM  |
| **Financial analysis**    | `finance/financial-analyst`                      | DCF valuation · ratio analysis · budget variance · forecasting            |
| **MedTech compliance**    | `ra-qm-team`                                     | ISO 13485 · MDR · FDA · ISO 27001 · GDPR — 12 specialist roles            |
| **Structured project**    | GSD system (via `/gsd:*` commands)               | `/gsd:plan-phase` → `/gsd:execute-phase` → `/gsd:verify-work`             |
| **Prompt refinement**     | `enhance-prompt`                                 | Vague idea → Stitch-optimized implementation-ready prompt                 |

### Product & Project Management Skills

| Task                       | Skill                                  | Key Capability                                              |
| -------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| **Sprint planning**        | `agile-product-owner` + `scrum-master` | INVEST stories · Given/When/Then · velocity forecasting     |
| **Feature prioritization** | `product-manager-toolkit`              | RICE · customer interview synthesis · PRD templates         |
| **Project health**         | `senior-pm`                            | WSJF · Monte Carlo simulation · EMV risk · portfolio health |
| **UX research**            | `ux-researcher-designer`               | Persona generation · journey mapping · usability test plans |
| **Documentation**          | `doc-coauthoring`                      | 3-stage: context → refinement → reader testing              |
| **Customer metrics**       | `customer-success-manager`             | `python scripts/health_score_calculator.py` · churn risk    |
| **Revenue tracking**       | `revenue-operations`                   | Pipeline coverage · MAPE forecast · GTM efficiency          |
| **Sales support**          | `sales-engineer`                       | RFP analysis · competitive matrix · POC planning            |

### Leadership & Strategy Skills

| Task                     | Skill              | Key Capability                                                       |
| ------------------------ | ------------------ | -------------------------------------------------------------------- |
| **Tech strategy / debt** | `cto-advisor`      | `python scripts/tech_debt_analyzer.py` · DORA metrics · team scaling |
| **Business strategy**    | `ceo-advisor`      | `python scripts/strategy_analyzer.py` · financial scenario modeling  |
| **Hard decisions**       | `executive-mentor` | Pre-mortem · adversarial stress-test · board prep                    |
| **Founder growth**       | `founder-coach`    | Delegation frameworks · burnout · IC→CEO transition                  |
| **Market expansion**     | `intl-expansion`   | Market scoring matrix · entry modes · localization                   |

### Infrastructure & DevOps Skills

| Task              | Skill                    | Key Capability                                          |
| ----------------- | ------------------------ | ------------------------------------------------------- |
| **Secrets / env** | `env-secrets-manager`    | Git history secret scan · rotation playbook · Vault/SSM |
| **M365 admin**    | `ms365-tenant-manager`   | PowerShell bulk ops · Conditional Access · Azure AD     |
| **CV / imaging**  | `senior-computer-vision` | YOLO · Detectron2 · ONNX/TensorRT deployment            |

---

## GymGurus — Skill Activation by File Area

When Claude Code opens a file in this repo, activate these skills:

| File / Area                      | Activate                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `server/routes.ts`               | `senior-backend` + `code-reviewer` + `api-design-reviewer`                   |
| `server/routes/*.ts` (new route) | `brainstorming` → `api-test-suite-builder` → `senior-backend`                |
| `shared/schema.ts`               | `database-designer` + `database-schema-designer`                             |
| `server/migrations/`             | `database-designer` (Expand-Contract pattern)                                |
| `client/src/App.tsx`             | `senior-frontend` + `code-reviewer`                                          |
| `client/src/components/`         | `brainstorming` → `ui-ux-pro-max` → `frontend-design` → `senior-frontend`    |
| `client/src/pages/`              | `ux-researcher-designer` (journey map) + `ui-ux-pro-max` + `senior-frontend` |
| `server/routes/webhooks.ts`      | `stripe-integration-expert` — DO NOT TOUCH middleware order                  |
| `server/middleware/`             | `skill-security-auditor` + `senior-backend`                                  |
| `server/services/aiService.ts`   | `rag-architect` + `prompt-engineer-toolkit`                                  |
| `.env` / env vars                | `env-secrets-manager`                                                        |
| `package.json`                   | `dependency-auditor` (CVE + license scan before adding deps)                 |
| `playwright.config.ts` / tests   | `playwright-pro` (`/pw:generate`, `/pw:fix`, `/pw:coverage`)                 |
| `.github/workflows/`             | `ci-cd-pipeline-builder`                                                     |
| Any PR                           | `pr-review-expert` + `code-reviewer`                                         |
| Any incident                     | `incident-commander`                                                         |
| Any new AI feature               | `rag-architect` + `agent-designer` + `prompt-engineer-toolkit`               |

---

## Architecture Map

```
gym-gurus/
├── client/src/
│   ├── App.tsx                    ← 1,105-line God component  → § FE-1
│   ├── components/
│   │   ├── redesign/              ← mobile-first component set — production code, actively maintained
│   │   ├── ui/                    ← shadcn/ui — do not edit
│   │   └── ProgressChart*.tsx     ← deleted (all 3 were dead code) → § FE-4 ✅
│   ├── contexts/UserContext.tsx   ← canonical auth state
│   ├── hooks/                     ← useUser() is the correct hook
│   └── pages/
├── server/
│   ├── routes.ts                  ← 2,252-line monolith       → § BE-3
│   ├── mockData.ts                ← DELETE IMMEDIATELY        → § SEC-1
│   ├── env.ts                     ← DUPLICATE — delete        → § BE-4
│   ├── config/env.ts              ← canonical env (KEEP)
│   ├── middleware/
│   │   ├── auth.ts                ← DO NOT TOUCH
│   │   └── csrf.ts                ← DO NOT TOUCH
│   └── routes/
│       └── webhooks.ts            ← DO NOT TOUCH
├── shared/schema.ts               ← DO NOT TOUCH w/o migration
├── scripts/                       ← debug scripts live here, NOT server/
└── server/migrations/             ← numbering chaos → § DB-4
```

**Roles** — use consistently everywhere:

| DB value  | UI name  | Login                                             |
| --------- | -------- | ------------------------------------------------- |
| `trainer` | Guru     | `/auth/login` role: Guru                          |
| `solo`    | Ronin    | `/auth/login` role: Ronin                         |
| `client`  | Disciple | `/disciple-login` — **currently broken** → § VA-1 |

**Plan display names** — never show raw IDs:

| DB/Stripe ID | Display    |
| ------------ | ---------- |
| `FreeTrial`  | Free Trial |
| `Solo`       | Ronin      |
| `Solo_ai`    | Ronin AI   |
| `Guru`       | Guru       |
| `ProGuru`    | Pro Guru   |

---

## Stack

| Layer    | Tech                                                                                   | Relevant Skill                                               |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Frontend | React 18, Vite, TypeScript, Tailwind, shadcn/ui, wouter, TanStack Query, framer-motion | `senior-frontend`, `frontend-design`                         |
| Backend  | Express.js, TypeScript, Drizzle ORM                                                    | `senior-backend`, `senior-architect`                         |
| Database | PostgreSQL (Neon)                                                                      | `database-designer`, `database-schema-designer`              |
| Payments | Stripe                                                                                 | `stripe-integration-expert`                                  |
| AI       | Anthropic Claude API                                                                   | `rag-architect`, `prompt-engineer-toolkit`, `agent-designer` |
| Hosting  | Railway                                                                                | `runbook-generator`, `ci-cd-pipeline-builder`                |
| Testing  | Playwright (scripts/visual-audit.ts)                                                   | `playwright-pro`                                             |
| Mobile   | Capacitor (planned, config broken)                                                     | `senior-fullstack`                                           |

---

## Environment Variables

| Variable                  | Required | Skill to consult                                      |
| ------------------------- | -------- | ----------------------------------------------------- |
| `DATABASE_URL`            | ✅       | `env-secrets-manager`                                 |
| `NODE_ENV`                | ✅       | `env-secrets-manager`                                 |
| `SESSION_SECRET`          | ✅       | `env-secrets-manager` — rotate if leaked              |
| `APP_URL`                 | ✅       | `env-secrets-manager`                                 |
| `ANTHROPIC_API_KEY`       | ✅       | `env-secrets-manager` — server-side ONLY              |
| `STRIPE_SECRET_KEY`       | ✅       | `stripe-integration-expert` + `env-secrets-manager`   |
| `STRIPE_WEBHOOK_SECRET`   | ✅       | `stripe-integration-expert` — silently fails if unset |
| `GOOGLE_CLIENT_ID/SECRET` | ⬜       | OAuth — `env-secrets-manager`                         |

Run `env-secrets-manager` leak detection against git history before every release:

```bash
python scripts/secret_leak_detector.py . --scan-git-history
```

---

## Code Patterns to Follow

**Auth state** — `useUser()` from UserContext only:

```ts
const { user } = useUser();          // ✅
const { data: user } = useQuery(…);  // ❌ isolated, creates race conditions
```

**Typed user** — AuthUser interface, never `as any`:

```ts
// Define in client/src/types/auth.ts
export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'trainer' | 'solo' | 'client';
  planId: string;
}
const user = useUser() as AuthUser; // ✅
const user = useUser() as any; // ❌ — code-reviewer flags this
```

**Route wrapping** — lazyRoute factory, not copy-paste:

```ts
const lazyRoute = (C: React.LazyExoticComponent<any>) => () => (
  <Suspense fallback={<PageLoader />}><PageTransition><C /></PageTransition></Suspense>
);
<Route path="/calculators/tdee" component={lazyRoute(TDEECalculator)} />
```

**New API routes** — always: Zod validation + ownership guard + test:

```ts
router.get('/clients/:id', requireTrainerOwnership, async (req, res) => {
  const { id } = z.object({ id: z.coerce.number() }).parse(req.params);
});
```

**DB queries** — Drizzle ORM always, never raw SQL:

```ts
db.select().from(users).where(eq(users.trainerId, id)); // ✅
db.execute(sql`SELECT * FROM users WHERE …`); // ❌
```

**Adding dependencies** — always audit first:

```bash
python scripts/dependency_auditor.py . --check cve,license
# Only add after clean audit
```

**New feature workflow** — always brainstorm first:

```
1. Activate `brainstorming` skill
2. Explore context → ask clarifying questions → propose 2-3 approaches
3. Write design doc to docs/plans/YYYY-MM-DD-feature-design.md
4. Get approval → then implement
```

---

## DO NOT TOUCH — Security-Critical Files

| File                        | Reason                     | Skill if changes needed                     |
| --------------------------- | -------------------------- | ------------------------------------------- |
| `shared/schema.ts`          | Requires migration         | `database-designer`                         |
| `server/middleware/csrf.ts` | WebSocket skip intentional | `skill-security-auditor` review first       |
| `server/middleware/auth.ts` | Ownership guards           | `skill-security-auditor` + `senior-backend` |
| `server/routes/webhooks.ts` | Stripe raw body order      | `stripe-integration-expert`                 |

---

## Issues — Priority Order

### § SEC-1 — CRITICAL: Mock data in production

**Skills:** `code-reviewer` (PR Analyzer detects "debug patterns") + `skill-security-auditor`

`server/mockData.ts` → `getMockClients`, `getMockProgress`, `getMockAnalytics`, `getMockDashboardStats` used as live fallbacks in `routes.ts` lines 58–62, 420, 435, 1727, 1831.

```bash
rm server/mockData.ts
# Replace all getMock* fallbacks → res.status(500).json({ error: 'Internal server error' })
```

---

### § SEC-2 — CRITICAL: Silent MemoryStorage fallback

**Skill:** `incident-commander` (this is an invisible data-loss incident waiting to happen)

DB failure → silent in-memory fallback → no 503 → data lost on restart.

```ts
if (process.env.NODE_ENV === 'production') {
  throw new Error('DB unavailable — refusing memory storage fallback');
}
```

---

### § SEC-3 — CRITICAL: CSP `unsafe-inline`

**Skill:** `skill-security-auditor` + `env-secrets-manager`

`server/index.ts` helmet config: `scriptSrc: ["'self'", "'unsafe-inline'"]` — XSS protection completely negated.

```ts
scriptSrc: ["'self'", `'nonce-${generateNonce()}'`],
```

---

### § SEC-5 — ✅ RESOLVED (2026-03-10): CSP nonce for inline role-flash script

**Root cause:** The role-flash prevention IIFE in `client/index.html` (§UX-3) used an inline `<script>` tag which violated the `scriptSrc: ["'self'"]` CSP set in §SEC-3.

**Fix:**

1. `server/index.ts` — added `crypto.randomBytes(16).toString('base64')` nonce middleware before helmet; updated `scriptSrc` directive to use `(_req, res) => \`'nonce-\${res.locals.cspNonce}'\``
2. `server/vite.ts` — `serveStatic` now uses `{ index: false }` on `express.static`, reads `index.html`, replaces `{{NONCE}}` with `res.locals.cspNonce`, and sends the modified HTML; dev `setupVite` handler also replaces the placeholder before Vite transforms
3. `client/index.html` — added `nonce="{{NONCE}}"` attribute to the blocking script tag

---

### § SEC-4 — HIGH: Debug routes in production

**Skill:** `skill-security-auditor`

`/test-login`, `/login2`, `/test-auth-login`, `/preview-login` accessible with no env guard. `TestLoginPage` bundled for ALL users (non-lazy import).

```ts
if (process.env.NODE_ENV !== 'production') { app.get('/test-login', …); }
if (import.meta.env.DEV) { /* client-side debug routes */ }
```

---

### § VA-1 — ✅ RESOLVED (2026-03-15): `/disciple-login` fixed and verified in production

**Root causes fixed:**

1. `UserContext.tsx` missing `/disciple-login` in `isPublicPage` list — caused unnecessary auth API call that triggered redirect
2. `server/services/accessCode.ts` — UNIQUE constraint on `clientId` caused access code regeneration to fail; fixed with `INSERT ... ON CONFLICT (clientId) DO UPDATE` upsert
3. `DiscipleLoginPage.tsx` — added `queryClient.invalidateQueries` after `setQueryData` to ensure auth state propagates correctly

**Verified:** Playwright screenshot confirms code `GG-WQVD-KAJX` submits → navigates to `/dashboard` → Disciple dashboard loads with teal theme. E2E regression test: `e2e/disciple-login.spec.ts`.

---

### § VA-4b — ✅ RESOLVED (2026-03-10): Settings page shows display role name

`getRoleDisplayName()` already existed in `client/src/lib/roles.ts`. Added import to `SettingsPage.tsx` and replaced `{user?.role}` (with CSS `capitalize`) at line 468 with `{getRoleDisplayName(user.role as InternalRole)}`. Settings now shows "Ronin", "Guru", or "Disciple" instead of the raw DB value.

---

### § BE-7 — ✅ RESOLVED (2026-03-10): Guru dashboard fetching wrong URL

**Root cause:** `Dashboard.tsx` `queryFn` called `fetch('/api/clients/${user?.id}?noPagination=true')`. No route `GET /api/clients/:id` exists — the UUID path fell through to the SPA catch-all `app.use('*', res.sendFile('index.html'))`, returning HTML → JSON.parse threw "Unexpected token '<'".

**Fix:** Changed URL to `/api/clients` (the correct route), updated `queryKey` from `['/api/clients', user?.id, 'noPagination']` → `['/api/clients']`, and updated all 3 WebSocket `queryClient.invalidateQueries` calls to remove stale `user?.id` suffixes. Not a server bug — client-side wrong URL construction.

---

### § VA-6 / VA-7 — HIGH: Personal data and QA artifacts in production

**Skill:** `env-secrets-manager` (data hygiene) + `senior-pm` (launch blocker)

Dashboard shows a personal birthday photo and "QA18 Set Count Test" workout. Purge before any public launch, investor demo, or press coverage.

---

### § FE-1 — HIGH: App.tsx is a 1,105-line God component

**Skills:** `code-reviewer` (large file flag) + `senior-architect` (mixed concerns) + `brainstorming` (design the split first)

```bash
python scripts/project_architect.py ./client/src --check layers
# Will flag: MIXED CONCERNS in App.tsx — routing + auth + video + CSS injection + layout
```

Extract to: `RouterConfig.tsx` · `AuthGuard.tsx` · `AppShell.tsx` · App.tsx → ~30 lines.

---

### § FE-2 — HIGH: 26 copy-pasted Suspense wrappers

**Skill:** `code-reviewer` (duplicate code detector — >3 similar blocks = flag)

```ts
const lazyRoute = (C: React.LazyExoticComponent<any>) => () => (
  <Suspense fallback={<PageLoader />}><PageTransition><C /></PageTransition></Suspense>
);
```

---

### § BE-3 — HIGH: `server/routes.ts` is 2,252 lines

**Skills:** `senior-architect` + `tech-debt-tracker` (highest interest rate item) + `code-reviewer`

Use **Strangler Fig** pattern (`tech-debt-tracker` refactoring strategies): extract one feature router per PR, never all at once.

```
server/routes/clients.ts    server/routes/workouts.ts
server/routes/progress.ts   server/routes/dashboard.ts
server/routes/assignments.ts server/routes/payments.ts
server/routes/schedule.ts   server/routes/calculators.ts
```

---

### § FE-3 — ✅ RESOLVED (2026-03-08): `redesign/` migration complete

All 9 `redesign/` components are production code (coach/, dashboard/, execution/ subdirs). The 5 original dead-code files were deleted (1,428 lines removed):

- `solo-dashboard/TodaysActionZone.tsx`
- `solo-dashboard/HeroHeader.tsx`
- `solo-dashboard/FeatureWidgetsGrid.tsx`
- `workout/RestTimerDisplay.tsx`
- `workout/SetCompletionSwipe.tsx`

`redesign/WeekStrip` + `solo-dashboard/WeeklyOverview` are an intentional desktop/mobile pair — keep both.

---

### § FE-4 — ✅ RESOLVED (2026-03-08): Three ProgressChart versions deleted

All three orphaned chart components deleted (325 lines total):

- `ProgressChart.tsx` (144 ln) — recharts, generic props — dead, only referenced by LazyProgressChart
- `ProgressChartTremor.tsx` (139 ln) — @tremor/react, never installed, not imported anywhere
- `LazyProgressChart.tsx` (42 ln) — Suspense wrapper for the above — not imported anywhere

`ProgressPage.tsx` renders all charts inline (~252 lines of custom recharts code with gradients, glow filters, per-role colors). `ClientDetailsPage.tsx` also has its own inline recharts. Neither ever used any of the three component files.

`@tremor/react` was not in package.json (ProgressChartTremor.tsx imported it but the package was never installed — its deletion also removes a phantom broken import).

---

### § FE-5 — MEDIUM: 17 `as any` casts

**Skill:** `code-reviewer` (auto-detects TypeScript `any`) + `senior-frontend`

```bash
python scripts/pr_analyzer.py . --json | grep '"any_types"'
```

Define `AuthUser` in `client/src/types/auth.ts`, replace all `as any`.

---

### § FE-6 — MEDIUM: Isolated auth `useQuery` in 3 places

**Skill:** `senior-frontend` + `code-reviewer` (duplicate pattern detection)

Delete all standalone `useQuery({ queryKey: ['/api/user'] })`. Use `useUser()` everywhere.

---

### § FE-7 — ✅ PARTIALLY RESOLVED (2026-03-10): framer-motion reduced from 116 files

**Skill:** `performance-profiler` (bundle analysis) + `senior-frontend`

Removed framer-motion from 28 files in 3 targeted fixes:

1. **RouterConfig.tsx** — removed PageTransition/AnimatePresence, replaced with CSS `animate-in fade-in duration-200`. Breaks the `App.tsx → RouterConfig → AnimationComponents → framer-motion` eager import chain.
2. **LoadingFallback.tsx** — replaced animated spinner with `animate-spin` + `animate-pulse`.
3. **All 26 calculator files** (13 regular + 13 premium including both hubs) — replaced `motion.div/button` with plain divs/buttons + Tailwind `animate-in`, `hover:scale-*`, `transition-transform`, `transition-[width]` classes.

**Remaining:** vendor-motion (38.44 kB gzipped) still appears in `modulepreload` due to `AppShell.tsx` → `AppSidebar/AppHeader/AuthGuard` → framer-motion chain. Eliminating this requires refactoring those core layout components — a larger task.

To complete: remove framer-motion from `AppSidebar.tsx`, `AppHeader.tsx`, `AuthGuard.tsx`, and the remaining ~55 decorative pages that use trivial opacity fades.

---

### § BE-4 — MEDIUM: Duplicate env validators

**Skill:** `env-secrets-manager`

Delete `server/env.ts`. Keep `server/config/env.ts`. Update all imports.

---

### § BE-5 — MEDIUM: Debug scripts in `server/`

**Skill:** `runbook-generator` (move to scripts/ and generate proper runbooks for each)

Move to `scripts/`: `checkAppointments.ts`, `checkAssignments.ts`, `checkClient.ts`, `checkLatestAppointment.ts`, `deleteDuplicate.ts`, `updateClientsBiometrics.ts`, `runMigration.ts`, `runMigrations.ts`, `fix-session-table.ts`

```ts
if (process.env.NODE_ENV === 'production') {
  process.exit(1);
}
```

---

### § BE-6 — MEDIUM: Dead shopping feature

**Skill:** `agile-product-owner` (backlog decision — add to sprint or delete)

`server/routes/shopping.ts` + commented import. Run `product-manager-toolkit` RICE scoring to decide priority.

---

### § DB-1 — ✅ RESOLVED: `updatedAt` not auto-updating

Added `.$onUpdate(() => new Date())` to all `updatedAt` columns in `shared/schema.ts` (36 tables, replace_all). ORM-level only — no SQL migration generated.

---

### § DB-2 — ✅ RESOLVED: Height/weight as DECIMAL strings

`clients.height` and `clients.weight` changed from `decimal()` → `doublePrecision()` in schema. Migration `migrations/0002_clients_height_weight_to_double.sql` applied with explicit `USING` cast. Removed `parseFloat(... as string)` from `ClientCard.tsx`, `ClientDetailsPage.tsx` (2 call sites). Form init in `ClientFormModal.tsx` updated to `String(client.height)`.

---

### § DB-3 — ✅ RESOLVED: No soft deletes

Added `deletedAt: timestamp('deleted_at')` to `users` and `clients` tables. Migration `migrations/0001_add_soft_deletes_and_onupdate.sql` applied. `isNull(x.deletedAt)` filters added to 16 query sites across 8 files: `storage.ts` (4), `auth.ts` (1), `routes.ts` (3), `routes/settings.ts` (1), `routes/payments.ts` (1), `services/accessCode.ts` (5), `services/aiService.ts` (2), `services/aiUsage.ts` (1).

---

### § DB-4 — MEDIUM: Migration numbering chaos

**Skill:** `database-designer`

Rename `add_onboarding_table.ts` → `005_add_onboarding_table.ts`. Commit to `.ts` format. Never rename files already in `migrations/meta/_journal.json`. ✅ Done — already renamed to `server/migrations/005_add_onboarding_table.ts`.

---

### § DB-5 — HIGH: 20 DB tables have no Drizzle schema definition

**Skill:** `database-designer` + `database-schema-designer`

The database (via `migrations/0000_burly_yellow_claw.sql`) has 33+ tables. `shared/schema.ts` only defines 13 of them. The 20 unmanaged tables:

`achievements`, `ai_chat_conversations`, `ai_chat_messages`, `ai_generated_workouts`, `ai_usage`, `client_access_codes`, `client_intake`, `notifications`, `payment_plans`, `payments`, `personal_record_history`, `personal_records`, `saved_meal_plans`, `user_achievements`, `user_fitness_profile`, `user_gamification`, `user_muscle_fatigue`, `user_muscle_volume`, `user_strength_standards`, `workout_recovery_log`, `workout_sessions`, `workout_set_logs`, `xp_transactions`

Consequence: `$onUpdate`, soft deletes, and future schema changes cannot be applied to these tables via Drizzle. `drizzle-kit generate` will also produce incorrect diffs (tries to DROP tables it doesn't know about). Reverse-engineer all 20 into schema.ts and run `npx drizzle-kit generate` to re-sync.

---

### § UX-1 — ✅ RESOLVED (2026-03-09): Carousel → scrollable landing page

Replaced JS `AnimatePresence` carousel with 6 vertically-stacked `<section id="...">` sections.
Login moved to dedicated `/auth/login` route — `LoginCarouselPage.tsx` deleted.
`PageCarousel.tsx` deleted. `LandingHeader` converted to static anchor-link nav.
All 5 `carousel:navigate` dispatches replaced: `page:5` → `window.location.href='/auth/login'`,
`page:4` (Enterprise Contact) → `scrollIntoView('#contact')`.
Fixed simultaneously: CRO (login has URL, browser nav works), SEO (all 6 sections crawler-visible),
Performance (carousel JS off critical path).
Post-launch: section reorder A/B test + scroll-depth audit documented in `docs/plans/2026-03-09-ux1-carousel-to-scroll.md`.

---

### § UX-2 — HIGH: Login buried / Disciple login broken

**Skill:** `ux-researcher-designer` + `playwright-pro` (`/pw:generate` login flow tests)

Add Login button to `LandingHeader.tsx`. Fix `/disciple-login` route (§ VA-1).

---

### § UX-3 — ✅ RESOLVED (2026-03-09): Role CSS flash eliminated

**Root cause:** `:root` defaults match `.role-guru` (gold), so ronin/disciple users saw gold→purple/teal flash during auth API round-trip.

**Fix:**

1. `client/index.html` — blocking inline script before React hydrates reads `localStorage.getItem('gg_role')` and applies role class synchronously
2. `client/src/components/AuthGuard.tsx` — persists `user.role` to `gg_role` in localStorage on auth success, clears it on logout
3. Result: role class is on `<html>` before first paint — zero flash

**Original suggestion (not used):**

```tsx
<div data-role={user.role} className="app-shell">
```

```css
[data-role='trainer'] {
  --accent: var(--gold);
}
[data-role='solo'] {
  --accent: var(--purple);
}
```

---

### § UX-4 — MEDIUM: Double mobile navigation

**Skill:** `ux-researcher-designer` (usability testing framework)

**Screenshot confirmed:** sidebar column AND bottom nav both render on mobile.

```tsx
<AppSidebar className="hidden md:flex" />
<MobileBottomNav className="flex md:hidden" />
```

---

### § UX-5 — ✅ RESOLVED (2026-03-09): Empty states — Ronin scope

**Design doc:** `docs/plans/2026-03-09-ux5-empty-states.md`

Emotional template (RoninIcon 128px + Playfair Display headline + Inter body + gold CTA) added to:

- `ProgressPage.tsx` — "Your story starts here." (triggers: `soloProgress.totalWorkouts === 0`)
- `solo/Achievements.tsx` — "Earn your first scar." (triggers: `filteredAchievements.length === 0`)
- `SchedulePage.tsx` (SoloScheduleView) — "The path is empty. For now." (triggers: `events.length === 0`)

Functional template (lucide icon + Inter text + CTA) added to:

- `WorkoutPlans.tsx` — Dumbbell icon, approved copy, CTA → `/solo/generate`
- `solo/AICoach.tsx` — Sparkles icon, approved copy, "Ask a Question" CTA focuses input

Scope: Ronin role only. § DS-6 role illustration integration also resolved via this work.

### § UX-5b — ✅ RESOLVED (2026-03-09): Empty states for Guru and Disciple roles

Implemented per `docs/plans/2026-03-09-ux5b-empty-states-guru-disciple.md`.

**Guru (emotional template — GuruIcon 128px + Playfair Display):**

- `ClientsPage.tsx` — "Your roster awaits." + Add a Client CTA
- `PaymentsPage.tsx` — "Your business starts here." + Create a Plan CTA (full-page ternary, shown only when both `plans.length === 0 && paymentHistory.length === 0`)

**Guru (functional template — lucide icon + Inter):**

- `ExercisesPage.tsx` — Dumbbell icon + updated copy "Your exercise library is empty. Add custom exercises to start building workouts." + "Add Exercise" CTA
- `ClientDetailsPage.tsx` (workout assignments) — Dumbbell + "No workouts assigned to this client yet." + "Assign a Workout"
- `ClientDetailsPage.tsx` (progress) — TrendingUp + "No progress data recorded for this client yet." (no CTA)
- `SchedulePage.tsx` (TrainerClientSchedule, `appointments.length === 0`) — CalendarIcon + "No appointments scheduled this week." + "New Appointment" button

**Disciple (functional template — no illustration, no CTA, waiting-state copy):**

- `WeeklyWorkoutView.tsx` — Dumbbell + "Your trainer hasn't assigned any workouts yet. Check back after your next session."
- `SchedulePage.tsx` (isClient, `appointments.length === 0`) — CalendarIcon + "No sessions scheduled yet. Your trainer will add appointments when you're ready to start."
- `ProgressPage.tsx` (isClient/trainer-selected, `progressTypes.length === 0`) — TrendingUp + "Progress gets tracked here as you and your trainer work together."

---

## Visual Audit — Confirmed Issues (March 8 2026)

> Solo/Ronin role only. Trainer/Client not captured — provide credentials to complete.

| §     | Severity    | Finding                                                            | Screenshot                         |
| ----- | ----------- | ------------------------------------------------------------------ | ---------------------------------- |
| VA-1  | 🔴 CRITICAL | `/disciple-login` shows landing carousel — clients cannot log in   | `13-disciple-login.png`            |
| VA-2  | 🟠 HIGH     | 404 page is the landing carousel — no error shown                  | `02-404-page.png`                  |
| VA-3  | 🟡 MEDIUM   | Unauth redirect is silent — no toast                               | `03-unauth-dashboard-redirect.png` |
| VA-4  | 🟠 HIGH     | Raw plan ID `Solo_ai` shown in pricing UI                          | `14-pricing-top.png`               |
| VA-5  | 🟡 MEDIUM   | AI Coach shows `999/999` test counter, no tooltip                  | `03-ai-coach-top.png`              |
| VA-6  | 🟠 HIGH     | Personal birthday photo in production dashboard                    | `02-dashboard-top.png`             |
| VA-7  | 🟠 HIGH     | "QA18 Set Count Test" workout in production                        | `02-dashboard-top.png`             |
| VA-8  | 🟡 MEDIUM   | Mobile dashboard missing PRs stat (cut off)                        | `mobile/02-dashboard-top.png`      |
| VA-9  | 🟡 MEDIUM   | Workout card titles truncate mid-word, cards indistinguishable     | `06-workouts-top.png`              |
| VA-10 | 🟡 MEDIUM   | Progress "Avg Duration" shows bare `—` with no unit/label          | `07-progress-top.png`              |
| VA-11 | 🟡 MEDIUM   | Calculator hub is two completely different designs (public vs app) | `20-calculators-hub-top.png`       |
| VA-12 | 🟡 MEDIUM   | Collapsed sidebar icons have no tooltips                           | `16-sidebar-collapsed.png`         |
| VA-13 | 🟡 MEDIUM   | Mobile landing "See How It Works" button cut off                   | `mobile/01-landing-hero.png`       |
| VA-14 | 🟡 MEDIUM   | Login page: no default role selected, fields appear active         | `10-auth-login-top.png`            |
| VA-15 | 🟢 LOW      | Recovery "Not trained" cards give no onboarding prompt             | `08-recovery-top.png`              |

---

## Tech Debt — WSJF Priority Table

**Skill:** `senior-pm` Monte Carlo + `tech-debt-tracker` WSJF = (Business Value + Time Criticality + Risk Reduction) / Effort

| Issue                          | BV  | TC  | RR  | Effort | WSJF     | Sprint   |
| ------------------------------ | --- | --- | --- | ------ | -------- | -------- |
| § BE-7 Guru dashboard broken   | 10  | 10  | 10  | 1      | **30**   | Now      |
| § VA-1 disciple login broken   | 10  | 10  | 8   | 1      | **28**   | ✅ Done  |
| § VA-6/7 personal data in prod | 8   | 10  | 7   | 1      | **25**   | Now      |
| § SEC-1 mock data in prod      | 9   | 10  | 10  | 2      | **14.5** | Now      |
| § SEC-5 CSP inline violation   | 5   | 8   | 9   | 3      | **7.3**  | Sprint 1 |
| § VA-4 raw plan ID in UI       | 7   | 6   | 3   | 1      | **16**   | Sprint 1 |
| § VA-4b raw role in Settings   | 5   | 5   | 5   | 1      | **15**   | Sprint 1 |
| § VA-2 404 = landing page      | 6   | 8   | 5   | 2      | **9.5**  | Sprint 1 |
| § SEC-3 CSP unsafe-inline      | 5   | 7   | 10  | 2      | **11**   | Sprint 1 |
| § SEC-4 debug routes in prod   | 6   | 8   | 8   | 2      | **11**   | Sprint 1 |
| § FE-1 App.tsx God component   | 7   | 5   | 6   | 5      | **3.6**  | Sprint 2 |
| § BE-3 routes monolith         | 6   | 4   | 5   | 10     | **1.5**  | Quarter  |
| § UX-1 carousel landing        | 8   | 5   | 3   | 8      | **2**    | Quarter  |

**Recommended allocation** (`tech-debt-tracker`): 30% debt / 70% features this sprint.

---

## Observability Checklist

**Skill:** `observability-designer`

GymGurus currently has NO SLIs, SLOs, or alerting defined. Before next public launch:

```
SLIs to define:
  - API error rate (target: <1% 5xx over 5min window)
  - Auth latency p99 (target: <500ms)
  - Stripe webhook processing (target: 100% idempotent delivery)
  - AI Coach response time (target: <3s p95)

Golden signals to instrument:
  - Latency, Traffic, Errors, Saturation — on Express middleware
  - DB connection pool utilisation
  - Anthropic API quota consumption
```

---

## CI/CD Checklist

**Skill:** `ci-cd-pipeline-builder`

No CI/CD pipeline exists beyond Railway auto-deploy from main. Generate with:

```bash
python scripts/pipeline_builder.py . --platform github-actions --stages lint,test,build,deploy
```

Minimum pipeline should include:

- TypeScript compilation check
- `code-reviewer` PR Analyzer (block `as any` additions, `console.log` in client)
- `dependency-auditor` CVE scan
- `playwright-pro` smoke tests
- `env-secrets-manager` secret leak check

---

## Runbook: Deployment

**Skill:** `runbook-generator`

Generate full runbooks with:

```bash
python scripts/runbook_generator.py . --type deployment,incident,database
```

Current manual process:

1. Push to `main` → Railway auto-deploys
2. Monitor Railway logs for DB connection errors
3. If deploy fails: Railway dashboard → Rollback to previous deploy
4. Verify: `curl https://gym-gurus-production.up.railway.app/api/health`

---

## Layout Rules — Learned from Visual Audit (2026-03-10)

- **No fixed heights on content containers.** Use `min-h-*` to set a floor, not `h-*` which clips overflowing content. Fixed heights are only acceptable on: chart containers (recharts requires them), loading skeletons, and decorative elements with no dynamic content.
- **Multi-word labels in flex rows need `flex-wrap`.** `flex justify-between` with dynamic text (e.g. muscle names from DB) will overflow on narrow grid cards. Use `flex flex-wrap gap-1` + `flex-1 min-w-0` on the label + `flex-shrink-0` on the badge.
- **`w-auto` images inside `absolute` containers overflow their parent.** Always pair `w-auto` with `max-w-[...]` or switch to a fixed-width wrapper div with `overflow-hidden`.
- **Empty states must account for ALL data states.** Check every branch: if a component has both `completed` and `planned` data, the "no data" empty state condition must exclude BOTH (`!hasCompleted && !hasPlanned`), not just one.

---

## Quick Wins (< 1 hour, no architecture impact)

**Skill:** `code-reviewer` PR Analyzer catches all of these automatically

1. `rm server/mockData.ts` + replace fallbacks (§ SEC-1)
2. Delete `console.log` from client/ — 16+ in App.tsx
3. Fix `capacitor.config.ts server.url` — points to Railway settings page, not the app
4. Delete Replit plugins: `@replit/vite-plugin-cartographer` + `@replit/vite-plugin-runtime-error-modal`
5. Consolidate AI SDKs: `@ai-sdk/anthropic` + `ai` (Vercel) → pick one (`dependency-auditor`)
6. Delete debug PNGs from git: `auth-login-final-check.png`, `test-auth-login-fix.png`, `clients_missing.png`
7. Move 16+ planning `.md` files from root → `/docs` or delete
8. Rename `add_onboarding_table.ts` → `005_add_onboarding_table.ts`
9. Unskip `routes.test.ts.skip` → rename to `.ts` and add to CI (`playwright-pro` / `api-test-suite-builder`)
10. Fix `Solo_ai` → "Ronin AI" in pricing display (§ VA-4)
11. Add `noopener noreferrer` to all `target="_blank"` links
12. Consolidate `SettingsPage.tsx` local `TIER_NAMES` map → shared `getPlanDisplayName()` from `client/src/lib/roles.ts`
13. ✅ RESOLVED (2026-03-09): `checkDatabaseAvailability` now uses `db.execute(sql\`SELECT 1\`)` — no schema dependency, no false CRITICAL log on first boot

---

## Open Questions

- [ ] Is `/disciple-login` intentionally separate from main login? It's broken — fix before any client uses it (§ VA-1)
- [ ] Is `redesign/` an active migration or abandoned? Document the decision as an ADR (`doc-coauthoring`)
- [ ] `shopping.ts` — ship or delete? Run RICE scoring (`product-manager-toolkit`)
- [ ] Is `STRIPE_WEBHOOK_SECRET` set in Railway? Check `env-secrets-manager`
- [ ] Is Capacitor/mobile actively in development? If not, remove
- [ ] Trainer and Client roles not visually audited — provide credentials to complete visual audit
- [ ] No runbooks exist — generate with `runbook-generator` before next on-call rotation
- [ ] No SLOs defined — design with `observability-designer` before launch

---

## Self-Improvement Protocol

**Skill:** `self-improving-agent`

Run at the end of every Claude Code session:

```
/si:review    → find patterns worth promoting
/si:promote   → graduate proven learnings to CLAUDE.md or .claude/rules/
/si:extract   → turn recurring GymGurus-specific solutions into reusable skills
/si:remember  → explicitly save important new knowledge
```

Scoped rules to create in `.claude/rules/`:

```yaml
# .claude/rules/api-routes.md
paths: ["server/routes/**/*.ts"]
rules:
  - Always include requireTrainerOwnership or requireClientOwnership
  - Always validate inputs with Zod
  - Never use raw SQL — Drizzle ORM only

# .claude/rules/db-migrations.md
paths: ["server/migrations/**", "shared/schema.ts"]
rules:
  - Run npx drizzle-kit generate after every schema change
  - Use Expand-Contract for any type changes (never direct ALTER)
  - Number files sequentially: NNN_description.ts
  - Never rename files already in drizzle/meta/_journal.json

# .claude/rules/stripe.md
paths: ["server/routes/webhooks.ts", "server/routes/payments.ts"]
rules:
  - All webhook handlers must be idempotent
  - Never change middleware order in webhooks.ts
  - Always verify Stripe signature before processing
```

---

## § DESIGN — Frontend Design Audit

> Applied via `frontend-design` skill. Every finding uses that skill's framework:
> Purpose → Tone → Constraints → Differentiation → Typography → Color → Motion → Composition → Backgrounds

---

### Aesthetic Identity Assessment

**Declared direction:** Dark luxury / premium fitness. Black + gold on the landing. Serif display type. Martial arts character illustrations. This is a strong, committed aesthetic direction — the skill demands intentionality, and the landing has it.

**The problem:** The aesthetic direction fractures the moment a user logs in.

| Surface            | Accent                 | Background             | Vibe                         |
| ------------------ | ---------------------- | ---------------------- | ---------------------------- |
| Landing page       | Gold (`#C9A84C` range) | Near-black (`#0a0a0a`) | Luxury editorial             |
| App sidebar        | Purple (`#7C3AED`)     | Dark navy (`#1a1a2e`)  | Generic SaaS dashboard       |
| Nutrition Planner  | Bright green           | Dark                   | Food app                     |
| Achievements page  | Yellow/gold tabs       | Dark                   | Gaming/gamification          |
| Public calculators | Light grey             | White                  | Completely different product |

The `frontend-design` skill is explicit: _"Commit to a cohesive aesthetic. Dominant colors with sharp accents outperform timid, evenly-distributed palettes."_ GymGurus has three competing palettes across one product. This isn't intentional contrast — it's accumulated design drift.

**Root cause:** The CSS variable system exists (`--accent: var(--gold)` and `--accent: var(--purple)` per role) but it hasn't been applied consistently. The app interior looks like a different product was pasted inside the landing's shell.

---

### § DS-1 — CRITICAL: Three-way brand split (landing / app / calculators)

**`frontend-design` verdict:** Fails the "cohesive aesthetic" requirement. The landing screams luxury; the app whispers generic SaaS dashboard.

**Specific breakdowns:**

1. **Gold → Purple switch on login.** ✅ RESOLVED (2026-03-10) — Audit (H-5) confirmed login page already bridges landing ↔ app correctly: `background: '#0a0a0a'` (aligned to landing's exact value), Playfair Display heading, role-reactive ambient orbs preview the app accent, card border tints to role color. No jarring transition — the role-color shift (gold→purple for Ronin) is intentional and animated.

2. **Structural green in calculators.** ✅ RESOLVED (2026-03-10) — (H-7) Replaced all structural `bg-green-500`/`text-green-[x]` in calculator pages with `bg-violet-500` (fat macro bar segments in MacroCalc, TDEECalc, PremiumMacroCalc — keeps multicolor bar readable) and `bg-primary` (WaterIntakeCalc, PremiumWaterIntakeCalc activity bonus dots). Semantic green kept: HeartRateZones Z3 bar (standard medical color), IdealWeight healthy BMI range indicators. Also removed `text-green-500`/`text-green-400` structural colors from CalculatorsHub.

3. **Public calculators: light mode only.** ✅ RESOLVED (2026-03-10) — (H-6) Rewrote `CalculatorsHub.tsx` (`/calculators`): added `dark min-h-screen bg-[#0a0a0a]` wrapper to force landing-page dark context regardless of auth state. Replaced all 12 rainbow icon badge colors (`bg-blue-100 dark:bg-blue-900/30` etc.) with uniform gold treatment (`bg-[rgba(201,168,76,0.10)]`, `text-[#c9a84c]`). Pro Tip card headings (`text-green-400`, `text-blue-400`) → `color: #c9a84c`. Gold gradient on page heading `span`. Cards use `rgba(255,255,255,0.04)` dark glass with gold hover border.

**Remaining §DS-1 work (not yet resolved):**

4. **Nutrition Planner green.** Active states in the Nutrition Planner use a bright `#22c55e` green — completely unrelated to either the gold or the purple. Needs replacement with `var(--primary)`.

5. **Full design system tokens.** The CSS variable consolidation (`--color-brand-gold`, `--color-accent` per role, etc.) is the long-term fix. Low-effort structural changes (H-5, H-6, H-7) addressed now; token refactor is a Sprint 2 task.

**Fix — define the design system properly:**

```css
/* In client/src/styles/tokens.css */
:root {
  /* Brand core — never changes */
  --color-brand-gold: #c9a84c;
  --color-brand-black: #0a0a0a;
  --color-brand-dark: #1a1a1a;

  /* Role accents — changes per role, same system */
  --color-accent: var(--color-brand-gold); /* default/landing */
}

[data-role='trainer'] {
  --color-accent: var(--color-brand-gold);
}
[data-role='solo'] {
  --color-accent: #7c3aed;
} /* purple, but intentional */
[data-role='client'] {
  --color-accent: #0ea5e9;
} /* teal for disciple */

/* All interactive elements use --color-accent */
.btn-primary {
  background: var(--color-accent);
}
.nav-active {
  color: var(--color-accent);
  border-color: var(--color-accent);
}
.chart-line {
  stroke: var(--color-accent);
}
```

The Nutrition Planner green must either become `var(--color-accent)` or be removed. It has no design justification.

The public calculators must adopt the dark background + gold accent to match the landing. They are a marketing page — they must look like they belong to the same premium product.

---

### § DS-2 — HIGH: Typography is strong on landing, invisible in app

**`frontend-design` verdict:** _"Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font."_

**Landing:** Uses a large-weight serif (appears to be Cormorant Garamond or similar) for "Run Your Fitness Business Like a Pro". Looks intentional. The brand guide in `.claude/gymgurus-brand-guide.md` confirms: Playfair Display (headings), Cormorant Garamond (accents), Inter (body).

**App interior:** The display serif disappears entirely. Page titles like "Achievements", "Nutrition Planner", "Dashboard" all render in a regular sans-serif weight with no visual hierarchy beyond size. The heading font that defines the brand identity is only used on one page out of the entire product.

**Fix:** Apply Playfair Display (or Cormorant Garamond) to all primary page headings inside the app. The `h1` and page-level section titles should carry the brand. Body text and data labels stay in Inter. This is a CSS change, not a redesign:

```css
/* In global styles */
h1,
.page-title {
  font-family: 'Playfair Display', serif;
}
.section-label {
  font-family: 'Cormorant Garamond', serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

---

### § DS-3 — HIGH: Pricing page — colour on non-active states is noise

**`frontend-design` verdict:** Fails "intentionality". The pricing page assigns a different icon colour to every plan (star/grey, lightning/purple, crown/purple, people/gold, crown/gold) with no system behind the choices. The eye has nowhere to land. The "Most Popular" badge on Ronin AI is yellow — a fourth accent colour not used anywhere else.

**Fix:** Reduce to two states: active/selected (gold, full opacity) and inactive (white, 40% opacity). The icon tints should follow `--color-accent`. The "Most Popular" badge should use `--color-accent`, not a hardcoded yellow.

---

### § DS-4 — MEDIUM: Motion is heavy but purposeful in the wrong places

**`frontend-design` verdict:** _"Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions."_

framer-motion is imported in 122 files. Most uses are `opacity: 0 → 1` fades. The pages that would benefit most from motion — the dashboard stats reveal, the achievement unlock, the workout completion — have the same generic fade as every other element.

**Design recommendation before the `senior-frontend` refactor (§ FE-7):**

| Moment                          | Motion Treatment                                          |
| ------------------------------- | --------------------------------------------------------- |
| Dashboard stat counters on load | Count-up animation (number increments from 0 to value)    |
| Achievement unlocked            | Scale + glow burst — this is a celebration moment         |
| Workout set completion          | Progress bar fill with haptic-like bounce                 |
| Sidebar collapse/expand         | Width transition with icon cross-fade                     |
| All other page transitions      | CSS `animation: fadeIn 0.15s ease` — remove framer-motion |

---

### § DS-5 — MEDIUM: Spatial composition is uniform throughout — no breathing, no hierarchy

**`frontend-design` verdict:** _"Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density."_

Every page in the app uses the same layout: full-width container, padding 24px, stacked cards in a regular grid. There is no visual hierarchy between primary and secondary content areas. The dashboard, progress page, schedule page, and settings page are structurally identical at a layout level — only the card content changes.

**High-priority layout fixes:**

1. **Dashboard:** The "Today's Workout" card is the most important element on the page. It currently has the same visual weight as the stats row and the volume chart. It should be visually dominant — full bleed, large typography, the workout name in Playfair Display.

2. **Achievements:** Unlocked achievements (only 2 cards) are the same size as locked ones. The unlocked cards should be larger, feature the icon prominently, and sit in a highlighted zone. Locked achievements should be visually recessed. The current treatment makes 2 successes look identical to 43 locked items.

3. **AI Coach:** Large empty white space occupies the right half of the screen on initial load ("Start a conversation" state). This space is wasted. Fill it with suggested conversation starters as styled prompt cards, or surface recent topics as visual cards.

---

### § DS-6 — ✅ RESOLVED (2026-03-09): Role illustrations integrated into Ronin empty states

`RoninIcon` (128px, `variant="default"`) now appears on 3 Ronin emotional empty states:

- Progress page — "Your story starts here."
- Achievements page — "Earn your first scar."
- Schedule page — "The path is empty. For now."

GuruIcon deployed in Guru empty states (Clients, Payments) — see § UX-5b ✅. DiscipleIcon not used per design decision (Disciple empty states are waiting states, not motivational).

---

## § UX — User Experience Research Audit

> Applied via `ux-researcher-designer` skill.
> Personas derived from the 3 roles. Journey maps for the critical onboarding flow.
> Severity ratings: 4=Critical (prevents task), 3=Major (significant difficulty), 2=Minor (hesitation), 1=Cosmetic.

---

### Personas (derived from role structure + screenshot evidence)

**Persona 1 — "The Guru" (Trainer)**

- Archetype: `business_user`
- Primary goal: Manage client roster, assign programs, track client progress, get paid
- Context: Works from desktop, manages 5–20 clients, uses platform daily
- Frustrations observed in screenshots: No data yet from trainer role audit (credentials not provided)
- Design implications: Needs fast client switching, bulk workout assignment, payment overview at a glance

**Persona 2 — "The Ronin" (Solo user, "Dacian" from screenshots)**

- Archetype: `power_user` transitioning to `casual_user`
- Primary goal: Generate and track workouts, use AI coach for guidance
- Context: Uses desktop and mobile interchangeably, motivational — wants to see progress
- Frustrations observed: AI coach 999/999 counter (confusing), workout cards truncating titles, streak showing 2 while workouts show 0 (confusing metric)
- Quote signal from UI: "Ready to train?" — the product speaks to this persona's motivational mindset
- Design implications: Streak and consistency data must be accurate and encouraging; the AI Coach limit must be clearly communicated before it blocks usage

**Persona 3 — "The Disciple" (Client)**

- Archetype: `casual_user`
- Primary goal: View assigned workouts, log completion, message trainer
- Context: Primarily mobile, lower tech proficiency
- Critical issue: **Cannot log in at all** (§ VA-1). This persona has zero usable journey.

---

### Journey Map — Ronin First-Week Onboarding

Applying the `ux-researcher-designer` 5-stage B2B SaaS journey to a fitness SaaS:

**Stage: Awareness → Evaluation → Onboarding → Adoption → Advocacy**

```
STAGE 1: Awareness (Landing page)
Actions:    Lands on homepage from search/social
Touchpoints: Landing carousel, hero headline
Emotions:   😐 Neutral → confused by locked scroll
Pain Points: [PAIN] Cannot scroll freely. [PAIN] Login not visible on slide 1.
             [PAIN] Slides 2–7 show identical content — broken carousel.
Opportunity: Replace carousel with scrollable. Add Login to header nav.
Score: Frequency(5) × Severity(4) × Solvability(4) = 80 — TOP PRIORITY

STAGE 2: Evaluation (Calculators / Pricing)
Actions:    Explores free calculators, checks pricing
Touchpoints: /calculators (white light theme), /pricing
Emotions:   😊 Engaged by calculators — content is good
Pain Points: [PAIN] Calculators look like a different product (light theme).
             [PAIN] Pricing shows "Solo_ai" instead of "Ronin AI".
Opportunity: Dark-theme calculators. Fix plan display names.
Score: Frequency(4) × Severity(2) × Solvability(5) = 40 — Medium

STAGE 3: Onboarding (Registration → First login)
Actions:    Registers, selects role, lands on dashboard
Touchpoints: /register, /auth/login, /dashboard
Emotions:   😊 Login page is well designed — role cards are distinctive
Pain Points: [PAIN] No role pre-selected — user must click before fields activate.
             [PAIN] Birthday photo visible immediately — looks broken.
             [PAIN] "QA18 Set Count Test" as first workout — unprofessional.
Opportunity: Pre-select Ronin role. Clean up test data. Proper onboarding empty states.
Score: Frequency(5) × Severity(3) × Solvability(5) = 75 — HIGH PRIORITY

STAGE 4: Adoption (Using core features)
Actions:    Generates workout, logs sets, checks progress
Touchpoints: Generate Workout, My Workouts, My Progress
Emotions:   😊 Generate Workout UX is strong — smart suggestion banner is excellent
Pain Points: [PAIN] Workout card titles truncated — can't tell workouts apart.
             [PAIN] Progress "Avg Duration" shows bare dash.
             [PAIN] AI Coach shows 999/999 — user thinks they've used all messages.
             [PAIN] Streak shows 2 but workouts this week = 0 — metrics contradict.
Opportunity: Fix truncation. Add tooltips. Clarify metrics. Fix AI counter display.
Score: Frequency(4) × Severity(3) × Solvability(4) = 48 — Medium

STAGE 5: Advocacy (Sharing, upgrading)
Actions:    Considers upgrading, recommends to friends
Touchpoints: Achievements, Pricing page
Emotions:   😊 Achievement system is a strong engagement driver — good concept
Pain Points: [PAIN] Two plans marked "Current plan" simultaneously (confusing).
             [PAIN] Achievement dates show future dates (date handling bug).
             [PAIN] 42/45 achievements locked — visible gap feels discouraging.
Opportunity: Fix plan state. Fix date bug. Show "Most recent unlock" prominently.
```

---

### Usability Issue Severity Ratings (UX Researcher Framework)

| #     | Issue                                     | Severity         | Frequency | Solvability | Priority Score |
| ----- | ----------------------------------------- | ---------------- | --------- | ----------- | -------------- |
| VA-1  | Disciple cannot log in at all             | **4 — Critical** | 5         | 5           | **100**        |
| UX-1  | Carousel blocks free scroll + hides login | **4 — Critical** | 5         | 4           | **80**         |
| VA-7  | QA artifact "QA18" visible in production  | **3 — Major**    | 5         | 5           | **75**         |
| VA-6  | Personal birthday photo in production     | **3 — Major**    | 5         | 5           | **75**         |
| DS-1  | Brand split — gold landing / purple app   | **3 — Major**    | 5         | 3           | **45**         |
| VA-3  | Silent redirect — no toast or message     | **2 — Minor**    | 4         | 5           | **40**         |
| VA-4  | "Solo_ai" raw ID in pricing               | **2 — Minor**    | 4         | 5           | **40**         |
| DS-2  | Brand serif font disappears inside app    | **2 — Minor**    | 5         | 4           | **40**         |
| VA-9  | Workout card titles truncated             | **2 — Minor**    | 4         | 4           | **32**         |
| UX-4  | Double nav on mobile                      | **2 — Minor**    | 4         | 4           | **32**         |
| VA-14 | Login: no default role selected           | **2 — Minor**    | 5         | 5           | **50**         |
| VA-8  | Mobile: PRs stat cut off                  | **2 — Minor**    | 4         | 4           | **32**         |
| DS-3  | Pricing page colour noise                 | **1 — Cosmetic** | 4         | 5           | **20**         |
| VA-12 | Collapsed sidebar: no tooltips            | **1 — Cosmetic** | 3         | 5           | **15**         |
| VA-15 | Recovery: no onboarding prompt            | **1 — Cosmetic** | 3         | 3           | **9**          |

---

### UX Recommendations for Claude Code

When implementing any UI fix, activate `ux-researcher-designer` and follow this checklist before committing:

```
□ Does this change move a user closer to their persona goal?
□ Have I checked the journey map stage this screen belongs to?
□ Is the empty state defined for this component?
□ Does error messaging tell the user what happened AND what to do next?
□ Is the action hierarchy clear — one primary CTA, one secondary, nothing else competing?
□ Have I checked on mobile viewport? (screenshot confirms issues at 390px width)
□ Does this component work for all three personas (Guru, Ronin, Disciple)?
```

---

### Usability Test Plan (run before any major UI release)

Per `ux-researcher-designer` Workflow 3 — 5 participants, moderated remote, 45 min each:

**Task 1 (Ronin):** "You've just signed up. Set up your first workout for today."

- Success: User reaches active workout screen
- Time target: < 3 minutes
- Expected failure points: Login role selection, carousel navigation

**Task 2 (Guru):** "A new client just joined. Set up their first workout plan."

- Success: Client sees assigned plan in their Disciple dashboard
- Time target: < 5 minutes
- Note: Disciple login currently broken — this task will fail entirely (§ VA-1)

**Task 3 (Ronin):** "Find out how much total volume you've lifted this month."

- Success: User finds Progress page → Total Volume stat
- Time target: < 90 seconds
- Expected failure: Avg Duration shows `—` — users may assume app is broken

**Task 4 (Any):** "You want to upgrade your plan. Find out what you're currently on and switch."

- Success: User identifies current plan and reaches payment screen
- Expected failure: Two cards show "Current plan" — users will be confused about which is active
