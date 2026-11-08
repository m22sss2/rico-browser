param([string]$Installer)

$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$runtime = Join-Path $root 'browser'
$scratch = Join-Path $root ('.rico-update-' + [Guid]::NewGuid().ToString('N'))
$backup = Join-Path $scratch 'previous'
$binary = Join-Path $runtime 'rico.exe'

function Assert-Closed {
    $running = Get-Process -Name 'rico','firefox' -ErrorAction SilentlyContinue |
        Where-Object { $_.Path -eq $binary -or $_.Path -eq (Join-Path $runtime 'firefox.exe') }
    if ($running) { throw 'Fermez toutes les fenetres de Rico Browser avant la mise a jour.' }
}

function Assert-MozillaSignature([string]$path) {
    $signature = Get-AuthenticodeSignature -LiteralPath $path
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.GetNameInfo(
            [Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false
        ) -ne 'Mozilla Corporation') {
        throw "La signature Mozilla n'a pas pu etre validee : $path"
    }
}

try {
    Assert-Closed
    if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
        throw 'Le navigateur Rico est introuvable dans ce dossier.'
    }
    $sevenZip = Join-Path $env:ProgramFiles '7-Zip\7z.exe'
    if (-not (Test-Path -LiteralPath $sevenZip -PathType Leaf)) {
        $sevenZip = (Get-Command '7z.exe' -ErrorAction SilentlyContinue).Source
    }
    if (-not $sevenZip) { throw 'Installez 7-Zip pour mettre a jour Rico Browser.' }
    Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1')
    New-Item -ItemType Directory -Path $scratch | Out-Null
    if (-not $Installer) {
        $Installer = Join-Path $scratch 'FirefoxESR.exe'
        $url = 'https://download.mozilla.org/?product=firefox-esr-latest-ssl&os=win64&lang=fr'
        & curl.exe --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --output $Installer $url
        if ($LASTEXITCODE -ne 0) { throw 'Le telechargement Mozilla a echoue.' }
    }
    $Installer = (Resolve-Path -LiteralPath $Installer).ProviderPath
    Assert-MozillaSignature $Installer
    & $sevenZip x $Installer "-o$scratch" -y | Out-Null
    if ($LASTEXITCODE -gt 1) { throw "L'extraction de Firefox ESR a echoue." }

    $next = Join-Path $scratch 'core'
    $stockBinary = Join-Path $next 'firefox.exe'
    Assert-MozillaSignature $stockBinary
    $currentVersion = [version](Get-Item -LiteralPath $binary).VersionInfo.FileVersion
    $nextVersion = [version](Get-Item -LiteralPath $stockBinary).VersionInfo.FileVersion
    if ($nextVersion -lt $currentVersion) { throw 'Le paquet Mozilla est plus ancien que le navigateur actuel.' }
    Rename-Item -LiteralPath $stockBinary -NewName 'rico.exe'
    $branding = Start-Process -FilePath (Join-Path $root 'rico.exe') -ArgumentList @('--brand-runtime', ('"' + (Join-Path $next 'rico.exe') + '"')) -PassThru -Wait -WindowStyle Hidden
    if ($branding.ExitCode -ne 0) { throw "L'application de l'icone Rico a echoue." }
    Copy-Item -LiteralPath (Join-Path $runtime 'distribution') -Destination $next -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $runtime 'rico.cfg') -Destination $next -Force
    Copy-Item -LiteralPath (Join-Path $runtime 'defaults\pref\rico.js') -Destination (Join-Path $next 'defaults\pref') -Force
    $icon = 'browser\chrome\icons\default\main-window.ico'
    $nextIcon = Join-Path $next $icon
    New-Item -ItemType Directory -Path (Split-Path $nextIcon) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $runtime $icon) -Destination $nextIcon -Force

    Assert-Closed
    foreach ($path in $runtime,$next,$backup,$scratch) {
        if (-not [IO.Path]::GetFullPath($path).StartsWith($root + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Chemin de mise a jour invalide.'
        }
    }
    [IO.Directory]::Move($runtime, $backup)
    try {
        [IO.Directory]::Move($next, $runtime)
    } catch {
        [IO.Directory]::Move($backup, $runtime)
        throw
    }
    Write-Host "Rico Browser est pret ($nextVersion)."
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    # Keep the previous installation if a rollback could not restore it.
    if ((Test-Path -LiteralPath $scratch) -and (Test-Path -LiteralPath $runtime) -and
        [IO.Path]::GetFullPath($scratch).StartsWith($root + '\.rico-update-', [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
    }
}
