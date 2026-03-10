$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\Administrator\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;C:\nvm4w\nodejs;$env:ANDROID_HOME\platform-tools;$env:PATH"

# Create short path alias to avoid 260-char limit
subst Z: "C:\Users\Administrator\Desktop\claude code  studly\reactBilibiliApp" 2>$null

Set-Location "Z:\android"
.\gradlew.bat assembleDebug --no-daemon

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    $apk = Get-ChildItem "Z:\android\app\build\outputs\apk\debug\*.apk" | Select-Object -First 1
    Write-Host "SUCCESS! APK: $($apk.FullName)" -ForegroundColor Green
    # Copy to Desktop
    Copy-Item $apk.FullName "C:\Users\Administrator\Desktop\BilibiliApp-debug.apk"
    Write-Host "Copied to Desktop: BilibiliApp-debug.apk" -ForegroundColor Cyan
} else {
    Write-Host "Build FAILED" -ForegroundColor Red
}

subst Z: /D 2>$null
