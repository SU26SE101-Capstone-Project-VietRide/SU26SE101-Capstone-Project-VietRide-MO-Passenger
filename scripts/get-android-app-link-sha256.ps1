[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string] $ArtifactPath
)

$resolvedArtifact = (Resolve-Path -LiteralPath $ArtifactPath -ErrorAction Stop).Path
$sdkRoots = @(
  $env:ANDROID_SDK_ROOT,
  $env:ANDROID_HOME,
  (Join-Path $env:LOCALAPPDATA 'Android\Sdk')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

$apksigner = foreach ($sdkRoot in $sdkRoots) {
  Get-ChildItem -LiteralPath (Join-Path $sdkRoot 'build-tools') -Directory -ErrorAction SilentlyContinue |
    Sort-Object Name -Descending |
    ForEach-Object {
      $candidate = Join-Path $_.FullName 'apksigner.bat'
      if (Test-Path -LiteralPath $candidate) { $candidate }
    } |
    Select-Object -First 1
}

$apksigner = $apksigner | Select-Object -First 1
if (-not $apksigner) {
  throw 'apksigner was not found. Install Android SDK Build-Tools or set ANDROID_SDK_ROOT.'
}

$verification = & $apksigner verify --verbose --print-certs $resolvedArtifact 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Artifact signature verification failed.`n$verification"
}

$sha256Match = [regex]::Match(
  ($verification -join "`n"),
  'Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]{64})'
)
if (-not $sha256Match.Success) {
  throw 'The artifact does not expose a signer SHA-256 certificate digest.'
}

$rawFingerprint = $sha256Match.Groups[1].Value.ToUpperInvariant()
$appLinkFingerprint = ([regex]::Matches($rawFingerprint, '..') | ForEach-Object Value) -join ':'
$artifactHash = (Get-FileHash -LiteralPath $resolvedArtifact -Algorithm SHA256).Hash

Write-Output "Artifact: $resolvedArtifact"
Write-Output "Artifact SHA-256: $artifactHash"
Write-Output "Signer SHA-256 for assetlinks: $appLinkFingerprint"
Write-Output "DEEPLINK_ANDROID_SHA256_FINGERPRINTS=$appLinkFingerprint"
