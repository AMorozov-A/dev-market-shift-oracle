# Dev Market Shift Oracle — agent rules

- UI language: Russian. Code, DTOs, API, comments: English.
- UI kit: Ant Design (`antd`). Do not add MUI or Tailwind in MVP.
- Never call vacancy sources from the browser — only via `apps/api`.
- Active MVP sources: `REMOTEOK` and `JOBICY` (HH public search closed since Apr 2026; Remotive blocked by Cloudflare).
- Product role clusters are curated (8 segments + UNCLASSIFIED). Do not auto-import full external specialty catalogs as clusters.
- Do not use mocks for the main user flow when real API data is available.
- No `any` except validated boundary cases; prefer unknown + narrowing.
- Prisma belongs in repositories/services — not in controllers.
- Prefer small verified iterations; run lint, typecheck, test, build before claiming a phase done.
- Do not invent metrics, classifications, or forecasts — only computed results.
- Wait for explicit `start phase N` before starting the next phase.
