# SVIL Tarot

저시력 친화 타로 학습·실전·AI 리딩 웹앱 (Vite + React + TypeScript).

## 기능

- 타로 배우기 (단계 레슨 + 퀴즈)
- 스프레드 소개 (1/3/5카드) + 퀴즈
- 실전 타로 (나의 해설 + Ollama AI 조언)
- AI 타로 (질문/카테고리 + gemma4:12b)
- 소울카드 계산 + AI 설명
- TTS, 저장, 히스토리, 전체화면

## 요구 사항

- Node.js 20+
- [Ollama](https://ollama.com) + `ollama pull gemma4:12b`
- (선택) SVIL TTS `http://127.0.0.1:8765`

## 실행

```bash
npm install
npm run dev
```

프로덕션 빌드:

```bash
npm run build
npm run preview
```

프로덕션에서 Ollama/TTS를 브라우저에서 직접 호출하므로, Ollama는 `OLLAMA_ORIGINS=*` 등으로 CORS를 허용해야 합니다. 개발 서버는 `/ollama`, `/tts-api` 프록시를 사용합니다.

## 에셋

- 고대비 덱: `public/deck/` (LoveType `low_vision_deck` 복사)
- Stitch 디자인: `asset/stitch_svil_tarot_accessibility_design_system.zip` / `asset/stitch/`
