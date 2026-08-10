# scripts/start-dev.ps1 — dev 서버를 커맨드 창 없이 백그라운드로 띄운다.
#
# 왜 이 스크립트가 필요한가
#   - `npm run dev`를 그냥 돌리면 콘솔 창이 뜬다.
#   - 에이전트의 백그라운드 실행은 세션이 끝나면 함께 죽어 서버가 조용히 내려간다.
#   - vite.cmd(배치)를 거치면 cmd.exe 창이 한 번 번쩍인다.
# 그래서 node로 vite.js를 직접, `-WindowStyle Hidden`으로 완전히 분리해 띄우고
# 출력은 logs/ 아래 파일로 받는다.
#
# 사용:  powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1
#        powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1 -Stop

param(
    [switch]$Stop,
    [int]$Port = 5173
)

$root = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $root 'logs'
$pidFile = Join-Path $logDir 'dev.pid'

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

# 포트를 잡고 있는 프로세스 id. IPv4/IPv6 양쪽을 본다 —
# 좀비가 IPv6에만 물려 있으면 127.0.0.1로는 연결이 안 되는데 포트는 잡혀 있는 상태가 된다.
function Get-PortOwners([int]$p) {
    try {
        return @(Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction Stop |
                 Select-Object -ExpandProperty OwningProcess -Unique)
    } catch {
        return @()
    }
}

function Stop-Dev {
    $stopped = 0
    foreach ($procId in (Get-PortOwners $Port)) {
        try {
            $proc = Get-Process -Id $procId -ErrorAction Stop
            # 남의 프로세스를 끄지 않도록 node인지 확인한다.
            if ($proc.ProcessName -eq 'node') {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                $stopped++
            }
        } catch {}
    }
    if (Test-Path $pidFile) { Remove-Item $pidFile -Force }
    "중지: $stopped 개 (포트 $Port)"
}

if ($Stop) {
    Stop-Dev
    return
}

# 이미 떠 있으면 다시 띄우지 않는다. 두 번 띄우면 strictPort 때문에 새 프로세스가 그냥 죽는다.
if ((Get-PortOwners $Port).Count -gt 0) {
    "이미 실행 중 — http://127.0.0.1:$Port/"
    return
}

$vite = Join-Path $root 'node_modules\vite\bin\vite.js'
if (-not (Test-Path $vite)) { throw "vite를 찾지 못했습니다: $vite  (npm install 먼저)" }

$out = Join-Path $logDir 'dev.log'
$err = Join-Path $logDir 'dev.err.log'

# node를 직접 부른다. vite.cmd(배치)를 거치면 cmd.exe 창이 한 번 번쩍인다.
# -WindowStyle Hidden + 리디렉션으로 창 없이 뜨고, 부모가 끝나도 살아남는다.
$proc = Start-Process -FilePath 'node' `
    -ArgumentList "`"$vite`"" `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -PassThru

$proc.Id | Set-Content -Path $pidFile -Encoding utf8

# 포트가 실제로 열릴 때까지 기다린다. "떴다"고 말해 놓고 안 떠 있으면 그게 제일 나쁘다.
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    if ((Get-PortOwners $Port).Count -gt 0) { $ready = $true; break }
    if ($proc.HasExited) { break }
}

if ($ready) {
    "실행 중 (PID $($proc.Id)) — http://127.0.0.1:$Port/   로그: logs\dev.log"
} else {
    "기동 실패. logs\dev.err.log 를 확인하세요."
    if (Test-Path $err) { Get-Content $err -Tail 15 }
}
