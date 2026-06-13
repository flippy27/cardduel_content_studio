#!/usr/bin/env bash
# add-hosts.sh - points flippy.cardadmin / flippy.cardserver at the Pi (macOS / Linux).
#   ./add-hosts.sh        (will use sudo to edit /etc/hosts)
# Idempotent: re-running replaces the existing entries.
set -euo pipefail

PI="192.168.1.87"
NAMES=("flippy.cardadmin" "flippy.cardserver")
HOSTS="/etc/hosts"

for n in "${NAMES[@]}"; do
  # Drop any existing line for this name, then add a fresh one.
  sudo sed -i.bak "/[[:space:]]${n}\$/d" "$HOSTS"
  echo "$PI	$n" | sudo tee -a "$HOSTS" >/dev/null
done
sudo rm -f "${HOSTS}.bak"

# Flush DNS cache (macOS). No-op / ignored elsewhere.
if command -v dscacheutil >/dev/null 2>&1; then
  sudo dscacheutil -flushcache || true
  sudo killall -HUP mDNSResponder 2>/dev/null || true
fi

echo "OK -> http://flippy.cardadmin  and  http://flippy.cardserver  point to $PI"
