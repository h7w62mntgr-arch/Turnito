# Pide la contraseña de la base y la escribe en el .env, en DATABASE_URL y DIRECT_URL.
# La contraseña no se muestra en pantalla ni queda en el historial de la consola.

param(
  # Solo para pruebas automatizadas; en uso normal la contraseña se pide por teclado.
  [SecureString]$Password,
  [string]$EnvPath
)

$envPath = if ($EnvPath) { $EnvPath } else { Join-Path $PSScriptRoot "..\.env" }
if (-not (Test-Path $envPath)) { Write-Host "No encontre el archivo .env" -ForegroundColor Red; exit 1 }

$secure = if ($Password) { $Password } else { Read-Host "Pega la contrasena de la base (no se ve al escribir)" -AsSecureString }
$plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
  [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ([string]::IsNullOrWhiteSpace($plain)) { Write-Host "No ingresaste nada." -ForegroundColor Red; exit 1 }

# Ctrl+V en la consola de Windows no pega: mete caracteres de control.
if ($plain -match '[\x00-\x1F]') {
  Write-Host "Eso no parece una contrasena: Ctrl+V no pega en esta consola." -ForegroundColor Red
  Write-Host "Pega con clic derecho del mouse (o Ctrl+Shift+V) y volve a intentar." -ForegroundColor Yellow
  exit 1
}

# Los caracteres especiales van codificados para que la URL de conexión sea válida.
$encoded = [uri]::EscapeDataString($plain)

$lines = Get-Content $envPath -Encoding utf8
$updated = 0
$out = foreach ($line in $lines) {
  if ($line -match '^(DATABASE_URL|DIRECT_URL)="postgresql://([^:]+):([^@]*)@(.+)"$') {
    $updated++
    '{0}="postgresql://{1}:{2}@{3}"' -f $Matches[1], $Matches[2], $encoded, $Matches[4]
  } else { $line }
}

if ($updated -ne 2) {
  Write-Host "Esperaba 2 lineas de conexion y encontre $updated. No cambie nada." -ForegroundColor Red
  exit 1
}

Set-Content -Path $envPath -Value $out -Encoding utf8
Write-Host "Listo: contrasena guardada en las 2 lineas del .env" -ForegroundColor Green
