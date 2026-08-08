import { useApp, type FontSize } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { OLLAMA_MODEL } from '../services/ollama'
import { clearHistory } from '../services/history'
import { clearConsultations } from '../services/customers'
import { downloadBackup, exportBackup, importBackup } from '../services/backup'
import { fontOptions, localeLabels, type FontId, type Locale } from '../i18n'
import { useRef, useState } from 'react'
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
  const [backupMsg, setBackupMsg] = useState<string | null>(null)
  const [backupError, setBackupError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const onExport = async () => {
    setBackupError(null)
    try {
      const { blob, filename, count } = await exportBackup()
      downloadBackup(blob, filename)
      setBackupMsg(t('backup_done', { n: count }))
    } catch {
      setBackupError(t('load_error'))
    }
  }

  const onImport = async (file: File) => {
    setBackupMsg(null)
    setBackupError(null)
    if (!window.confirm(t('backup_confirm'))) return
    try {
      const { count } = await importBackup(file)
      setBackupMsg(t('backup_imported', { n: count }))
    } catch (e) {
      // 서비스 계층은 로케일을 모르므로 sentinel만 던진다.
      const code = e instanceof Error ? e.message : ''
      setBackupError(code === 'BACKUP_BAD_FILE' ? t('backup_bad_file') : t('load_error'))
    }
  }

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
        {ttsError && <p className="error-text" role="alert">{ttsError}</p>}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_lang')}</h2>
        <div className="chip-row">
          {localeLabels.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`chip${settings.locale === l.id ? ' is-on' : ''}`}
              aria-pressed={settings.locale === l.id}
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
              aria-pressed={settings.fontId === f.id}
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
              aria-pressed={settings.fontSize === v}
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

      {/* 앱 전체가 IndexedDB에만 의존한다. 저장소를 비우면 고객·상담·리딩이 전부 사라지므로
          수동 백업은 선택이 아니라 필수다. */}
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('backup_title')}</h2>
        <p className="muted">{t('backup_desc')}</p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => void onExport()}>
            {t('backup_export')}
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            {t('backup_import')}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            // 같은 파일을 연속으로 고를 수 있게 값을 비운다(change 이벤트가 안 뜨는 문제).
            e.target.value = ''
            if (file) void onImport(file)
          }}
        />
        {backupMsg && (
          <p className="feedback-ok" role="status">
            {backupMsg}
          </p>
        )}
        {backupError && (
          <p className="error-text" role="alert">
            {backupError}
          </p>
        )}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('settings_data')}</h2>
        <button
          type="button"
          className="btn btn--danger"
          style={{ width: '100%' }}
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
