// src/App.tsx — 라우팅. 홈만 즉시 로드하고 나머지 화면은 라우트 단위로 쪼개 필요할 때 받는다.
import { lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AppShell } from './components/AppShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { HomePage } from './pages/HomePage'

/**
 * 라우트별 청크. lazy()와 프리페치가 **같은 함수**를 쓴다 — 둘이 갈라지면 프리페치가 엉뚱한
 * 모듈을 받아 오프라인 대비가 헛돈다.
 *
 * 한 덩어리(650KB+)로 받으면 느린 회선에서 첫 화면까지 그만큼 기다린다. 홈은 정적으로 두고
 * 나머지는 그 화면에 들어갈 때 받되, 첫 화면을 그린 뒤 유휴 시간에 나머지도 미리 받아 둔다
 * (아래 useIdlePrefetch).
 */
const chunks = {
  daily: () => import('./pages/DailyPage'),
  dictionary: () => import('./pages/DictionaryPage'),
  stats: () => import('./pages/StatsPage'),
  calendar: () => import('./pages/CalendarPage'),
  dream: () => import('./pages/DreamPage'),
  spreadBuilder: () => import('./pages/SpreadBuilderPage'),
  learn: () => import('./pages/LearnPage'),
  learnQuiz: () => import('./pages/LearnQuizPage'),
  review: () => import('./pages/ReviewPage'),
  spreads: () => import('./pages/SpreadsPage'),
  practice: () => import('./pages/PracticePage'),
  ai: () => import('./pages/AiTarotPage'),
  soul: () => import('./pages/SoulCardPage'),
  history: () => import('./pages/HistoryPage'),
  settings: () => import('./pages/SettingsPage'),
  customers: () => import('./pages/CustomersPage'),
  consultations: () => import('./pages/ConsultationsPage'),
  saju: () => import('./pages/SajuPage'),
  compat: () => import('./pages/CompatPage'),
  nameology: () => import('./pages/NameologyPage'),
  naming: () => import('./pages/NamingPage'),
}

/**
 * 청크 내려받기는 한 번의 네트워크 실패로도 실패한다 — React.lazy는 재시도가 없어
 * 그 화면이 그대로 오류로 굳는다. 짧은 간격으로 한 번 더 시도하고, 그래도 실패하면
 * 호출부(ErrorBoundary)가 안내와 새로고침 버튼을 띄운다.
 *
 * 재시도 사이에 서비스워커 캐시를 우회하도록 강제하지는 않는다 —
 * 잘못된 응답(SPA 폴백 HTML)은 sw.js에서 애초에 캐시하지 않게 막아 뒀다.
 *
 * 두 번째 시도까지 실패하면 React.lazy가 그 컴포넌트의 거부 상태를 기억한다.
 * 이후에는 파일이 되돌아와도 화면 이동만으로는 다시 시도하지 않으므로,
 * 복구 수단은 ErrorBoundary의 '새로고침'이다(실측으로 복구 확인).
 */
function withRetry<T>(load: () => Promise<T>): Promise<T> {
  return load().catch(
    () => new Promise<T>((resolve, reject) => setTimeout(() => load().then(resolve, reject), 400)),
  )
}

const DailyPage = lazy(() => withRetry(chunks.daily).then((m) => ({ default: m.DailyPage })))
const DictionaryPage = lazy(() => withRetry(chunks.dictionary).then((m) => ({ default: m.DictionaryPage })))
const StatsPage = lazy(() => withRetry(chunks.stats).then((m) => ({ default: m.StatsPage })))
const CalendarPage = lazy(() => withRetry(chunks.calendar).then((m) => ({ default: m.CalendarPage })))
const DreamPage = lazy(() => withRetry(chunks.dream).then((m) => ({ default: m.DreamPage })))
const SpreadBuilderPage = lazy(() =>
  withRetry(chunks.spreadBuilder).then((m) => ({ default: m.SpreadBuilderPage })),
)
const LearnPage = lazy(() => withRetry(chunks.learn).then((m) => ({ default: m.LearnPage })))
const LearnQuizPage = lazy(() => withRetry(chunks.learnQuiz).then((m) => ({ default: m.LearnQuizPage })))
const ReviewPage = lazy(() => withRetry(chunks.review).then((m) => ({ default: m.ReviewPage })))
const SpreadsPage = lazy(() => withRetry(chunks.spreads).then((m) => ({ default: m.SpreadsPage })))
const PracticePage = lazy(() => withRetry(chunks.practice).then((m) => ({ default: m.PracticePage })))
const AiTarotPage = lazy(() => withRetry(chunks.ai).then((m) => ({ default: m.AiTarotPage })))
const SoulCardPage = lazy(() => withRetry(chunks.soul).then((m) => ({ default: m.SoulCardPage })))
const HistoryPage = lazy(() => withRetry(chunks.history).then((m) => ({ default: m.HistoryPage })))
const SettingsPage = lazy(() => withRetry(chunks.settings).then((m) => ({ default: m.SettingsPage })))
const CustomersPage = lazy(() => withRetry(chunks.customers).then((m) => ({ default: m.CustomersPage })))
const ConsultationsPage = lazy(() =>
  withRetry(chunks.consultations).then((m) => ({ default: m.ConsultationsPage })),
)
const SajuPage = lazy(() => withRetry(chunks.saju).then((m) => ({ default: m.SajuPage })))
const CompatPage = lazy(() => withRetry(chunks.compat).then((m) => ({ default: m.CompatPage })))
const NameologyPage = lazy(() => withRetry(chunks.nameology).then((m) => ({ default: m.NameologyPage })))
const NamingPage = lazy(() => withRetry(chunks.naming).then((m) => ({ default: m.NamingPage })))

/**
 * 첫 화면을 그린 뒤 유휴 시간에 나머지 청크를 하나씩 받아 둔다.
 *
 * 라우트를 쪼개면 '한 번도 안 들어간 화면'은 서비스워커 캐시에도 없다. 그대로 두면
 * 비행기 모드에서 그 화면만 안 열리는데, 쪼개기 전에는 되던 일이라 명백한 퇴보다.
 * 첫 페인트를 방해하지 않도록 유휴 시간에, 한 번에 하나씩, 실패해도 조용히 넘어간다.
 */
function useIdlePrefetch() {
  useEffect(() => {
    const queue = Object.values(chunks)
    let index = 0
    let cancelled = false

    // requestIdleCallback은 Safari에 늦게 들어왔다. 없으면 짧은 타이머로 대신한다.
    const idle: (cb: () => void) => void =
      typeof window.requestIdleCallback === 'function'
        ? (cb) => window.requestIdleCallback(() => cb(), { timeout: 3000 })
        : (cb) => void window.setTimeout(cb, 300)

    const step = () => {
      if (cancelled || index >= queue.length) return
      const load = queue[index++]
      void load()
        .catch(() => undefined)
        .then(() => {
          if (!cancelled) idle(step)
        })
    }
    idle(step)

    return () => {
      cancelled = true
    }
  }, [])
}

export default function App() {
  useIdlePrefetch()
  return (
    <AppProvider>
      {/* 렌더 예외가 나면 화면이 통째로 백지가 되고, 설정이 localStorage에 남아 새로고침으로도 복구가 안 된다. */}
      <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="daily" element={<DailyPage />} />
            <Route path="dictionary" element={<DictionaryPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="learn" element={<LearnPage />} />
            <Route path="learn/:stageId" element={<LearnPage />} />
            <Route path="learn/:stageId/quiz" element={<LearnQuizPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="spreads" element={<SpreadsPage />} />
            <Route path="spread-builder" element={<SpreadBuilderPage />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="ai" element={<AiTarotPage />} />
            <Route path="soul" element={<SoulCardPage />} />
            <Route path="dream" element={<DreamPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomersPage />} />
            <Route path="consultations" element={<ConsultationsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="saju" element={<SajuPage />} />
            <Route path="compat" element={<CompatPage />} />
            <Route path="nameology" element={<NameologyPage />} />
            <Route path="naming" element={<NamingPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ErrorBoundary>
    </AppProvider>
  )
}
