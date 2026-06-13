# Despliegue en la Raspberry Pi (192.168.1.87)

El admin (CardDuel Content Studio) corre en la Pi vía Docker: **un solo
contenedor nginx** que sirve el SPA y además hace de proxy del backend. No
necesita CORS ni tocar el servidor CardDuel ni el stack de notes.

```
navegador → http://flippy.cardadmin   (edge Caddy :80 → 192.168.1.87:5174)
   → nginx del studio (5174)
      ├─ /api/*  /hubs/*  → 192.168.1.87:5000   (CardDuel.ServerApi, proxy interno)
      └─ resto            → SPA estático
```
También directo sin Caddy: `http://192.168.1.87:5174` (o `http://flippy.cardadmin:5174`).

El build hornea `VITE_API_BASE_URL=/` (ver `docker-compose.prod.yml`), así las
llamadas salen relativas (`/api/v1/...`) al **mismo origen**; nginx las reenvía
al servidor CardDuel (`API_UPSTREAM=192.168.1.87:5000`). Cero CORS.

## Pushear cambios desde el PC
Windows:
```powershell
.\deploy.ps1
```
macOS / Linux:
```bash
chmod +x deploy.sh add-hosts.sh   # solo la primera vez
./deploy.sh
```
Empaqueta el código (sin node_modules/dist/.git), lo copia por SSH a la Pi
(`~/cardadmin`) y corre
`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
Usa la clave `~/.ssh/notes_pi`. Un comando = deploy completo.

## Acceso por hostname en otros PCs / Macs
Cada equipo necesita resolver `flippy.cardadmin → 192.168.1.87`.

Windows (como Administrador, se auto-eleva):
```powershell
.\add-hosts.ps1
```
macOS / Linux:
```bash
./add-hosts.sh        # usa sudo para editar /etc/hosts
```
Luego abrí **http://flippy.cardadmin**. Sin tocar hosts también sirve
`http://192.168.1.87:5174`.

## Edge / reverse proxy (config fuera de las repos)
El :80 de la Pi lo sirve un **edge Caddy repo-independiente** en `~/edge/`, que
no pertenece a ninguna repo de app:
```
~/edge/
  Caddyfile              -> { auto_https off }  +  import /etc/caddy/sites/*.caddy
  docker-compose.yml     -> servicio caddy (container edge-caddy, :80)
  sites/
    notes.caddy          -> flippy.notes / 192.168.1.87  → :8070 / :3030
    cardserver.caddy     -> flippy.cardserver            → :5000
    cardadmin.caddy       (lo deja deploy.ps1/.sh del studio)  → :5174
```
Cada app aporta SU propio snippet. El de cardadmin **sí está versionado en esta
repo** (`caddy/flippy.cardadmin.caddy`) y `deploy.ps1`/`deploy.sh` lo copian a
`~/edge/sites/` y recargan el edge Caddy en cada deploy → sobrevive siempre.

Operar el edge:
```bash
ssh -i ~/.ssh/notes_pi flippy@192.168.1.87 "cd ~/edge && docker compose ps"
ssh -i ~/.ssh/notes_pi flippy@192.168.1.87 "docker exec edge-caddy caddy reload --config /etc/caddy/Caddyfile"
```

> ⚠️ **Acción tuya (repo notes, fuera de esta carpeta):** el caddy del stack de
> notes quedó **detenido** (`docker compose stop caddy`) porque el edge Caddy es
> el dueño del :80. Quitá el servicio `caddy` del `docker-compose.prod.yml` del
> repo local de notes; si no, un futuro `deploy` de notes intentará levantar su
> caddy y chocará por el puerto 80.

## Operación
```bash
ssh -i ~/.ssh/notes_pi flippy@192.168.1.87 "cd ~/cardadmin && docker compose ps"
ssh -i ~/.ssh/notes_pi flippy@192.168.1.87 "cd ~/cardadmin && docker compose logs --tail=50"
```
