import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function AppShell() {
  const { speak, stopSpeak, speaking, lastSpeakText, enterFullscreen, runSave, saveMessage, t } =
    useApp()
  const nav = useNavigate()
  const loc = useLocation()

  return (
    <div className="app-shell">
      <header className="top-bar">
        <Link to="/" className="top-bar__brand">
          {t('brand')}
        </Link>
        <nav className="top-bar__nav" aria-label="주요 기능">
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              if (speaking) stopSpeak()
              else if (lastSpeakText) void speak(lastSpeakText)
            }}
            aria-label={speaking ? t('nav_stop') : t('nav_tts')}
          >
            <span aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
            <span className="icon-btn__label">{speaking ? t('nav_stop') : t('nav_tts')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => void runSave()}
            aria-label={t('nav_save')}
          >
            <span aria-hidden="true">💾</span>
            <span className="icon-btn__label">{t('nav_save')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => nav('/history')}
            aria-label={t('nav_history')}
          >
            <span aria-hidden="true">📋</span>
            <span className="icon-btn__label">{t('nav_history')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => nav('/settings')}
            aria-label={t('nav_settings')}
          >
            <span aria-hidden="true">⚙</span>
            <span className="icon-btn__label">{t('nav_settings')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => void enterFullscreen()}
            aria-label={t('nav_fullscreen')}
          >
            <span aria-hidden="true">⛶</span>
            <span className="icon-btn__label">{t('nav_fullscreen')}</span>
          </button>
        </nav>
      </header>
      {saveMessage && (
        <div className="page" style={{ paddingTop: 8, paddingBottom: 0 }} role="status">
          <p className="save-banner-ok">{saveMessage}</p>
        </div>
      )}
      {loc.pathname !== '/' && (
        <div className="page" style={{ paddingBottom: 0, paddingTop: 12 }}>
          <button type="button" className="btn" onClick={() => nav(-1)}>
            {t('nav_back')}
          </button>
        </div>
      )}
      <Outlet />
    </div>
  )
}
