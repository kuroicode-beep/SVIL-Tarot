// src/lib/deckUrl.ts — 덱 이미지 경로 한 줄. cards.ts에서 일부러 떼어 놓은 모듈이다.
//
// cards.ts는 cards.json(37KB) + cards.i18n.json(115KB)을 함께 들고 온다.
// 홈 화면은 장식용 실루엣 한 장 때문에 deckUrl만 필요한데, cards.ts에서 가져오면
// 카드 데이터 152KB가 통째로 진입 청크에 붙어 첫 화면이 그만큼 늦어진다.
// 데이터가 필요 없는 화면은 여기서만 가져온다.

// Vite base(예: 서브패스 배포) 아래에서도 경로가 깨지지 않도록 BASE_URL을 붙인다.
export function deckUrl(file: string): string {
  return `${import.meta.env.BASE_URL}deck/${file}`
}
