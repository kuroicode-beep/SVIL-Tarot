import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { LearnPage } from './pages/LearnPage'
import { LearnQuizPage } from './pages/LearnQuizPage'
import { SpreadsPage } from './pages/SpreadsPage'
import { PracticePage } from './pages/PracticePage'
import { AiTarotPage } from './pages/AiTarotPage'
import { SoulCardPage } from './pages/SoulCardPage'
import { HistoryPage } from './pages/HistoryPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="learn" element={<LearnPage />} />
            <Route path="learn/:stageId" element={<LearnPage />} />
            <Route path="learn/:stageId/quiz" element={<LearnQuizPage />} />
            <Route path="spreads" element={<SpreadsPage />} />
            <Route path="practice" element={<PracticePage />} />
            <Route path="ai" element={<AiTarotPage />} />
            <Route path="soul" element={<SoulCardPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
