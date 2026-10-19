$ErrorActionPreference = 'Stop'
$diagramDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$chromeCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required to export the SVG diagrams to PNG.' }

python (Join-Path $diagramDir 'generate.py')
Get-ChildItem -LiteralPath $diagramDir -Filter '*.svg' | ForEach-Object {
  $png = [System.IO.Path]::ChangeExtension($_.FullName, '.png')
  $uri = [System.Uri]::new($_.FullName).AbsoluteUri
  $process = Start-Process -FilePath $browser -ArgumentList @('--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1600,900', "--screenshot=$png", $uri) -WindowStyle Hidden -Wait -PassThru
  if ($process.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $png)) { throw "PNG export failed: $($_.Name)" }
}
