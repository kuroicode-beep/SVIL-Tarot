import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 프로젝트 서브패스(예: GitHub Pages /SVIL-Tarot/)에 앱을 배포할 때만 base를 설정한다.
  // 에셋 경로는 import.meta.env.BASE_URL(deckUrl)을 쓰므로 base만 바꾸면 자동 대응된다.
  // base: '/SVIL-Tarot/',
  plugins: [react()],
  server: {
    port: 5173,
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
