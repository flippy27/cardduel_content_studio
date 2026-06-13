# CardDuel Content Studio — Handoff

Context for the next person/agent picking this up. Last updated 2026-06-12.

## What this is
A React + TypeScript + Vite admin UI ("Content Studio") for authoring game content
in the **CardDuel.ServerApi** backend: cards, abilities, decks, crafting recipes,
game rulesets, player inventory/cards, and a schema explorer. Served as a static
SPA by nginx (Docker). Internal tool, runs on a home LAN over plain HTTP.

## Tech stack
- React 19, TypeScript, Vite 8, pnpm.
- No CSS framework — plain CSS with design tokens in `src/styles.css` (`:root`).
- Icons: `lucide-react`. HTTP client: custom `fetch` wrapper (`src/api/http.ts`).
- Runtime: multi-stage Docker → nginx:1.27-alpine serving `dist/`.

## Backend it talks to
- **CardDuel.ServerApi** (.NET, separate repo at `../CardDuel.ServerApi`). Read-only
  for context; **do not edit it from here** (owner's rule).
- Runs on the Raspberry Pi, host port **5000**, routes under `/api/v1/`.
- JWT bearer auth. **Tokens expire after 1 hour** → stale token = `401`; re-login.
- Seeded login (baked into the form for one-click): `playerone@flippy.com` / `123456`.
- API surface used: `src/api/cardduel.ts`. Enum→label maps: `src/domain/constants.ts`.

## How the frontend connects (no CORS)
- Prod build bakes `VITE_API_BASE_URL=/` → the app calls `/api/v1/...` **same-origin**.
- The studio's own nginx proxies `/api/*` and `/hubs/*` to `API_UPSTREAM`
  (`192.168.1.87:5000` in prod). `nginx.conf` is an **envsubst template**
  (`${API_UPSTREAM}`) copied to `/etc/nginx/templates/default.conf.template`.
- Result: browser only talks to one origin → zero CORS, no server changes.
- Local dev (`docker-compose.yml` alone): `VITE_API_BASE_URL=http://localhost:5000`,
  `API_UPSTREAM=host.docker.internal:5000`.

## Deploy (one command)
- Windows: `.\deploy.ps1`  ·  macOS/Linux: `./deploy.sh`
- Packs source (tar, excludes node_modules/dist/.git) → scp to Pi `~/cardadmin`
  → `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
- SSH: `flippy@192.168.1.87`, key `~/.ssh/notes_pi`. Published on Pi host port **5174**.
- Deploy scripts are hardened: tolerate benign tar warnings + noisy ARM buildx exit
  codes, and confirm success via a `DEPLOY_OK` sentinel (container actually running),
  NOT the ssh exit code. If you see `DEPLOY_FAIL`, the container didn't start.

## Hostname / reverse proxy (edge, repo-independent)
- Pi port 80 is served by a **shared edge Caddy** living at `~/edge/` on the Pi
  (its own compose stack, container `edge-caddy`) — NOT inside any app repo.
- `~/edge/Caddyfile` does `import /etc/caddy/sites/*.caddy`. Each app drops its own
  snippet in `~/edge/sites/`:
  - `notes.caddy` → flippy.notes (notes_taking_app)
  - `cardserver.caddy` → flippy.cardserver (the CardDuel API)
  - `cardadmin.caddy` → flippy.cardadmin → 192.168.1.87:5174 (THIS app)
- This app OWNS its route: `caddy/flippy.cardadmin.caddy` is versioned here and
  `deploy.ps1/.sh` scp it to `~/edge/sites/` + `caddy reload` every deploy.
- Per-machine hostname resolution: run `add-hosts.ps1` (Windows, self-elevates) or
  `add-hosts.sh` (mac/Linux) → maps `flippy.cardadmin` + `flippy.cardserver` to the Pi.
- Access: **http://flippy.cardadmin** (or http://192.168.1.87:5174 directly).
- ⚠️ `notes.caddy` / `cardserver.caddy` currently live ONLY on the Pi (no repo).
- ⚠️ The notes_taking_app stack still DEFINES a `caddy` service in its
  `docker-compose.prod.yml`; it was `docker compose stop`ped so the edge Caddy owns
  :80. If notes is redeployed it will fight for port 80 — remove that `caddy` service
  from the notes repo (outside this repo; the owner must do it).

## Feature status
| View | Status | Notes |
|------|--------|-------|
| Dashboard | ✅ works | stats + faction/rarity bars + recent cards |
| Card Studio | ✅ works | create + **edit** + delete; filterable `CardFilterGrid` selector; drag abilities |
| Abilities | ✅ works | not yet refactored to shared components (cosmetic) |
| Deck Builder | ✅ works | `CardFilterGrid` (drag+click), 20–30 cards, ≤3 copies |
| Crafting | ✅ works | full-catalog selector + "Solo craftables" toggle; set requirements (PUT) |
| Inventory | ✅ works | grant item (category filter) + grant card (grid) + inventory & collection views |
| Rulesets | ✅ works | uses `CatalogItem`/`FormGrid` |
| Schema | ✅ works | read-only `database-schema` dump |
| Visual Profiles | ❌ DEAD | server endpoint removed (404). Nav item removed; `VisualProfileStudio.tsx` kept but unreachable |

## Important findings / gotchas
- **Visual templates removed server-side**: `GET /api/v1/authoring/card-visual-profile-templates`
  → 404. `AuthoringController` now only has lookups/effect-kinds/status-effect-kinds/database-schema.
  All feature loaders use `Promise.allSettled` (not `Promise.all`) so one dead endpoint
  can't blank a whole view (this was why Card Studio's catalog looked empty).
- **Non-secure context (HTTP)**: `crypto.randomUUID` / `crypto.subtle` are unavailable
  and throw on plain HTTP. `App.tsx` `notify()` uses a `Date.now()+random` id instead.
  Don't introduce `crypto.*` secure-only APIs.
- **"Craftable" is not a card flag** — a card is craftable iff it has crafting
  requirements rows. `GET /api/v1/crafting/cards` only returns already-configured cards.
- Inventory grant endpoints DO work (200/201); the earlier "not working" was a frontend
  UX gap (no reload + the crypto crash), now fixed.
- TypeScript build needed `moduleResolution: bundler` (was deprecated `node10`) and
  `@types/node` for the vite config typecheck.

## Design system (UI)
- Dense, sharp, dark — modeled on `../emulators/ocpp-ws-simulator` (violet `#8b5cf6`
  on near-black `#0f1117`, 13px type, ~5px radius, 32px controls).
- **Single source of truth**: tokens in `src/styles.css` `:root`. Restyle globally by
  editing tokens; class names are stable so all features restyle without JSX changes.
- **Shared components** in `src/components/ui.tsx`: `cn`, `Button` (has `size="sm"`),
  `Card`, `Field/Input/Select/Textarea`, `Badge`, `EmptyState`, `Stat`, `Toolbar`,
  `Modal`, `SectionHeading`, `SplitLayout`, `FormGrid`, `ScrollList`, `CatalogItem`, `EffectRow`.
- **`src/components/CardFilterGrid.tsx`**: reusable filterable card browser (faction/
  rarity/type/mana icon-button filters + search → compact draggable mini-card grid).
  Used by Deck Builder, Card Studio, Crafting, Inventory.

## What's left / nice-to-haves
- Refactor remaining features (AbilityLibrary, Dashboard, SchemaExplorer, the dead
  VisualProfileStudio) to the shared components for consistency (cosmetic only).
- If the backend re-adds visual-profile-templates, re-add the "Visual Profiles" nav
  item in `src/components/Layout.tsx` and the Card Studio template dropdown.
- HTTPS is not set up (LAN HTTP only) — that's why crypto secure APIs are off-limits.
- No CI; deploy is manual one-command. Consider git-hook/webhook auto-deploy later.
- Move the edge Caddy config (`~/edge`) into its own infra repo, and remove the
  `caddy` service from the notes_taking_app repo to avoid the :80 conflict.

## Quick commands
```powershell
# Build locally (verify it compiles)
docker compose build
# Deploy to the Pi
.\deploy.ps1
# Per-machine hostname
.\add-hosts.ps1
# Pi ops
ssh -i ~/.ssh/notes_pi flippy@192.168.1.87 "cd ~/cardadmin && docker compose ps"
ssh -i ~/.ssh/notes_pi flippy@192.168.1.87 "cd ~/edge && docker compose ps"
```

## Export utility
A descriptive CSV of all 200 cards (for generating art) was produced at
`C:\Users\Flippy\Downloads\tempcards\cards.csv` (columns include faction theme +
an `artBrief` line per card). Regenerate by fetching `GET /api/v1/cards` and mapping
the enums from `src/domain/constants.ts`.
