param(
    [string]$Payload = (Join-Path $PSScriptRoot 'dist\Rico Browser'),
    [string]$Output = (Join-Path $PSScriptRoot 'dist\Rico-Browser-Setup.exe'),
    [string]$Compiler = 'makensis.exe',
    [string]$Script = (Join-Path $PSScriptRoot 'RicoSetup.nsi')
)

$ErrorActionPreference = 'Stop'
$payloadPath = (Resolve-Path -LiteralPath $Payload).ProviderPath
$scriptPath = (Resolve-Path -LiteralPath $Script).ProviderPath
$outputPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Output)
foreach ($file in 'rico.exe', 'browser\rico.exe', 'assets\rico.ico', 'assets\ublock.xpi') {
    if (-not (Test-Path -LiteralPath (Join-Path $payloadPath $file) -PathType Leaf)) {
        throw "Fichier manquant dans Rico Browser : $file"
    }
}
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $outputPath) | Out-Null
$policy = Get-Content -LiteralPath (Join-Path $payloadPath 'browser\distribution\policies.json') -Raw | ConvertFrom-Json
$policy.policies.Homepage.URL = 'about:blank'
$policy.policies.ExtensionSettings.'uBlock0@raymondhill.net'.install_url =
    'https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/latest.xpi'
$policyPath = [IO.Path]::GetTempFileName()
try {
    [IO.File]::WriteAllText($policyPath, ($policy | ConvertTo-Json -Depth 100), (New-Object Text.UTF8Encoding($false)))
    & $Compiler /INPUTCHARSET UTF8 /WX "/DPAYLOAD=$payloadPath" "/DSETUP=$outputPath" "/DPOLICY=$policyPath" $scriptPath
    if ($LASTEXITCODE -ne 0) { throw "La compilation NSIS a echoue ($LASTEXITCODE)." }
} finally {
    Remove-Item -LiteralPath $policyPath -Force
}
