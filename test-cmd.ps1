$env:PATH = "C:\nvm4w\nodejs;" + $env:PATH
subst Z: "C:\Users\Administrator\Desktop\claude code  studly\reactBilibiliApp" 2>$null
Start-Sleep -Milliseconds 500

Write-Host "=== Testing autolinking from Z:\android ===" -ForegroundColor Yellow
$result = & cmd /c "cd /d Z:\android && node --no-warnings --eval `"require('expo/bin/autolinking')`" expo-modules-autolinking resolve --platform android --json 2>&1"
Write-Host "Exit code: $LASTEXITCODE"
$result | Select-Object -First 10 | Write-Host

subst Z: /D 2>$null
