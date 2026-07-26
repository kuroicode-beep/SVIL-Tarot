import { useApp, type FontSize } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { OLLAMA_MODEL } from '../services/ollama'
import { clearHistory } from '../services/history'
import { clearConsultations } from '../services/customers'
import { fontOptions, localeLabels, type FontId, type Locale } from '../i18n'
import { useState } from 'react'
import { APP_VERSION, VERSION_HISTORY } from '../version'

export function SettingsPage() {
  const {
    settings,
    setFontSize,
    setFontId,
    setLocale,
    setTtsVoice,
    setTtsSpeed,
    ollamaOk,
    ttsOk,
    voices,
    refreshStatus,
    ttsError,
    speak,
    stopSpeak,
    speaking,
    t,
  } = useApp()
  const [cleared, setCleared] = useState(false)

  return (
    <main className="page">
      <h1>{t('settings_title')}</h1>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_conn')}</h2>
        <div className="btn-row">
          <ConnectionBadge label="Ollama" ok={ollamaOk} />
          <ConnectionBadge label="TTS" ok={ttsOk} />
          <button type="button" className="btn" onClick={() => void refreshStatus()}>
            {t('settings_refresh')}
          </button>
        </div>
        <p className="muted mono" style={{ marginTop: 12 }}>
          Ollama: {OLLAMA_MODEL} · http://127.0.0.1:11434
        </p>
        <p className="muted mono">TTS: http://127.0.0.1:8765 (qwen3)</p>
        {ttsError && <p className="error-text">{ttsError}</p>}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_lang')}</h2>
        <div className="chip-row">
          {localeLabels.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`chip${settings.locale === l.id ? ' is-on' : ''}`}
              onClick={() => setLocale(l.id as Locale)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_font')}</h2>
        <div className="list-choice">
          {fontOptions.map((f) => (
            <button
              key={f.id}
              type="button"
              className={settings.fontId === f.id ? 'is-selected' : ''}
              style={{ fontFamily: f.css }}
              onClick={() => setFontId(f.id as FontId)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_font_size')}</h2>
        <div className="chip-row">
          {(
            [
              ['sm', 'size_sm'],
              ['md', 'size_md'],
              ['lg', 'size_lg'],
            ] as [FontSize, string][]
          ).map(([v, key]) => (
            <button
              key={v}
              type="button"
              className={`chip${settings.fontSize === v ? ' is-on' : ''}`}
              onClick={() => setFontSize(v)}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_tts')}</h2>
        <label className="label" htmlFor="voice">
          {t('settings_voice')}
        </label>
        <select
          id="voice"
          className="field"
          value={settings.ttsVoice}
          onChange={(e) => setTtsVoice(e.target.value)}
        >
          <option value="default">default</option>
          {voices.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <label className="label" htmlFor="speed" style={{ marginTop: 12 }}>
          {t('settings_speed')} <span className="mono">{settings.ttsSpeed}%</span>
        </label>
        <input
          id="speed"
          className="field"
          type="range"
          min={70}
          max={130}
          step={5}
          value={settings.ttsSpeed}
          onChange={(e) => setTtsSpeed(Number(e.target.value))}
        />
        {/* 보이스·속도를 바꾼 자리에서 바로 확인한다. 화면을 옮기지 않아도 되게. */}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            disabled={ttsOk === false}
            onClick={() => {
              if (speaking) stopSpeak()
              else void speak(t('settings_preview_text'))
            }}
          >
            {speaking ? t('settings_preview_stop') : t('settings_preview')}
          </button>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_data')}</h2>
        <button
          type="button"
          className="btn"
          style={{ borderColor: 'var(--negative)', color: 'var(--negative)', width: '100%' }}
          onClick={async () => {
            if (!window.confirm(t('settings_clear_warn'))) return
            await clearHistory()
            await clearConsultations()
            setCleared(true)
          }}
        >
          {t('settings_clear')}
        </button>
        <p className="muted" style={{ textAlign: 'center' }}>
          {t('settings_clear_warn')}
        </p>
        {cleared && <p className="feedback-ok">{t('settings_cleared')}</p>}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_history')}</h2>
        <p className="mono">v{APP_VERSION}</p>
        {VERSION_HISTORY.map((c) => (
          <div key={c.version} style={{ marginTop: 12 }}>
            <strong className="mono">v{c.version}</strong>{' '}
            <span className="mono muted">{c.date}</span>
            <ul>
              {c.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </main>
  )
}
