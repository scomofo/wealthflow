<p align="center">
  <img src="https://img.shields.io/badge/Electron-34-47848f?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-sql.js-003b57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude_AI-Advisor-d97706?style=for-the-badge&logo=anthropic&logoColor=white" />
  <img src="https://img.shields.io/badge/Region-Canada_🇨🇦-ff0000?style=for-the-badge" />
</p>

<h1 align="center">💰 WealthFlow</h1>

<p align="center">
  <strong>Canadian financial decision engine and personal-finance command center</strong>
</p>

<p align="center">
  <em>Understand what matters &bull; Decide what to do &bull; Act with confidence</em>
</p>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧭 Decide
- **Next Best Actions** &mdash; Rule-first recommendations ranked by importance
- **Focus Mode** &mdash; Turn a recommendation into clear execution steps
- **AI Summary** &mdash; Short narrative explaining what matters and why
- **Personalization** &mdash; Bounded relevance tuning without hiding urgent actions

</td>
<td width="50%">

### 🤖 Plan with AI
- **Structured Workflows** &mdash; TFSA vs RRSP, Debt vs Investing, Monthly Planner
- **Canadian Context** &mdash; Tax, registered-account and debt guidance
- **Saveable Actions** &mdash; Turn workflow results into a practical plan
- **Proactive Guidance** &mdash; Dashboard nudges and cooldown-aware desktop notifications

</td>
</tr>
<tr>
<td>

### 💳 Track
- **Budgets** &mdash; Monthly category breakdowns
- **Transactions** &mdash; Import CSV, OFX, QIF, XLSX
- **Bank Presets** &mdash; TD, RBC, BMO, Scotiabank, CIBC and more
- **Recurring Detection** &mdash; Identify subscriptions and repeating payments

</td>
<td>

### 📈 Plan & Grow
- **Portfolio Tracker** &mdash; Stock quotes and holdings
- **Registered Accounts** &mdash; TFSA, RRSP, RESP, FHSA
- **Tax + Retirement** &mdash; Federal/provincial calculations, CPP, OAS, RRSP drawdown
- **Can I Afford This?** &mdash; Deterministic affordability planning

</td>
</tr>
</table>

---

## 🚀 Guided Start

WealthFlow includes a five-step onboarding path designed to reach useful recommendations quickly:

1. understand the product and privacy model,
2. add optional province / income / expense / debt / savings context,
3. choose budget categories,
4. start with sample data or a blank profile,
5. see prioritized next steps immediately.

You can refine the profile later; a rough starting picture is enough to begin.

---

## 🇨🇦 Canadian-Specific

| Feature | Details |
|:--------|:--------|
| 🏦 **Tax Brackets** | 2026 federal + all province/territory brackets; CRA-administered tables verified against current 2026 sources and Quebec against Revenu Quebec |
| 📊 **TFSA** | Annual limits + lifetime room |
| 💼 **RRSP** | Deduction limits + HBP/LLP |
| 🎓 **RESP** | CESG matching + lifetime caps |
| 🏠 **FHSA** | First Home Savings Account |
| 👴 **CPP / OAS** | 2026 CPP figures + current July-September 2026 OAS amounts and retirement projections |
| 🏧 **Bank Import** | Canadian bank presets + CSV/OFX/QIF/XLSX import |
| 📬 **Tax Season** | T4/T5 guidance + deduction finder |

> Financial and tax calculations are planning estimates, not a substitute for individualized professional advice. The calculator uses current 2026 bracket/BPA data but does not model every surtax, premium, credit, AMT rule, or Quebec-specific contribution.

---

## 🚀 Quick Start

```bash
npm install
npm start          # 🖥️ Launch Electron app
```

## ✅ Quality Gates

```bash
npm run lint
npm test
```

GitHub Actions runs lint and tests on pull requests and pushes to `master`.

## 📦 Build Installer

```bash
npm run build:win  # 🪟 Windows NSIS installer
```

## 📁 Structure

```
wealthflow/
├── src/
│   ├── main/
│   │   ├── main.js                        Electron main process
│   │   ├── database.js                    SQLite (sql.js WASM) + persistence
│   │   ├── ai-service.js                  Claude AI integration
│   │   ├── ai-workflows.js                Structured AI workflows
│   │   ├── next-best-actions-engine.js    Deterministic recommendation engine
│   │   ├── personalization-engine.js      Bounded personalization
│   │   ├── proactive-engine.js            Dashboard nudges
│   │   ├── desktop-notification-engine.js Proactive desktop notifications
│   │   ├── ipc-handlers.js                Main/renderer IPC boundary
│   │   └── migrations/                    Database migrations
│   ├── renderer/
│   │   ├── js/
│   │   │   ├── app.js                     App coordinator
│   │   │   ├── router.js                  SPA routing
│   │   │   ├── state/                     State + command-center refresh
│   │   │   ├── canadian/                  Tax/account constants + calculators
│   │   │   ├── components/                Reusable decision/UI surfaces
│   │   │   └── pages/                     Feature pages
│   │   └── styles/
│   │       ├── main.css
│   │       └── theme.css                  Dark/light tokens
│   └── knowledge/                         AI financial context
├── tests/                                  Jest regression suite
├── docs/
│   ├── handoffs/                           Historical implementation handoffs
│   └── reviews/                            Current/recent inspections
└── assets/
    └── icons/
```

## 🔒 Privacy & Security

- Financial data is stored locally at `%APPDATA%/wealthflow/wealthflow.db`.
- No telemetry or tracking is built into WealthFlow.
- AI requests go to Anthropic only when AI functionality is used.
- The AI API key is kept in the Electron main process, protected with Electron `safeStorage` when available, and is not included in JSON exports.
- The sql.js database is stored as a local file and is **not whole-database encrypted at rest**; device/OS disk encryption remains the protection for the financial database itself.
- Database persistence uses crash-safe replacement/backup behavior and the app enforces a single running instance to protect the sql.js database.

---

## 📚 Project Direction

`CLAUDE.md` is the current product/engineering source of truth. Historical files in `docs/handoffs/` are retained for context but are not authoritative for current behavior.

---

<p align="center">
  <sub>Built by Scott Morley</sub>
</p>
