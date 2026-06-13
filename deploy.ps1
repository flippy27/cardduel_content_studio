# One-command deploy of CardDuel Content Studio to the Raspberry Pi.
#   .\deploy.ps1
# Packs the source (no node_modules/dist/.git), copies it to the Pi over SSH,
# and rebuilds the container there with a same-origin API base. Uses the
# dedicated key ~/.ssh/notes_pi. Served by the Pi's Caddy as http://flippy.cardadmin.
param(
  [string]$PiHost = "flippy@192.168.1.87",
  [string]$Key    = "$env:USERPROFILE\.ssh\notes_pi"
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$tgz  = Join-Path $env:TEMP "cardadmin_deploy.tgz"

Write-Host "==> Packing source..." -ForegroundColor Cyan
tar --exclude='*/node_modules' --exclude='./node_modules' --exclude='*/dist' `
    --exclude='./dist' --exclude='.git' --exclude='*.log' `
    -czf $tgz -C $root .

Write-Host "==> Copying to $PiHost..." -ForegroundColor Cyan
scp -i $Key -o StrictHostKeyChecking=accept-new $tgz "${PiHost}:/tmp/cardadmin.tgz"

Write-Host "==> Extracting + building on the Pi (first build is slow on ARM)..." -ForegroundColor Cyan
$remote = @'
set -e
mkdir -p ~/cardadmin
tar xzmf /tmp/cardadmin.tgz -C ~/cardadmin --no-same-owner --warning=no-timestamp || echo tar-warnings-ignored
rm -f /tmp/cardadmin.tgz
cd ~/cardadmin
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build || echo compose-nonzero-verifying
mkdir -p ~/edge/sites
cp ~/cardadmin/caddy/flippy.cardadmin.caddy ~/edge/sites/flippy.cardadmin.caddy
docker exec edge-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null && echo edge-reloaded || echo edge-staged
sleep 3
docker ps --filter name=cardadmin-cardduel-content-studio --filter status=running --format "{{.Names}}" | grep -q cardadmin && echo DEPLOY_OK || echo DEPLOY_FAIL
'@
# buildx/compose on this ARM Pi can emit a nonzero exit even on success, so trust
# the DEPLOY_OK sentinel (container actually running) rather than the exit code.
$ErrorActionPreference = "Continue"
$out = ssh -i $Key $PiHost $remote 2>&1 | ForEach-Object { "$_" }
$out | ForEach-Object { Write-Host $_ }
if (-not ($out -match "DEPLOY_OK")) { throw "Remote deploy failed (container not running)" }

Remove-Item $tgz -ErrorAction SilentlyContinue
Write-Host "==> Done -> http://flippy.cardadmin (o http://192.168.1.87:5174)" -ForegroundColor Green
