# Flagstone Intelligence Platform — Angular App

## Setup in VS Code (5 minutes)

### Step 1 — Open in VS Code
```
File → Open Folder → select flagstone-intelligence folder
```

### Step 2 — Install dependencies
Open terminal in VS Code (Ctrl+`) and run:
```bash
npm install
```

### Step 3 — Add your credentials
Open `src/environments/environment.ts` and replace:
- `YOUR_LYZR_API_KEY_HERE` → your Lyzr API key from studio.lyzr.ai/configure/api-keys
- `YOUR_MANAGER_AGENT_ID_HERE` → Manager Agent ID from Lyzr Studio URL

All 6 specialist agent IDs are already pre-filled.

### Step 4 — Fix import in app.module.ts
The Regulatory and Contracts components are in one file.
Open `src/app/app.module.ts` and update the import lines:
```typescript
import { RegulatoryComponent, ContractsComponent } from './features/regulatory/regulatory-contracts.component';
```

### Step 5 — Run the app
```bash
ng serve
```
Open: http://localhost:4200

---

## Project Structure
```
src/
├── app/
│   ├── core/
│   │   ├── models/models.ts          — All TypeScript interfaces
│   │   └── services/lyzr-agent.service.ts  — Core API service
│   ├── features/
│   │   ├── dashboard/                — Main dashboard with alerts
│   │   ├── monitor/                  — Rate monitoring
│   │   ├── onboarding/               — KYB onboarding
│   │   ├── fx/                       — FX pricing
│   │   ├── regulatory/               — Regulatory monitoring + Contracts
│   │   └── settlement/               — Settlement exceptions
│   ├── shared/components/
│   │   ├── alert-card/               — Reusable alert card
│   │   └── impact-badge/             — LOW/MEDIUM/HIGH/CRITICAL badge
│   ├── app.component.ts              — Navigation sidebar
│   ├── app.module.ts                 — Module declarations
│   └── app-routing.module.ts         — Route definitions
├── environments/
│   └── environment.ts                — API keys and Agent IDs
└── styles.css                        — Global styles
```

---

## Agent IDs (pre-configured)
| Agent | ID |
|---|---|
| Partner Bank Monitor | 6a1874f7da56d8978dfe6d0b |
| Institutional Onboarding | 6a1b4098f7a1eb202d6463d1 |
| Regulatory Monitor | 6a1c822167d6ab6e880b8db2 |
| Contract Review | 6a1c863f80c734da121493ca |
| FX Pricing | 6a1db8f2e1bb0f24d59a05bc |
| Settlement Exception | 6a1dc26d894f3fe88bd90740 |
| Manager (orchestrator) | Add your ID to environment.ts |

---

## API Reference
All agents use the same endpoint:
```
POST https://agent-prod.studio.lyzr.ai/v3/inference/chat
Headers: { x-api-key: YOUR_KEY }
Body: { user_id, agent_id, message, session_id }
```
