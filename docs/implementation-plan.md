# Dev Market Shift Oracle — Implementation Plan

## Status

- **Phase 0–5:** complete
- **Phase 3:** complete with **RemoteOK + Jobicy** as active sources
  - HH public vacancy search closed (403 since Apr 2026) — deactivated
  - Remotive Cloudflare-blocked — deactivated
- **Phase 4:** complete — RoleClassifier (8 clusters), SkillExtractor, evidence + skills on sync
- **Phase 5:** complete — DailyRoleMetric / DailySkillMetric, market + skills APIs, forecast + backtest + explain
- **Phase 6:** complete — Ant Design UI (5 pages), RTK Query, ECharts, source/period filters
- **Phase 7:** complete — README (RU), screenshots, Docker Compose full stack, quality gates

## Product summary

**Dev Market Shift Oracle** analyzes developer vacancies and shows how demand shifts across **eight** role segments (forecastable objects):

1. Frontend (`FRONTEND`)
2. Fullstack (`FULLSTACK`)
3. Backend (`BACKEND`)
4. Mobile (`MOBILE`)
5. DevOps / Platform (`DEVOPS`)
6. ML / AI (`ML_AI`)
7. AI-first Developer (`AI_FIRST`)
8. Data Engineering (`DATA_ENGINEERING`)

Plus analytical bucket `UNCLASSIFIED` (excluded from market share).

Core question (not clickbait):

> How is demand changing across core engineering and AI-related roles, and which skills become mandatory inside each segment?

Hypothesis to **test with data** (not assert as fact): the market raises profile requirements; pure frontend may gradually transform into hybrid frontend + backend / data / AI tooling. Broader clusters (backend, mobile, devops, data eng) provide contrast and a clear object list for forecasts.

Languages:

- Code, DTOs, API, technical docs identifiers: **English**
- Application UI: **Russian**
- Product README (Phase 7): **Russian**

---

## Final monorepo structure

pnpm workspaces. **No TurboRepo** (two apps + one thin package; root scripts are enough).

```text
.
├── apps/
│   ├── api/                         # NestJS + Prisma + BullMQ
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── config/
│   │   │   ├── database/
│   │   │   ├── health/
│   │   │   ├── sources/
│   │   │   │   ├── providers/     # VacancySourceProvider interface
│   │   │   │   ├── hh/            # HhClient, mapper, types
│   │   │   │   └── remotive/      # RemotiveClient, mapper, types
│   │   │   ├── sync/
│   │   │   ├── vacancies/
│   │   │   ├── taxonomy/          # role classifier + query/taxonomy configs
│   │   │   ├── skills/            # skill extractor + dictionary
│   │   │   ├── analytics/
│   │   │   ├── forecast/
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   └── web/                         # Vite + React + Ant Design
│       ├── src/
│       │   ├── app/                 # router, store, theme, providers
│       │   ├── pages/               # Overview, Trends, Skills, Forecast, Data
│       │   ├── features/            # RTK Query, sync polling
│       │   ├── widgets/             # KPI, charts, caveats
│       │   └── shared/
│       ├── Dockerfile
│       └── package.json
├── packages/
│   └── shared-types/                # enums + REST response shapes (no Prisma)
├── infra/
│   ├── docker-compose.yml           # postgres, redis; api+web via --profile full
│   └── docker/                      # optional shared scripts
├── docs/
│   ├── implementation-plan.md       # this file
│   └── screenshots/                 # UI captures for README
├── .env.example
├── package.json
├── pnpm-workspace.yaml
├── eslint / prettier config
├── AGENTS.md
└── README.md
```

### Nest modules (API)

| Module      | Responsibility                                       |
| ----------- | ---------------------------------------------------- |
| `app`       | root wiring                                          |
| `config`    | env validation (`@nestjs/config` + schema)           |
| `health`    | `/health`, `/health/ready`                           |
| `database`  | Prisma module/service                                |
| `sources`   | HH + Remotive clients behind `VacancySourceProvider` |
| `sync`      | SyncRun API + BullMQ processor                       |
| `vacancies` | normalized vacancies, repositories                   |
| `taxonomy`  | role classifier + query/taxonomy configs             |
| `skills`    | skill dictionary + extractor                         |
| `analytics` | daily metrics, overview/trends/compare               |
| `forecast`  | models, backtest, forecast APIs                      |
| `common`    | filters, interceptors, utils, constants              |

Principles: thin controllers; domain services independent of provider HTTP DTOs; Prisma not exposed in controllers; UTC storage; ISO 8601 in API; idempotent sync.

---

## Package list

### Root

- `pnpm` workspaces
- `typescript`
- `eslint`, `prettier`, `eslint-config-prettier`
- `husky`, `lint-staged`

Root scripts (target):

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:api
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm docker:up
pnpm docker:down
```

### `apps/api`

- NestJS (strict TypeScript)
- Prisma + PostgreSQL
- Redis + BullMQ (`@nestjs/bullmq`)
- `@nestjs/config`, `@nestjs/swagger`, `@nestjs/throttler`
- `@nestjs/axios` or native fetch for HH + Remotive
- class-validator + class-transformer
- pino + nestjs-pino
- helmet, compression
- Jest + Supertest
- optional: `@nestjs/terminus`

Prisma schema lives **only** in `apps/api`.

### `apps/web`

- React + TypeScript strict + Vite
- React Router
- Redux Toolkit + RTK Query
- **Ant Design (`antd`)**
- Apache ECharts + `echarts-for-react`
- React Hook Form + Zod
- dayjs
- Prefer `antd` Table over TanStack Table unless a custom grid is required
- MSW — isolated frontend tests/dev only; **not** a substitute for backend in the main user flow

### `packages/shared-types`

- Shared enums (`RoleCluster` with 8 clusters + `UNCLASSIFIED`, `SyncStatus`, periods, forecast statuses)
- REST DTO / response shapes used by web + documented in Swagger
- **Must not** re-export Prisma Client types to the frontend

### Explicitly out of MVP

Turbo, GraphQL, Kafka, Elasticsearch, auth/login, microservices, LLM for classification/forecast, scraping, financial/career guarantees.  
**Do not** import full external specialty catalogs (HH professional_roles, Remotive category dump) as product clusters.

---

## Key technical decisions

### UI

- **Ant Design instead of MUI.**
- Charts: **ECharts**.
- Light theme required; dark optional. Avoid “AI purple gradient” aesthetics.
- Forecast UI shows an explicit **list of 8 segments** as forecastable objects, then a forecast card per selected cluster.
- Filters: period, segment, **source** (`HH` | `REMOTIVE` | `ALL`).

### Data sources (two independent providers)

Required by the Future Oracle brief: **≥ 2 real sources**.

| Code       | Provider                                                     | Role in product                   |
| ---------- | ------------------------------------------------------------ | --------------------------------- |
| `HH`       | HeadHunter Public API (`https://api.hh.ru`, host `hh.ru`)    | CIS / local vacancy market signal |
| `REMOTIVE` | Remotive public API (`https://remotive.com/api/remote-jobs`) | Global remote tech vacancy signal |

**HH streams (still two endpoints, one Source):**

1. Search vacancies — discovery + counts by query profiles
2. Vacancy details — full text for skills + classification

**Remotive streams:**

1. Job list / search (`/api/remote-jobs` with `search`, optional `category`, `limit`)
2. Optional categories endpoint for ingestion hints only — **not** product taxonomy

Rules:

- Always send HH `User-Agent` from env.
- Remotive: respect public rate guidance (low RPS; attribute Remotive in README/UI caveats).
- **No vacancy-source calls from the browser** — only via backend.
- Pagination / limits / concurrency / retry / 429/5xx for both providers.
- Persist **raw JSON**, request time, query profile (or remotive search params), source, HTTP status, payload hash.
- Domain behind `VacancySourceProvider`; `HhClient` and `RemotiveClient` both implement it.
- Metrics and forecasts always carry `sourceId` (or aggregate `ALL` explicitly) so HH vs Remotive bias is visible.
- Caveats: Remotive = remote/global bias; HH = RU/CIS bias; vacancy ≠ whole labor market.

### Role clusters (forecastable objects)

Product taxonomy is **curated in code**, not scraped from an open specialty dictionary.

| Cluster            | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `FRONTEND`         | UI / client engineering                                    |
| `FULLSTACK`        | hybrid FE+BE                                               |
| `BACKEND`          | server / API engineering                                   |
| `MOBILE`           | iOS / Android / RN / Flutter                               |
| `DEVOPS`           | infra, CI/CD, platform, SRE-ish signals                    |
| `ML_AI`            | classical ML / DS / model training                         |
| `AI_FIRST`         | LLM / RAG / agents / GenAI / MCP                           |
| `DATA_ENGINEERING` | pipelines, warehouses, ETL/ELT                             |
| `UNCLASSIFIED`     | below threshold / conflicting — excluded from market share |

**List for the UI:** these 8 clusters (not hundreds of HH roles).  
Skills remain a second analytics slice (`/skills`), not the primary forecast object list in MVP.

### Sync pipeline (MVP)

- Queue: `market-sync`
- One BullMQ job `run-sync` can sync **one or both** active sources (config / request body: `sourceCodes?: string[]`).
- Stages: search/list → raw → dedupe (`source + externalId`) → details/enrich when needed → normalize → classify → skills → metrics → forecasts.
- Attempts: 3, exponential backoff; limited job retention.
- **At most one** active full sync at a time.
- Limits via env per source (pages/profiles/details/concurrency).

Statuses: `QUEUED` → `RUNNING` → `COMPLETED` | `PARTIALLY_COMPLETED` | `FAILED`.

### Classification

- Deterministic keyword dictionary with weights; title > description; phrases > single tokens; negative signals.
- Dictionaries extended for `BACKEND`, `MOBILE`, `DEVOPS`, `DATA_ENGINEERING`.
- One primary cluster + evidence rows; low score → `UNCLASSIFIED`.
- Close top-1 / top-2 → lower confidence.
- AI-first requires strong LLM/RAG/agent/GenAI/MCP signal (or AI + engineering combo), not a casual “we use AI” mention.

### Skills

- Dictionary-based extraction (aliases → canonical name), no LLM in MVP.
- Expand starter dictionary for new clusters (e.g. Kotlin/Swift, Kubernetes/Terraform, Spark/dbt/Airflow already partly present).
- Return name + frequency; do not claim growth without enough data.

### Salary

- No currency conversion in MVP; aggregate per currency (HH often RUB; Remotive may be USD/EUR/other or missing).
- Always expose salary coverage rate.
- Cross-source salary comparison is **not** asserted as apples-to-apples without coverage caveats.

### Analytics & forecast

- Metrics by date + role cluster (+ source filter).
- Periods: 7d / 30d / 90d.
- Insufficient history → `INSUFFICIENT_HISTORY`.
- Forecast MVP: rolling average + linear trend; optional smoothing only if history ≥ threshold; simple backtest chooses/evaluates.
- Persist model metadata, risks, explanation, backtest (how the system knows it was wrong).
- Honest copy: forecast on available multi-source vacancy sample — not a statement about the whole profession.

### Quality gate after every phase

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Do not hide failures; fix or document why a check cannot pass yet.

---

## Schema / seed delta (before or inside Phase 3 start)

Phase 2 shipped HH + 4 clusters. Apply a focused delta:

1. Extend Prisma `RoleCluster` enum: `BACKEND`, `MOBILE`, `DEVOPS`, `DATA_ENGINEERING`.
2. Extend `SkillCategory` as needed (or map new skills into existing categories carefully).
3. Seed Source `REMOTIVE` (`code=REMOTIVE`, baseUrl `https://remotive.com`).
4. Expand `QUERY_PROFILES` for new clusters (HH search texts + Remotive search profiles / category hints).
5. Expand `SKILL_DICTIONARY` + shared-types `RoleCluster`.
6. Update taxonomy unit tests.
7. Re-run migration + seed (idempotent upserts).

Do **not** rewrite working Phase 1–2 foundation unrelated to this delta.

---

## Phased delivery (user gates)

| Phase     | Start command                      | Deliverable                                                                                                           |
| --------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 0         | done                               | Structure, packages, decisions                                                                                        |
| 1         | done                               | Workspace, Docker postgres/redis, health, Swagger, web stub                                                           |
| 2         | done                               | Full Prisma schema, HH seed, original taxonomy tests                                                                  |
| 2→3 delta | with Phase 3 (or explicit request) | Remotive source + 8 clusters in schema/seed/configs                                                                   |
| 3         | `start phase 3`                    | HhClient + RemotiveClient, raw records, SyncRun + BullMQ, sync APIs, real ingest from both sources (limited profiles) |
| 4         | `start phase 4`                    | Normalize, RoleClassifier (8 clusters), SkillExtractor, evidence, unit tests                                          |
| 5         | `start phase 5`                    | Daily metrics, overview/trends/skills APIs, forecast + backtest + explain (per cluster list)                          |
| 6         | `start phase 6`                    | Ant Design shell + 5 pages; segment list + forecast cards; source filter                                              |
| 7         | `start phase 7`                    | Full README (RU), screenshots, docker from scratch, quality gates                                                     |

### Phase 3 acceptance (updated)

- Manual sync starts via API; status pollable
- Raw payloads stored for **HH and Remotive**
- At least 1–2 query profiles per source import vacancies
- HH requests always include User-Agent
- Remotive requests stay backend-only; rate limits respected
- No browser calls to either source

### Minimal mandatory tests (later phases)

- Unit: classifier cases across 8 clusters; skill aliases; forecast insufficient/stable/growth; safe MAPE
- Integration: HH + Remotive clients (mocked HTTP); sync start; overview; validation; health

---

## Working with agents

### Recommended: one lead agent per phase

Single context, one branch, explicit `start phase N` gates.

### Specialized subagents inside a phase

| Subagent        | When                                               |
| --------------- | -------------------------------------------------- |
| explore         | Locate files/contracts before edits                |
| shell           | docker compose, migrate, test runs                 |
| security-review | After Phase 3 (no secrets, no browser→HH/Remotive) |
| bugbot          | After Phase 4–6 on diff                            |
| best-of-n       | Only contested slices (classifier weights)         |

### Agent rules

- UI in Russian; UI kit = Ant Design
- No HH / Remotive from browser
- No mocks in main user flow
- No `any` except validated boundaries
- Prisma not in controllers
- Product clusters are curated — do not auto-import full external role catalogs

---

## Environment variables (target `.env.example`)

```env
NODE_ENV=development

POSTGRES_DB=dev_market_oracle
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dev_market_oracle?schema=public

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

API_PORT=3000
WEB_PORT=5173
CORS_ORIGIN=http://localhost:5173

HH_BASE_URL=https://api.hh.ru
HH_USER_AGENT=DevMarketShiftOracle/1.0 (your-email@example.com)
HH_HOST=hh.ru
HH_REQUEST_TIMEOUT_MS=10000
HH_MAX_CONCURRENCY=2
HH_MAX_PAGES_PER_PROFILE=2
HH_DETAILS_LIMIT_PER_RUN=50
HH_REFRESH_AFTER_HOURS=24

REMOTIVE_BASE_URL=https://remotive.com
REMOTIVE_REQUEST_TIMEOUT_MS=10000
REMOTIVE_MAX_CONCURRENCY=1
REMOTIVE_DETAILS_LIMIT_PER_RUN=50
REMOTIVE_REFRESH_AFTER_HOURS=24

SYNC_MIN_HISTORY_DAYS_FOR_FORECAST=14
SYNC_FORECAST_HORIZON_DAYS=30
SYNC_DEFAULT_SOURCE_CODES=HH,REMOTIVE
```

Validate env on API startup. Do not commit real secrets. Remotive public API needs no key in MVP.

---

## Next step

All planned MVP phases (0–7) are complete. Optional follow-ups: scheduled sync, salary FX, extra sources if public APIs reopen.
