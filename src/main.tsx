import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// 오프라인 우선 앱이라 네트워크 없이도 열려야 한다.
// dev에서는 등록하지 않는다 — 서비스워커가 HMR 응답을 캐시하면 "고쳤는데 안 바뀐다"가 된다.
// BASE_URL을 붙여 서브패스 배포(GitHub Pages)에서도 스코프가 맞게 한다.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => undefined)
  })
}
