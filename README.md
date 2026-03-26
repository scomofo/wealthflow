<p align="center">
  <img src="https://img.shields.io/badge/Electron-34-47848f?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-sql.js-003b57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude_AI-Advisor-d97706?style=for-the-badge&logo=anthropic&logoColor=white" />
  <img src="https://img.shields.io/badge/Region-Canada_🇨🇦-ff0000?style=for-the-badge" />
</p>

<h1 align="center">💰 WealthFlow</h1>

<p align="center">
  <strong>Canadian personal finance desktop app with AI-powered financial advising</strong>
</p>

<p align="center">
  <em>Budget &bull; Invest &bull; Tax Plan &bull; All local, all yours</em>
</p>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 AI Advisor
- **Claude-Powered** &mdash; Financial advice tailored to Canadian law
- **Tax Optimization** &mdash; RRSP, TFSA, RESP, FHSA strategies
- **Debt Guidance** &mdash; Snowball/avalanche recommendations
- **Knowledge Base** &mdash; Alberta tax law, CRA rules

</td>
<td width="50%">

### 💳 Track
- **Budgets** &mdash; Monthly category breakdowns
- **Transactions** &mdash; Import CSV, OFX, QIF, XLSX
- **Bank Presets** &mdash; TD, RBC, BMO, Scotiabank, CIBC
- **Recurring Detection** &mdash; Auto-identify subscriptions

</td>
</tr>
<tr>
<td>

### 📈 Invest
- **Portfolio Tracker** &mdash; Real-time stock quotes
- **Registered Accounts** &mdash; TFSA, RRSP, RESP, FHSA
- **Contribution Room** &mdash; Lifetime tracking
- **Performance Charts** &mdash; Chart.js visualizations

</td>
<td>

### 🧮 Plan
- **Tax Calculator** &mdash; Federal + Provincial brackets
- **Retirement Projections** &mdash; CPP, OAS, RRSP drawdown
- **Savings Goals** &mdash; Visual progress tracking
- **PDF Reports** &mdash; Comprehensive summaries

</td>
</tr>
</table>

---

## 🇨🇦 Canadian-Specific

| Feature | Details |
|:--------|:--------|
| 🏦 **Tax Brackets** | 2024/2025 Federal + Alberta provincial |
| 📊 **TFSA** | Annual limits + lifetime room |
| 💼 **RRSP** | Deduction limits + HBP/LLP |
| 🎓 **RESP** | CESG matching + lifetime caps |
| 🏠 **FHSA** | First Home Savings Account |
| 🏧 **Bank Import** | TD, RBC, BMO, Scotiabank, CIBC presets |
| 📬 **Tax Season** | T4/T5 guidance + deduction finder |

---

## 🚀 Quick Start

```bash
npm install
npm start          # 🖥️ Launch Electron app
```

## 📦 Build Installer

```bash
npm run build:win  # 🪟 Windows NSIS installer
```

## 📁 Structure

```
wealthflow/
├── src/
│   ├── main/
│   │   ├── main.js              Electron main process
│   │   ├── database.js          SQLite (sql.js WASM)
│   │   ├── ai-service.js        Claude AI integration
│   │   ├── ipc-handlers.js      100+ IPC channels
│   │   ├── stock-service.js     Real-time quotes
│   │   └── migrations/          8 DB migrations
│   ├── renderer/
│   │   ├── js/
│   │   │   ├── app.js           App coordinator
│   │   │   ├── router.js        15-route SPA
│   │   │   ├── state.js         State + IPC bridge
│   │   │   ├── canadian/
│   │   │   │   ├── constants.js Tax brackets, limits
│   │   │   │   ├── calculators.js Tax, retirement, debt
│   │   │   │   └── formatters.js CAD formatting
│   │   │   └── pages/           15 feature pages
│   │   └── styles/
│   │       ├── main.css
│   │       └── theme.css        Dark/light tokens
│   └── knowledge/
│       ├── alberta_tax_law.txt  AI context
│       └── debt_advice.txt      AI guidance
└── assets/
    └── icons/                   App icons
```

## 🔒 Privacy

All data stored locally at `%APPDATA%/wealthflow/wealthflow.db`. Nothing sent to the cloud except AI chat messages (which go to Anthropic's API). No telemetry, no tracking.

---

<p align="center">
  <sub>Built by Scott Morley</sub>
</p>
