# add-hosts.ps1 - points flippy.cardadmin / flippy.cardserver at the Pi (Windows).
# Double-click or:  powershell -ExecutionPolicy Bypass -File .\add-hosts.ps1
# Self-elevates to Administrator (asks once).
$PI = "192.168.1.87"
$names = @("flippy.cardadmin", "flippy.cardserver")
$hosts = "$env:windir\System32\drivers\etc\hosts"

# Self-elevate if not running as admin.
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
         ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
  Start-Process powershell "-ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
  exit
}

$content = @(Get-Content $hosts -ErrorAction SilentlyContinue)
foreach ($n in $names) {
  # Drop any existing line for this name, then add a fresh one.
  $content = $content | Where-Object { $_ -notmatch "\s$([regex]::Escape($n))\s*$" }
  $content += "$PI`t$n"
}
Set-Content -Path $hosts -Value $content -Encoding ASCII
ipconfig /flushdns | Out-Null
Write-Host "OK -> http://flippy.cardadmin  y  http://flippy.cardserver  apuntan a $PI" -ForegroundColor Green
Read-Host "Enter para cerrar"
