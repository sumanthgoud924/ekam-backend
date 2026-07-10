$sourceDir = "e:\Mobile App\Ekam Multi Purpose app\ekam-voice-hub"
$releaseDir = "e:\Mobile App\Ekam Multi Purpose app\ekam-release"
$zipPath = "e:\Mobile App\Ekam Multi Purpose app\ekam-voice-hub-ready.zip"

if (Test-Path $releaseDir) { Remove-Item -Path $releaseDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item -Path $zipPath -Force }

New-Item -ItemType Directory -Force -Path $releaseDir
New-Item -ItemType Directory -Force -Path "$releaseDir\frontend"
Copy-Item -Path "$sourceDir\frontend\build" -Destination "$releaseDir\frontend\build" -Recurse

New-Item -ItemType Directory -Force -Path "$releaseDir\backend"
Get-ChildItem -Path "$sourceDir\backend" -Exclude "venv", "__pycache__", ".pytest_cache" | Copy-Item -Destination "$releaseDir\backend" -Recurse

Compress-Archive -Path "$releaseDir\*" -DestinationPath $zipPath -Force
Remove-Item -Path $releaseDir -Recurse -Force

Write-Host "Zip file created successfully at: $zipPath"
