# HealthSphere AI — Final Review Document

> **Project:** AI-Powered Family Health & Preventive Care Management Platform
> **Architecture:** Hybrid AI (Rules + Statistical Analytics + Explainable AI + Safety Layer) — deliberately no LLM in the clinical path
> **Stack:** Vanilla-JS PWA · Minimal-dependency Node.js (pg + tesseract.js) · PostgreSQL · nginx + Docker · GitHub Actions
> **Status verified:** 11/11 test suites pass · live server healthy on Postgres · auth-guarded APIs · CSP active

---

## 1. Project Status (verified)

| Check | Result |
|---|---|
| Test suites (10) | ✅ extraction, lft-layout, trends, rules, storage, research ×5 |
| Live boot | ✅ `/api/health` → `{ok:true, storage:"postgres"}` |
| Auth guard | ✅ `/api/family` without token → 401 |
| Database | ✅ PostgreSQL primary, JSON file fallback for dev/tests |
| Security headers | ✅ CSP, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy |
| CI/CD | ✅ GitHub Actions: syntax check → tests on real PG container → migration → a11y/ZAP scans; deploy/load-test steps self-skip until secrets are configured |
| Containers | ✅ docker-compose: nginx (SPA) + Node (API), healthchecks |

---

## 2. Codebase Structure

```
HealthSphere_AI/
├── frontend/                 ← Client (vanilla JS single-page app, no build step)
│   ├── index.html            ← App shell, PWA manifest, service worker registration
│   ├── sw.js                 ← Service Worker: offline shell, versioned cache
│   ├── css/styles.css        ← Design system (CSS variables, responsive, a11y)
│   └── js/
│       ├── app.js            ← Hash router, navigation shell, command palette
│       ├── api.js            ← fetch wrapper (JSON, credentials, errors)
│       ├── ui.js             ← Modal, toast, confirm dialog, SVG line charts
│       ├── views-*.js (16)   ← One module per screen (dashboard, family,
│       │                       reports, insights, lifestyle, consult, doctor,
│       │                       store, admin, research, care, auth…)
│       └── icons.js, hero-canvas.js, assistant.js (chat UI)
│
├── backend/
│   ├── server.js             ← Node http server: static SPA + /api dispatch
│   │                           + security headers + ETag cache + payload limit
│   ├── lib/
│   │   ├── api.js            ← Central router (regex routes, ~1095 lines)
│   │   ├── db.js             ← Persistence: PostgreSQL ⇄ JSON fallback
│   │   ├── auth.js           ← scrypt password hashing, session tokens
│   │   ├── ratelimit.js      ← Request throttling
│   │   ├── storage.js        ← File storage: local disk ⇄ Supabase ⇄ Cloudinary
│   │   ├── extraction.js     ← MODEL 1: lab-report entity extraction (25 analytes)
│   │   ├── pdftext.js        ← MODEL 1: dependency-free PDF text miner (zlib)
│   │   ├── ocr-server.js     ← MODEL 1: server OCR fallback (tesseract.js)
│   │   ├── trends.js         ← MODEL 2: regression trend + anomaly engine
│   │   ├── rules.js          ← MODEL 3: risk signals + SAFETY LAYER
│   │   ├── recommend.js      ← MODEL 3: specialty + screening guidance
│   │   ├── insights/explain.js ← Explainability helpers
│   │   ├── lifestyle.js      ← MODEL 4: BMR/TDEE, activity & meal plans
│   │   ├── assistant.js      ← Rule-based explainable chatbot
│   │   ├── research/         ← Research Hub (8 files): connectors, scheduler,
│   │   │                       normalize, schema, offline summarizer, store
│   │   ├── rag.js            ← RAG prototype over published articles (offline vectors)
│   │   │                       NOTE: module exists but is NOT wired to any API route yet
│   │   ├── hospitals.js      ← OpenStreetMap/Overpass nearby care
│   │   ├── reminders.js, timeline.js, seed.js, util.js, atomic.js
│   │   └── api-*.js          ← Feature routers: consult, doctor, store, admin2
│   ├── tests/                ← 11 test suites (node:test style, zero deps)
│   └── scripts/              ← reset, seed-admin, migrate-to-postgres, backfill
│
├── ml/                       ← Python pipeline (offline, separate from runtime)
│   ├── build_dataset.py      ← Synthetic contrastive triplets (no patient data)
│   ├── train.py              ← Fine-tune EmbeddingGemma-300M for retrieval
│   │                           (training NOT yet run — model access is gated, see ml/README.md)
│   └── evaluate.py           ← Recall@K / MRR / nDCG vs baseline
│
├── scripts/
│   ├── load-test.js          ← k6: 100 VUs, p95 < 500ms, error < 0.1%
│   └── migrate-to-postgres.mjs ← JSON → relational tables migration
│
├── .github/workflows/ci-cd.yml ← CI: syntax check → test on PG container → migrate → a11y/ZAP (deploy gated on secrets)
├── docker-compose.yml        ← One-command stack (nginx:8080 + node)
├── backend/Dockerfile        ← node:22-alpine, HEALTHCHECK /api/health
├── frontend/Dockerfile       ← nginx:1.27-alpine, /api proxy
├── api/index.js              ← Vercel serverless entry (same backend)
├── PRODUCTION_PLAN.md        ← 4-5 day launch plan; its 30-table schema is a FUTURE target (current: 10 tables)
└── PRODUCTION_PPT.md         ← Review presentation source
```

### Request flow (one line to remember)

```
Browser SPA (vanilla JS)
   → nginx (static files, gzip, cache headers, /api reverse proxy)
      → Node http server (security headers, payload limit)
         → api.js router (regex match) → auth guard (session token)
            → business logic (4 models + safety layer)
               → db.js (PostgreSQL, or JSON fallback)
                  ← JSON response → safety sanitize → UI render
```

---

## 3. The Four Models (core intelligence)

### Model 1 — Document Intelligence (`extraction.js`, `pdftext.js`, `ocr-server.js`)
- **Flow:** upload → validation → text extraction → entity extraction → unit/date normalization → reference-range evaluation → structured data → plain-language explanation.
- **PDF:** custom miner walks `stream…endstream`, inflates FlateDecode with Node `zlib` — no pdf library.
- **Photos:** browser OCR first (tesseract.js); if that fails, a local server-side Tesseract fallback runs. Either way the image goes to your own server for storage — no third-party OCR service is ever called.
- **25 analytes** with aliases, sex-specific bands, `lowIsBad` flags (HDL, eGFR, vitamins).
- **Prompt-injection guard:** instruction-like lines in documents are detected and dropped.
- **Why not LLM extraction:** an LLM can invent a number — unacceptable for health values. Regex is deterministic and testable.

### Model 2 — Health Trend Engine (`trends.js`)
- Same-day readings averaged → time series.
- **Least-squares regression** → slope per year → direction (increasing/decreasing/stable) using **per-metric significance thresholds** (HbA1c 0.1 %/yr, systolic BP 3 mmHg/yr…).
- **Sudden change:** ≥15 % jump between last two readings + absolute threshold.
- **Anomaly:** z-score of latest point vs history (needs n ≥ 4), |z| ≥ 2.
- **Stale detection:** no reading for 180+ days → data-completeness nudge.
- Confidence label from sample size (n ≥ 4 moderate-high … n = 2 low).
- **Why not ML/Prophet:** n < 100 points per user, needs explainability, must run dependency-free.

### Model 3 — Risk & Recommendation Engine (`rules.js`, `recommend.js`)
- Combines trend results + latest values + family history + age/BMI/lifestyle into **8 domain rules**: metabolic, cardiovascular, thyroid, kidney, nutrition, liver, sleep, stale-data.
- Signal fires only when `factors ≥ 2` or severity > 0; sorted attention → watch → info.
- Every signal carries `factors[]` (the "Why am I seeing this?") and a discussion-framed action.
- `recommend.js` maps signals → specialties (always "(discussion)", never "referral") + age/sex/family-aware screening checklist.
- **SAFETY LAYER (`safetySanitize`):**
  - banned words (diagnosis, prescribe, dosage, cure) stripped → "assess"
  - signals with zero factors are dropped (no explainability → no signal)
  - attention severity appends "seek professional evaluation"
  - fixed disclaimers attached: signals are pattern observations, not diagnoses.

### Model 4 — Lifestyle AI (`lifestyle.js`)
- Mifflin-St Jeor BMR → TDEE → goal-adjusted calories (±300/400 kcal).
- 4-week progressive activity plans, 7-day meal grids filtered by allergies, hydration targets from body weight, week-over-week insights.

### Supporting AI
- **Assistant (`assistant.js`):** rule-based chatbot — regex intents, reads only your records, explainable canned answers.
- **Research Hub (`research/`):** ingests Europe PMC, ClinicalTrials.gov, PubMed, WHO DON (key-less), normalizes, de-duplicates, classifies evidence; high-risk content (cure claims, outbreaks, preprints) held for human review; offline extractive summarizer (no API cost, never fabricates).
- **RAG (`rag.js`):** a prototype that retrieves top-k published articles using deterministic 256-dim hashed-token vectors (persisted index). **Status: implemented as a module but not yet wired into any API endpoint** — insights currently do not include RAG-grounded citations.

---

## 4. Tech Stack — Purpose, Why, Why Not

### Runtime & Backend

| Tech | Purpose | Why this | Why NOT alternatives |
|---|---|---|---|
| **Node.js ≥18 (vanilla `http`)** | API server, all logic | Built-in `fetch`, `zlib` (PDF), `crypto` (scrypt) — only 2 npm deps (pg, tesseract.js), no supply-chain sprawl, instant boot, runs anywhere | **Express/Fastify:** dependency for what `http` does; **Python/FastAPI:** two-language split, needs Celery/Redis for jobs, slower cold start |
| **Regex router (`api.js`)** | Endpoint routing | Full control, no middleware magic, easy to audit | **Express router:** unnecessary abstraction at this scale |

### Database

| Tech | Purpose | Why this | Why NOT alternatives |
|---|---|---|---|
| **PostgreSQL (`pg`)** | Primary store - 10 tables (3 core + JSONB collections + 7 account/consult tables), primary keys (rows are loaded into memory at boot; no per-request query layer yet) | ACID for medical records, joins, JSONB for flexible fields, PITR backups, pgvector available | **MongoDB:** no relational integrity; **SQLite:** single-writer limits; **Firebase:** lock-in, weak complex queries |
| **JSON file fallback** | Dev/test/graceful degradation | `npm start` runs with zero infra; tests never need a DB | Production: no concurrent safety → hence PG primary (dual-mode in `db.js`) |

### Frontend

| Tech | Purpose | Why this | Why NOT alternatives |
|---|---|---|---|
| **Vanilla JS + hash router** | Whole SPA (16 views) | Zero build step, no toolchain failures, ~35 KB core, instant edits | **React/Vue:** build pipeline + bundle bloat for CRUD/charts; **Next.js:** SSR useless behind auth |
| **Hand-drawn SVG charts** | Trend visualization | Precise, themeable, ~200 lines | **Chart.js/D3:** 60–250 KB for simple line charts |
| **Service Worker (PWA)** | Offline shell, caching | Phone install without app store, instant repeat loads | **Native app (Capacitor):** later phase; web-first = zero-friction reach |
| **jsPDF (vendored)** | Client-side PDF export | Runs in browser, no server CPU | Server PDF (Puppeteer): 300 MB+ dependency |

### Document Intelligence

| Tech | Purpose | Why this | Why NOT alternatives |
|---|---|---|---|
| **Custom PDF miner** | Text from digital PDFs | ~100 lines, `zlib.inflateSync`, no deps | **pdf-parse/pdfjs:** 1–5 MB deps, version conflicts |
| **Tesseract.js (browser-first)** | OCR for photos/scans | Recognition runs in the browser by default (no server CPU); local server-side Tesseract fallback if browser OCR fails — **no external/cloud OCR provider in either path** | **Google Vision / Textract:** paid + health data leaves your deployment |
| **Regex entity extraction** | Parse 25 analytes, units, dates | Deterministic, explainable, unit-tested | **LLM extraction:** can hallucinate values |

### Intelligence Layer

| Tech | Purpose | Why this | Why NOT alternatives |
|---|---|---|---|
| **Least-squares regression** | Trend direction + significance | Explainable ("slope = X/year"), testable | **Prophet/ML:** Python runtime, overkill for small n |
| **Expert rules + safety layer** | Risk signals, never diagnoses | Full factor-level explainability, regulatory-safe | **LLM diagnosis:** hallucination + liability + black box |
| **Offline extractive summarizer** | Research summaries | Deterministic, free, schema-validated | **GPT API:** cost, rate limits, fabricated findings |
| **Hashed-token embeddings + RAG (prototype)** | Intended to ground insights in citations | 256-dim offline vectors, no infra, no egress — **module built but not yet wired to the API** | **Pinecone/Weaviate:** external service, cost, data egress |
| **PyTorch + EmbeddingGemma (ml/)** | Offline retrieval-ranking experiments | Recall@K/MRR harness, synthetic data only, never touches runtime — **training not yet run (model access gated)** | Training on patient data: privacy violation; large LLMs: 4 GB VRAM limit |

### DevOps & Infrastructure

| Tech | Purpose | Why this | Why NOT alternatives |
|---|---|---|---|
| **Docker Compose (2 containers)** | One-command prod-like stack | Separation: nginx edge vs node API; volumes keep data across rebuilds | Single container: no edge caching, coupled scaling |
| **nginx** | Static serving, gzip, immutable cache, /api proxy, 30 MB uploads | Battle-tested, 1 MB image | Node serving static: blocks event loop |
| **GitHub Actions** | CI/CD | Tests run against **real Postgres** (pgvector container) + migration — catches schema bugs pre-merge | Manual deploy: human error |
| **k6 load test** | 100 VUs, p95 < 500 ms, errors < 0.1 % | JS scripts, CI-ready, custom metrics | JMeter: heavy GUI; Locust: Python dep |
| **Vercel serverless entry** | Cheap auto-scaling hosting | Same codebase re-exported (`api/index.js`), no Docker needed | VM: overkill for MVP traffic |

### Security Choices

| Choice | Why | Alternative rejected |
|---|---|---|
| **scrypt** (Node crypto) | Memory-hard, zero native build | bcrypt/argon2: native compilation, supply chain |
| **Random session tokens** (HttpOnly cookie, 7 days) | Server-side revoke on logout | JWT: cannot revoke without extra infra |
| **Session table bounds** | Auto-trim (500 → 300) prevents unbounded growth | Redis sessions: extra service |
| **CSP + security headers** | XSS/clickjacking defense, inline-restricted | — |
| **Rate limiting** | Brute-force protection on auth/upload/feedback | — |
| **Consent toggles + audit log + JSON export + delete** | Privacy-by-design (GDPR/DPDPR baseline) | — |

---

## 5. Demo Flow (10 minutes)

1. **Open** `localhost:3000` → login `demo@healthsphere.ai / demo1234` (2 years seeded data).
   > "Working MVP, not slides. Hybrid AI architecture — deliberately no LLM."
2. **Dashboard** — unified signals, trends, next steps.
3. **Family tree** — click any node → detail modal → Edit record / Add relative / Remove; HbA1c 5.4→5.7→6.0 shows "increasing" trend card.
4. **Insights** — metabolic signal with factors + "Why am I seeing this?" + screening checklist + specialty "(discussion)".
5. **Reports** - upload PDF → pipeline steps visible → extracted values feed trends; mention injection guard + browser-first OCR (server fallback, no third-party service).
6. **Rapid fire** — Lifestyle (BMR/TDEE), Timeline, Nearby Care (live OSM), Emergency mode, Settings (export/delete/audit).
7. **Tests** — `npm test` → 10 suites green.
8. **Close** — production plan (Postgres already live; MFA/reset/CI remaining) + ask evaluation criteria.

---

## 6. Likely Questions & Answers

| Question | Answer |
|---|---|
| Why no ChatGPT/LLM? | Cost, PHI egress, and hallucinated numbers are unacceptable in health; PRD requires explainability. LLM only where output is non-clinical — and we use offline extractive instead. |
| Why not React? | No build step, no toolchain failure modes; app is CRUD + charts — vanilla fits in 35 KB. |
| Is this "real" AI? | Yes - 4 models: document intelligence, statistical trend analysis, expert rules system, lifestyle engine (PRD §10 hybrid AI). An RAG/embedding layer is prototyped but not yet wired in. |
| How accurate is extraction? | Digital PDFs: deterministic regex bands; photos: human-in-the-loop review; every value traceable to source line. |
| Scale? | Stateless nginx + Node + PG → horizontal scale; k6 target 100 users p95 < 500 ms defined. |
| Data safety? | scrypt, revokeable sessions, CSP, injection guard, consent, audit log, export/delete; MFA + CSRF in production plan. |
| What's left? | MFA, password reset, email notifications, observability (Sentry/pino), load-test run, legal pages — see PRODUCTION_PLAN.md (61 tasks). |

---

## 7. Test & Quality Evidence

- **10 suites:** extraction, lft-layout (photographed tables), trends, rules, storage (local + Supabase + Cloudinary mocked), research ×5.
- **CI:** `node --check` syntax pass → `npm audit` → `npm test` against a pgvector PG16 container with a real migration run (`.github/workflows/ci-cd.yml`; deploy/load-test steps skip until secrets are configured).
- **Boot test:** `headless-boot.test.cjs` drives the SPA in jsdom against a running server (demo login → dashboard) — run separately with the server up.
- **Load:** k6 script written (`scripts/load-test.js`, login/upload/API groups, error-rate + latency metrics) — runs in CI only when the STAGING_URL secret is configured; not yet executed against a live staging URL.
- **Runtime:** `/api/health` returns storage mode + uptime for monitoring.

---

## 8. Production Roadmap (summary)

| Phase | Work | Priority |
|---|---|---|
| 0 Stabilize | env vars, git hygiene, CI green | ✅ must |
| 1 Database | Postgres migration (done in code — verify prod) | ✅ must |
| 2 Security | MFA, password reset, CSRF, rate limits, headers | ✅ must |
| 3 Email | Resend: reset, SOS, reminders, invites | ⚠️ high |
| 4 Observability | pino, Sentry, metrics, uptime alerts, deploy pipeline | ✅ must |
| 5 Legal | Privacy/ToS, DPIA, disclaimers, retention | ✅ must |
| 6 Launch | k6 pass, a11y (axe), mobile pass, deploy, hypercare | — |
| 7 Post-Launch | FHIR export, doctor portal v2, mobile app, embedding model | later |

---

*Document generated for final review — HealthSphere AI.*
