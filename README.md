# CardDuel Content Studio

UI React + TypeScript para authoring del backend `CardDuel.ServerApi`.

La app está pensada para no crear contenido escribiendo JSON a mano: permite crear cartas, reutilizar abilities con drag & drop, crear effects, configurar visual profiles, armar decks, definir crafting requirements, entregar items/cartas al jugador autenticado y revisar schema docs.

## Backend leído

Este frontend usa los endpoints reales del proyecto:

- `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
- `GET/POST/PUT/DELETE /api/v1/cards`
- `POST /api/v1/cards/{cardId}/abilities`
- `GET/POST/PUT/DELETE /api/v1/abilities`
- `GET /api/v1/authoring/lookups`
- `GET/POST /api/v1/authoring/card-visual-profile-templates`
- `POST /api/v1/authoring/cards/{cardId}/visual-profile-template-assignments`
- `GET /api/v1/authoring/database-schema`
- `PUT /api/v1/decks`
- `GET/PUT /api/v1/crafting/cards/{cardId}/requirements`
- `GET /api/v1/items`
- `POST /api/v1/players/{userId}/inventory/grant`
- `POST /api/v1/players/{userId}/cards/grant`
- `GET/POST/PUT /api/v1/game-rulesets`

## Ejecutar en desarrollo

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Por defecto espera el backend en:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

El backend debe tener CORS habilitado para `http://localhost:5173`, que tu `Program.cs` ya contempla.

## Build productivo

```bash
pnpm build
pnpm preview
```

## Docker

```bash
docker build -t cardduel-content-studio \
  --build-arg VITE_API_BASE_URL=http://localhost:5000 .

docker run --rm -p 5173:80 cardduel-content-studio
```

O con compose:

```bash
VITE_API_BASE_URL=http://localhost:5000 docker compose up --build
```

## Cómo usarlo

1. Inicia tu backend `CardDuel.ServerApi`.
2. Abre Content Studio.
3. Configura `Backend URL`.
4. Haz login o registra usuario.
5. En **Ability Library**, crea abilities reutilizables.
6. En **Card Studio**, crea una carta y arrastra abilities al drop zone.
7. En **Deck Builder**, arrastra cartas al deck y guarda cuando cumpla reglas.
8. En **Crafting Studio**, define los items necesarios por carta.

## Nota sobre abilities en cartas

El backend `POST /api/v1/cards/{cardId}/abilities` reutiliza una ability existente si `abilityId` ya existe y crea la relación con la carta. Por eso el drag & drop manda el contrato completo de la ability, pero el backend no duplica si ya existe.

## Estructura

```text
src/
  api/              Cliente HTTP y métodos por endpoint
  components/       Layout, UI base y Drag/Drop nativo
  domain/           Tipos y enums del backend
  features/         Vistas productivas de authoring
```
