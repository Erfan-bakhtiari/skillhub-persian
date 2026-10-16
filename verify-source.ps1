$ErrorActionPreference = 'Stop'
$settings = @{}
Get-Content (Join-Path $PSScriptRoot '.env.source') | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') { $settings[$Matches[1]] = $Matches[2] }
}
$webBase = $settings['SKILLHUB_PUBLIC_BASE_URL']
$apiBase = "http://localhost:$($settings['API_PORT'])"

$health = Invoke-RestMethod "$apiBase/actuator/health" -TimeoutSec 15
if ($health.status -ne 'UP') { throw 'Backend health is not UP' }
Write-Output 'PASS: backend health UP'

$web = Invoke-WebRequest $webBase -TimeoutSec 15
if ($web.StatusCode -ne 200 -or $web.Content -notmatch 'SkillHub') { throw 'Web page did not load' }
Write-Output 'PASS: web page HTTP 200'

$capabilities = Invoke-WebRequest "$webBase/api/v1/auth/local/capabilities" -TimeoutSec 15
if ($capabilities.StatusCode -ne 200) { throw 'Nginx API proxy failed' }
Write-Output 'PASS: API through web proxy HTTP 200'

$session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$anonymous = Invoke-WebRequest "$webBase/api/v1/auth/me" -WebSession $session -SkipHttpErrorCheck -TimeoutSec 15
if ($anonymous.StatusCode -ne 401) { throw 'Anonymous auth/me did not return 401' }
Write-Output 'PASS: anonymous session HTTP 401'
$csrf = $session.Cookies.GetCookies([uri]$webBase) | Where-Object Name -eq 'XSRF-TOKEN' | Select-Object -Last 1
if (-not $csrf) { throw 'CSRF cookie missing' }
$loginBody = @{
    username = $settings['BOOTSTRAP_ADMIN_USERNAME']
    password = $settings['BOOTSTRAP_ADMIN_PASSWORD']
} | ConvertTo-Json
$login = Invoke-WebRequest "$webBase/api/v1/auth/local/login" -Method Post -WebSession $session -ContentType 'application/json' -Headers @{ 'X-XSRF-TOKEN' = [uri]::UnescapeDataString($csrf.Value) } -Body $loginBody -TimeoutSec 15
if ($login.StatusCode -ne 200) { throw 'Admin login failed' }
Write-Output 'PASS: admin login HTTP 200'

foreach ($path in @('/api/v1/auth/me', '/api/v1/namespaces', '/api/v1/admin/system-config/auth/local')) {
    $result = Invoke-WebRequest "$webBase$path" -WebSession $session -TimeoutSec 15
    if ($result.StatusCode -ne 200) { throw "Authenticated endpoint failed: $path" }
    Write-Output "PASS: $path HTTP 200"
}
