# SVIL Tarot 아키텍처 (v0.1)

```
React UI (fullscreen)
  ├── Ollama gemma4:12b (:11434) — 실전 조언 / AI 리딩 / 소울 설명
  ├── TTS (:8765) — 낭독
  ├── IndexedDB — 히스토리
  └── public/deck — low_vision WebP 78장
```

개발 시 Vite 프록시: `/ollama` → 11434, `/tts-api` → 8765.
