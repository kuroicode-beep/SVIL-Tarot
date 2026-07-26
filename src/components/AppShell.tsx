import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../version'

export function AppShell() {
  const { speak, stopSpeak, speaking, lastSpeakText, enterFullscreen, runSave, saveMessage, setSaveMessage, t } =
    useApp()
  const nav = useNavigate()
  const loc = useLocation()

  // 저장 알림은 그 화면에서만 유효하다. 화면을 옮기면 지워 낡은 안내가 남지 않게 한다.
  useEffect(() => {
    setSaveMessage(null)
  }, [loc.pathname, setSaveMessage])

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t('skip_main')}
      </a>
      <header className="top-bar">
        <div className="top-bar__brand-wrap">
          <Link to="/" className="top-bar__brand">
            {t('brand')}
          </Link>
          {/* SVIL 앱 규칙: 버전은 로고 옆에 상시 표시(숫자는 모노체). */}
          <span className="top-bar__version mono">v{APP_VERSION}</span>
        </div>
        <nav className="top-bar__nav" aria-label={t('nav_group')}>
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
          <button type="button" className="icon-btn" onClick={() => void runSave()} aria-label={t('nav_save')}>
            <span aria-hidden="true">💾</span>
            <span className="icon-btn__label">{t('nav_save')}</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => nav('/customers')} aria-label={t('home_customers')}>
            <span aria-hidden="true">👥</span>
            <span className="icon-btn__label">{t('home_customers')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => nav('/consultations')}
            aria-label={t('home_consultations')}
          >
            <span aria-hidden="true">🗂️</span>
            <span className="icon-btn__label">{t('home_consultations')}</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => nav('/history')} aria-label={t('nav_history')}>
            <span aria-hidden="true">📋</span>
            <span className="icon-btn__label">{t('nav_history')}</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => nav('/settings')}
            aria-label={t('nav_settings')}
            aria-current={loc.pathname === '/settings' ? 'page' : undefined}
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
        <div className="page" style={{ paddingTop: 8, paddingBottom: 0 }} role="status" aria-live="polite">
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
      <div id="main" tabIndex={-1} className="main-region">
        <Outlet />
      </div>
    </div>
  )
}
