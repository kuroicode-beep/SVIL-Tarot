import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { APP_VERSION } from '../version'

export function AppShell() {
  const {
    speak,
    stopSpeak,
    speaking,
    lastSpeakText,
    setLastSpeakText,
    enterFullscreen,
    runSave,
    saveMessage,
    setSaveMessage,
    ttsError,
    setTtsError,
    t,
  } = useApp()
  const nav = useNavigate()
  const loc = useLocation()

  // 저장 알림·TTS 오류는 그 화면에서만 유효하다. 화면을 옮기면 지워 낡은 안내가 남지 않게 한다.
  useEffect(() => {
    setSaveMessage(null)
    setTtsError(null)
  }, [loc.pathname, setSaveMessage, setTtsError])

  // 낭독 대상은 화면에 종속된다. 정리 함수에서 비워야 새 화면이 등록한 문장을 덮어쓰지 않는다.
  // 본문에서 비우면 방금 마운트된 화면이 지정한 문장까지 같이 날아간다.
  useEffect(() => {
    return () => setLastSpeakText('')
  }, [loc.pathname, setLastSpeakText])

  const canSpeak = lastSpeakText.trim().length > 0

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
          {/* 읽을 내용이 없을 때 disabled를 쓰면 탭 순서에서 빠져 상태를 알 길이 없어진다.
              aria-disabled로 포커스는 유지하고 라벨로 이유를 알린다. */}
          <button
            type="button"
            className="icon-btn"
            aria-disabled={!speaking && !canSpeak ? true : undefined}
            onClick={() => {
              if (speaking) stopSpeak()
              else if (canSpeak) void speak(lastSpeakText)
            }}
            aria-label={speaking ? t('nav_stop') : canSpeak ? t('nav_tts') : t('nav_tts_none')}
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
      {/* 전역 배너는 저장 '실패' 전용이다. 성공 문구는 각 화면이 버튼 옆에 띄운다 —
          저시력 사용자에게는 화면 맨 위 배너보다 방금 누른 버튼 근처 메시지가 훨씬 잘 보인다.
          save_none(저장할 내용 없음)도 실패 계열이라 여기서 함께 알린다. */}
      {saveMessage && (
        <div className="page" style={{ paddingTop: 8, paddingBottom: 0 }}>
          <p className="error-text" role="alert">
            {saveMessage}
          </p>
        </div>
      )}
      {/* TTS 오류는 지금까지 설정 화면에서만 보였다. 정작 낭독을 누르는 곳은 전 화면이다.
          서비스 계층이 i18n 키만 던지므로 여기서 로케일에 맞게 번역한다. */}
      {ttsError && (
        <div className="page" style={{ paddingTop: 8, paddingBottom: 0 }}>
          <p className="error-text" role="alert">
            {t(ttsError.code, ttsError.params)}
          </p>
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
