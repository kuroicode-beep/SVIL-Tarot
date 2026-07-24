# AGENTS — SVIL-Tarot

이 저장소에서 작업하는 에이전트용 요약. 상세는 `CLAUDE.md`를 따른다.

## 프로젝트

- 이름: SVIL-Tarot
- 스택: Vite + React + TypeScript (전체화면 웹)
- 버전: `VERSION` 파일 (semver, 시작 0.1.0)
- 공개 저장소: https://github.com/kuroicode-beep/SVIL-Tarot

## 필수 준수

1. **히스토리 메뉴**: 설정 UI에 버전별 업데이트 내역 표시
2. **문서 이중 저장**: `docs/` ↔ Vault `G:\내 드라이브\SVIL Vault\03_PRJ\SVIL-Tarot\`
3. **docs 폴더**: prd / architecture / storyboard / handoff / reports
4. **로컬 LLM**: Ollama `gemma4:12b` (클라우드 DeepSeek 직호출 금지)
5. **TTS**: `127.0.0.1:8765` qwen3
6. **디자인**: SVIL 토큰 + `asset/stitch/` 레이아웃 참고, CDN 폰트 금지

## 실행

```bash
npm install
npm run dev
npm run build
```
