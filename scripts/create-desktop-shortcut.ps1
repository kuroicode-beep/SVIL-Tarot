# SVIL Tarot — 바탕화면 바로가기 생성
# 사용: PowerShell에서 실행
#   .\scripts\create-desktop-shortcut.ps1
# 옵션: -Mode preview  (빌드 후 preview) / -Mode dev (기본)

param(
  [ValidateSet('dev', 'preview')]
  [string]$Mode = 'dev'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'SVIL Tarot.lnk'
$Npm = (Get-Command npm -ErrorAction Stop).Source

$Args = if ($Mode -eq 'preview') {
  "/c cd /d `"$ProjectRoot`" && npm run build && npm run preview -- --host 127.0.0.1 --port 4173 && start http://127.0.0.1:4173/"
} else {
  "/c cd /d `"$ProjectRoot`" && npm run dev -- --host 127.0.0.1 --port 5173 && start http://127.0.0.1:5173/"
}

# cmd /c 로는 서버 기동과 start가 순차 문제 있음 → 런처 bat 생성
$Launcher = Join-Path $ProjectRoot 'scripts\launch-svil-tarot.bat'
$Bat = @"
@echo off
cd /d "$ProjectRoot"
if /I "$Mode"=="preview" (
  call npm run build
  start "" http://127.0.0.1:4173/
  call npm run preview -- --host 127.0.0.1 --port 4173
) else (
  start "" http://127.0.0.1:5173/
  call npm run dev -- --host 127.0.0.1 --port 5173
)
"@
Set-Content -Path $Launcher -Value $Bat -Encoding ASCII

$Wsh = New-Object -ComObject WScript.Shell
$Sc = $Wsh.CreateShortcut($ShortcutPath)
$Sc.TargetPath = 'cmd.exe'
$Sc.Arguments = "/c `"$Launcher`""
$Sc.WorkingDirectory = $ProjectRoot
$Sc.IconLocation = 'shell32.dll,13'
$Sc.Description = "SVIL Tarot ($Mode)"
$Sc.Save()

Write-Output "Created: $ShortcutPath"
Write-Output "Launcher: $Launcher (mode=$Mode)"
