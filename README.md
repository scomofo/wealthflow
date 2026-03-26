<p align="center">
  <img src="https://img.shields.io/badge/Electron-34-47848f?style=flat-square&logo=electron" />
  <img src="https://img.shields.io/badge/SQLite-sql.js-003b57?style=flat-square&logo=sqlite" />
  <img src="https://img.shields.io/badge/Claude_AI-Powered-d97706?style=flat-square&logo=anthropic" />
  <img src="https://img.shields.io/badge/Region-Canada-ff0000?style=flat-square" />
</p>

# WealthFlow

> Canadian personal finance desktop app with AI-powered financial advising, tax calculations, and investment tracking

---

### Highlights

| Feature | Description |
|:--------|:------------|
| **AI Financial Advisor** | Claude-powered advice tailored to Canadian tax law and regulations |
| **Budget Tracking** | Monthly budgets with category breakdowns and recurring detection |
| **Transaction Import** | Import from CSV, OFX, QIF, XLSX — with Canadian bank presets |
| **Tax Calculator** | Federal + Provincial tax brackets (Alberta focus) with RRSP/TFSA optimization |
| **Registered Accounts** | TFSA, RRSP, RESP, FHSA tracking with contribution room |
| **Investment Portfolio** | Stock tracking with real-time quotes and performance charts |
| **Debt Management** | Debt snowball/avalanche calculator with payoff projections |
| **Tax Season** | T4/T5 preparation guidance and deduction finder |
| **Financial Planning** | Retirement projections, emergency fund, and goal tracking |
| **Savings Goals** | Visual progress tracking for multiple savings goals |
| **Achievements** | Gamified financial milestones to keep you motivated |
| **PDF Reports** | Generate comprehensive financial reports |

---

### Tech Stack

```
Desktop         Electron 34 (Windows installer via NSIS)
Database        SQLite via sql.js (WASM — no native deps)
AI              Anthropic Claude SDK (financial advising)
Charts          Chart.js for portfolio and budget visualization
Architecture    Main process (IPC) + Renderer (vanilla JS SPA)
```

### Canadian-Specific

| Feature | Details |
|:--------|:--------|
| Tax Brackets | 2024/2025 Federal + Alberta provincial rates |
| TFSA | Annual contribution limits + lifetime room calculation |
| RRSP | Deduction limits + HBP/LLP tracking |
| RESP | CESG matching + lifetime contribution limits |
| FHSA | First Home Savings Account tracking |
| Bank Import | Presets for major Canadian banks (TD, RBC, BMO, Scotiabank, CIBC) |

### Quick Start

```bash
npm install
npm start                      # Launch Electron app
```

### Build Windows Installer

```bash
npm run build:win              # NSIS installer via electron-builder
```

### Architecture

```
wealthflow/
  src/
    main/
      main.js                  # Electron main process
      database.js              # SQLite wrapper (sql.js)
      ai-service.js            # Claude AI integration
      ipc-handlers.js          # 100+ IPC channels
      preload.js               # Context bridge
      stock-service.js         # Stock quote fetching
      migrations/              # 8 sequential DB migrations
    renderer/
      js/
        app.js                 # App coordinator
        state.js               # State management + IPC bridge
        router.js              # 15-route SPA router
        canadian/
          constants.js         # Tax brackets, TFSA/RRSP/RESP limits
          calculators.js       # Tax, retirement, debt calculators
          formatters.js        # Canadian currency/date formatting
        pages/                 # Feature pages (15 routes)
        components/            # Shared UI components
        utils/                 # CSV/OFX/XLSX parsers, PDF generator
      styles/
        main.css               # App styling
        theme.css              # Dark/light theme tokens
    knowledge/
      alberta_tax_law.txt      # AI knowledge base
      debt_advice.txt          # AI financial guidance context
```

### Data Storage

Database stored at `%APPDATA%/wealthflow/wealthflow.db`. All financial data stays local on your machine — nothing is sent to the cloud except AI chat messages.

---

*Built by Scott Morley*
