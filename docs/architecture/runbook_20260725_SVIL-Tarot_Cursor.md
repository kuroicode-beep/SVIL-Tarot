# SVIL Tarot 런북 — 개발 / Preview / Ollama CORS

## 개발 서버

```powershell
cd C:\Projects\SVIL-Tarot
npm install
npm run dev
```

브라우저: http://127.0.0.1:5173/  
Vite가 `/ollama` → `:11434`, `/tts-api` → `:8765` 로 프록시합니다.

## 프로덕션 빌드 · Preview

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Preview에서는 프록시가 없으므로 브라우저가 `http://127.0.0.1:11434` / `:8765` 를 **직접** 호출합니다.

## Ollama CORS (Preview · file 배포 시 필수)

PowerShell (사용자 환경 변수, 재로그인/재시작 후 반영):

```powershell
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")
```

또는 세션만:

```powershell
$env:OLLAMA_ORIGINS = "*"
ollama serve
```

모델:

```powershell
ollama pull gemma4:12b
```

## TTS

SVIL TTS가 `http://127.0.0.1:8765` 에서 동작해야 「읽어주기」가 됩니다. 꺼져 있으면 설정에 **TTS: 끊김** 라벨이 표시됩니다.

## 바탕화면 바로가기

```powershell
.\scripts\create-desktop-shortcut.ps1 -Mode dev
# 또는
.\scripts\create-desktop-shortcut.ps1 -Mode preview
```

## 랜딩 (GitHub Pages)

```powershell
.\publish_site.ps1
```

라이브: https://kuroicode-beep.github.io/SVIL-Tarot/
