# Sube las variables del .env local a Vercel (production, preview y development).
# Los valores nunca se muestran en pantalla ni quedan en el historial de la consola.
#
# Antes de correrlo, una sola vez:
#   npx vercel login
#   npx vercel link
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File scripts\vercel-env.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\vercel-env.ps1 -DryRun   (solo muestra qué haría)

param(
  [switch]$DryRun,
  [string]$EnvPath
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
if (-not $EnvPath) { $EnvPath = Join-Path $root ".env" }

$KEYS = @(
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
)
$TARGETS = @("production", "preview", "development")

if (-not (Test-Path $EnvPath)) { Write-Host "No encontre $EnvPath" -ForegroundColor Red; exit 1 }

# --- Leer el .env ---
$values = @{}
foreach ($line in Get-Content $EnvPath -Encoding utf8) {
  if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
  $name = $line.Split("=", 2)[0].Trim()
  $value = $line.Split("=", 2)[1].Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }
  $values[$name] = $value
}

$missing = $KEYS | Where-Object { -not $values.ContainsKey($_) -or [string]::IsNullOrWhiteSpace($values[$_]) }
if ($missing) { Write-Host "Faltan en el .env: $($missing -join ', ')" -ForegroundColor Red; exit 1 }
if ($values["DATABASE_URL"] -match '\[YOUR-PASSWORD\]') {
  Write-Host "DATABASE_URL todavia tiene [YOUR-PASSWORD]. Corre primero scripts\set-db-password.ps1" -ForegroundColor Red
  exit 1
}

if ($DryRun) {
  Write-Host "Se subirian estas variables (valores ocultos):" -ForegroundColor Cyan
  foreach ($key in $KEYS) { "  $key = $($values[$key].Length) caracteres" }
  "  a los entornos: $($TARGETS -join ', ')"
  exit 0
}

# --- Verificar que el proyecto este vinculado ---
if (-not (Test-Path (Join-Path $root ".vercel\project.json"))) {
  Write-Host "El proyecto no esta vinculado a Vercel. Corre primero:" -ForegroundColor Yellow
  Write-Host "  npx vercel login"
  Write-Host "  npx vercel link"
  exit 1
}

# --- Subir cada variable ---
$tmp = [IO.Path]::GetTempFileName()
try {
  foreach ($key in $KEYS) {
    # Sin salto de linea al final: Vercel guardaria el \n como parte del valor.
    [IO.File]::WriteAllText($tmp, $values[$key], (New-Object Text.UTF8Encoding $false))
    foreach ($target in $TARGETS) {
      # Si ya existe, se borra primero: vercel env add no pisa valores.
      cmd /c "npx --yes vercel env rm $key $target --yes > nul 2> nul"
      cmd /c "npx --yes vercel env add $key $target < ""$tmp"" > nul 2> nul"
      if ($LASTEXITCODE -eq 0) { Write-Host "  OK   $key -> $target" -ForegroundColor Green }
      else { Write-Host "  FALLO $key -> $target" -ForegroundColor Red }
    }
  }
} finally {
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Listo. Ahora hace un redeploy para que las tome:" -ForegroundColor Cyan
Write-Host "  npx vercel --prod"
