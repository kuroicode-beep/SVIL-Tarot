import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 프로젝트 서브패스(예: GitHub Pages /SVIL-Tarot/)에 앱을 배포할 때만 base를 설정한다.
  // 에셋 경로는 import.meta.env.BASE_URL(deckUrl)을 쓰므로 base만 바꾸면 자동 대응된다.
  // base: '/SVIL-Tarot/',
  plugins: [react()],
  server: {
    // 기본값(localhost)은 Windows에서 IPv6(::1)에만 물릴 때가 있어
    // 브라우저에 127.0.0.1을 치면 연결이 안 된다. IPv4로 고정한다.
    host: '127.0.0.1',
    port: 5173,
    // 포트가 잡혀 있으면 조용히 5174로 옮겨가 "새로고침해도 옛 화면"이 된다. 차라리 실패시킨다.
    strictPort: true,
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
      '/tts-api': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tts-api/, ''),
      },
    },
  },
})
