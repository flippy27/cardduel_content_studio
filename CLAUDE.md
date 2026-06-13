# CLAUDE.md

Guidance for Claude Code working in this repo. See `HANDOFF.md` for full state.

## Project
CardDuel Content Studio — a React 19 + TypeScript + Vite admin SPA for authoring
game content (cards, abilities, decks, crafting, rulesets, inventory) against the
**CardDuel.ServerApi** .NET backend. Served as a static site by nginx (Docker).
Internal tool on a home LAN over plain HTTP.

## Commands
- Local dev server: `pnpm dev` (or `vite --host 0.0.0.0`).
- Build / typecheck: `pnpm build` (`tsc -b && vite build`). Lint: `pnpm lint`.
- Build the Docker image (best way to verify a change compiles): `docker compose build`.
- Deploy to the Raspberry Pi: `.\deploy.ps1` (Windows) or `./deploy.sh` (mac/Linux).
- Always verify a change with `docker compose build` before deploying.

## Architecture
- `src/main.tsx` → `src/App.tsx` (auth/connection bar, toast `notify`, view router).
- `src/components/Layout.tsx` — sidebar nav + `PageHeader`. Nav keys = `ViewKey`.
- `src/features/*.tsx` — one file per view (Dashboard, CardStudio, AbilityLibrary,
  DeckBuilder, CraftingStudio, InventoryStudio, RulesetsStudio, SchemaExplorer;
  VisualProfileStudio is dead/unreachable).
- `src/api/cardduel.ts` — typed API methods; `src/api/http.ts` — `ApiClient` (fetch,
  bearer token, base-url normalize; empty/`"/"` base → relative same-origin).
- `src/domain/types.ts` — DTOs; `src/domain/constants.ts` — enum↔label maps
  (CARD_FACTIONS/RARITIES/TYPES, UNIT_TYPES, ALLOWED_ROWS, `labelFor`, `slugify`).
- `src/components/ui.tsx` — shared UI primitives + layout helpers (see below).
- `src/components/CardFilterGrid.tsx` — reusable filterable card browser.
- `src/components/DropZone.tsx` — `DragSource` (drag + optional onClick) / `DropZone`.

## Conventions
- **Styling**: plain CSS only. ALL colors/spacing/sizing are tokens in
  `src/styles.css` `:root`. Match existing class names; don't add a CSS framework.
  Dense/sharp/dark aesthetic (violet on near-black, 13px, ~5px radius, 32px controls).
- **Reuse the shared components** in `ui.tsx` (`SectionHeading`, `SplitLayout`,
  `FormGrid`, `ScrollList`, `CatalogItem`, `EffectRow`, `Button size="sm"`, `cn`,
  `Field/Input/Select/Textarea`, `Badge`, `EmptyState`, `Toolbar`, `Modal`) and
  `CardFilterGrid` instead of duplicating markup.
- **Data loading**: use `Promise.allSettled` for multi-resource loads so one failing
  endpoint can't blank the view (some authoring endpoints 404 — they were removed).
- **No secure-context APIs**: served over HTTP, so `crypto.randomUUID`/`crypto.subtle`
  throw. Don't use them (`notify()` already uses a safe id).

## Backend integration (do NOT edit the backend repo)
- CardDuel.ServerApi on the Pi, `:5000`, routes `/api/v1/...`, JWT bearer (1h expiry).
- Prod build is **same-origin** (`VITE_API_BASE_URL=/`); the studio's nginx proxies
  `/api/*` + `/hubs/*` to `${API_UPSTREAM}` (`192.168.1.87:5000`) → no CORS.
- Seeded login prefilled in the form: `playerone@flippy.com` / `123456`.
- A `401` usually means the JWT expired — re-login.

## Deploy & hostname
- `deploy.ps1/.sh` → tar+scp to Pi `~/cardadmin` → compose prod overlay, host port 5174.
  Hardened against ARM buildx noise; success = `DEPLOY_OK` sentinel, not exit code.
- A shared, repo-independent **edge Caddy** at `~/edge/` on the Pi owns :80 and routes
  `flippy.cardadmin` → 5174. This app ships its route via `caddy/flippy.cardadmin.caddy`.
- `add-hosts.ps1/.sh` map `flippy.cardadmin`/`flippy.cardserver` per machine.

## Scope rule
Only modify files inside this repo (`cardduel_content_studio`). The sibling repos
`../CardDuel.ServerApi` and `../notes_taking_app` are read-only for context — if a
change needs them, make this app self-contained and hand the owner a snippet.

## Gotchas (see HANDOFF.md for detail)
- Visual-profile-templates endpoint was removed server-side (404) → feature dead.
- "Craftable" = a card has crafting requirement rows, not a card flag.
- `moduleResolution: bundler` + `@types/node` are required for the build.
