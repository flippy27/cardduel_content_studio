#!/usr/bin/env bash
# One-command deploy of CardDuel Content Studio to the Raspberry Pi (macOS / Linux).
#   ./deploy.sh
# Packs the source (no node_modules/dist/.git), copies it to the Pi over SSH,
# and rebuilds the container there with a same-origin API base. Uses the
# dedicated key ~/.ssh/notes_pi. Served by the Pi's Caddy as http://flippy.cardadmin.
set -euo pipefail

PI_HOST="${PI_HOST:-flippy@192.168.1.87}"
KEY="${KEY:-$HOME/.ssh/notes_pi}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TGZ="$(mktemp -t cardadmin_deploy.XXXXXX).tgz"

echo "==> Packing source..."
tar --exclude='*/node_modules' --exclude='./node_modules' --exclude='*/dist' \
    --exclude='./dist' --exclude='.git' --exclude='*.log' \
    -czf "$TGZ" -C "$ROOT" .

echo "==> Copying to $PI_HOST..."
scp -i "$KEY" -o StrictHostKeyChecking=accept-new "$TGZ" "${PI_HOST}:/tmp/cardadmin.tgz"

echo "==> Extracting + building on the Pi (first build is slow on ARM)..."
ssh -i "$KEY" "$PI_HOST" 'bash -s' <<'REMOTE'
set -e
mkdir -p ~/cardadmin
# A tgz packed on another OS can trigger benign timestamp/owner warnings on the
# Pi's GNU tar (nonzero exit even though extraction succeeds) — tolerate those.
tar xzmf /tmp/cardadmin.tgz -C ~/cardadmin --no-same-owner --warning=no-timestamp || echo "tar warnings ignored"
rm -f /tmp/cardadmin.tgz
cd ~/cardadmin
# buildx/compose on this ARM Pi sometimes returns a nonzero (provenance/metadata
# noise) even when the build + container start succeed, so don't trust its exit
# code under set -e — verify the container is actually running instead.
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build || echo "compose exit was nonzero (often benign on ARM); verifying..."
# Ship this app's edge route to the shared, repo-independent edge dir and reload.
mkdir -p ~/edge/sites
cp ~/cardadmin/caddy/flippy.cardadmin.caddy ~/edge/sites/flippy.cardadmin.caddy
docker exec edge-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
  && echo "edge caddy reloaded" || echo "edge caddy not running yet (snippet staged)"
sleep 3
docker ps --filter name=cardadmin-cardduel-content-studio --filter status=running --format '{{.Names}}' | grep -q cardadmin \
  && echo "DEPLOY_OK" || { echo "DEPLOY_FAIL: container not running"; docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=30; exit 1; }
REMOTE

rm -f "$TGZ"
echo "==> Done -> http://flippy.cardadmin (or http://192.168.1.87:5174)"
