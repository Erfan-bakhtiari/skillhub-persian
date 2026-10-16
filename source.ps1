param(
    [ValidateSet('start', 'stop', 'build', 'status', 'logs')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    $composeArgs = @('compose', '--env-file', '.env.source', '-f', 'compose.release.yml', '-f', 'compose.source.yml')
    switch ($Action) {
        'start' { & docker @composeArgs up -d --build --wait --wait-timeout 300 }
        'stop' { & docker @composeArgs down }
        'build' { & docker @composeArgs build }
        'status' { & docker @composeArgs ps }
        'logs' { & docker @composeArgs logs --tail 100 }
    }
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}
