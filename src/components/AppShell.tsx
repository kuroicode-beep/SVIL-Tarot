import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function AppShell() {
  const { speak, stopSpeak, speaking, lastSpeakText, enterFullscreen } = useApp()
  const nav = useNavigate()
  const loc = useLocation()

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to="/" className="top-bar__brand">
          SVIL Tarot
        </Link>
        <nav className="top-bar__nav" aria-label="주요 기능">
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              if (speaking) stopSpeak()
              else if (lastSpeakText) void speak(lastSpeakText)
            }}
            aria-label={speaking ? '낭독 중지' : '읽어주기'}
          >
            <span aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
            <span className="icon-btn__label">{speaking ? '중지' : '읽어주기'}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => nav('/history')}
            aria-label="기록"
          >
            <span aria-hidden="true">📋</span>
            <span className="icon-btn__label">기록</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => nav('/settings')}
            aria-label="설정"
          >
            <span aria-hidden="true">⚙</span>
            <span className="icon-btn__label">설정</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => void enterFullscreen()}
            aria-label="전체화면"
          >
            <span aria-hidden="true">⛶</span>
            <span className="icon-btn__label">전체화면</span>
          </button>
        </nav>
      </header>
      {loc.pathname !== '/' && (
        <div className="page" style={{ paddingBottom: 0, paddingTop: 12 }}>
          <button type="button" className="btn" onClick={() => nav(-1)}>
            ← 뒤로
          </button>
        </div>
      )}
      <Outlet />
    </div>
  )
}
