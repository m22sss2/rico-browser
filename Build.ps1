param([string]$Output = (Join-Path $PSScriptRoot 'dist\Rico Browser'))

$ErrorActionPreference = 'Stop'
$output = [IO.Path]::GetFullPath($Output)
if (Test-Path -LiteralPath $output) { throw 'Choisissez un dossier de sortie neuf.' }
$sevenZip = Join-Path $env:ProgramFiles '7-Zip\7z.exe'
if (-not (Test-Path -LiteralPath $sevenZip)) { $sevenZip = (Get-Command '7z.exe').Source }
$compiler = Join-Path $env:windir 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1')
New-Item -ItemType Directory -Path $output | Out-Null
$staging = Join-Path $output '.build'
New-Item -ItemType Directory -Path $staging | Out-Null
$installer = Join-Path $staging 'FirefoxESR.exe'
$firefoxUrl = 'https://download.mozilla.org/?product=firefox-esr-latest-ssl&os=win64&lang=fr'
& curl.exe --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --output $installer $firefoxUrl
if ($LASTEXITCODE -ne 0) { throw 'Le telechargement Mozilla a echoue.' }
$signature = Get-AuthenticodeSignature -LiteralPath $installer
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '(^|, )CN=Mozilla Corporation(,|$)') {
    throw 'Signature Mozilla invalide.'
}
& $sevenZip x $installer "-o$staging" -y | Out-Null
if ($LASTEXITCODE -gt 1) { throw 'Extraction de Firefox ESR impossible.' }
$browser = Join-Path $output 'browser'
[IO.Directory]::Move((Join-Path $staging 'core'), $browser)
Copy-Item -Path (Join-Path $PSScriptRoot 'overlay\*') -Destination $browser -Recurse -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'assets') -Destination $output -Recurse
foreach ($name in 'Rico Browser.cmd','Update-Rico.ps1','Mettre a jour Rico.cmd') {
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot $name) -Destination $output
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'README.md') -Destination (Join-Path $output 'LISEZ-MOI.md')
$xpi = Join-Path $output 'assets\ublock.xpi'
$ublockUrl = 'https://addons.mozilla.org/firefox/downloads/latest/ublock-origin/latest.xpi'
& curl.exe --fail --silent --show-error --location --proto '=https' --proto-redir '=https' --output $xpi $ublockUrl
if ($LASTEXITCODE -ne 0) { throw 'Le telechargement de uBlock Origin a echoue.' }
& python (Join-Path $PSScriptRoot 'src\create_rico_icon.py') $output
if ($LASTEXITCODE -ne 0) { throw "La generation de l'icone a echoue." }
$launcher = Join-Path $output 'rico.exe'
$icon = Join-Path $output 'assets\rico.ico'
& $compiler /nologo /target:winexe /platform:x64 /optimize+ /r:System.Web.Extensions.dll /r:System.Windows.Forms.dll "/win32icon:$icon" "/out:$launcher" (Join-Path $PSScriptRoot 'src\RicoLauncher.cs') (Join-Path $PSScriptRoot 'src\BrandIcon.cs')
if ($LASTEXITCODE -ne 0) { throw 'La compilation du lanceur a echoue.' }
Rename-Item -LiteralPath (Join-Path $browser 'firefox.exe') -NewName 'rico.exe'
$target = '"' + (Join-Path $browser 'rico.exe') + '"'
$branding = Start-Process -FilePath $launcher -ArgumentList @('--brand-runtime', $target) -PassThru -Wait -WindowStyle Hidden
if ($branding.ExitCode -ne 0) { throw "L'application de l'icone a echoue." }
if ([IO.Path]::GetFullPath($staging) -eq (Join-Path $output '.build')) {
    Remove-Item -LiteralPath $staging -Recurse -Force
}
Write-Host "Rico Browser : $launcher"
