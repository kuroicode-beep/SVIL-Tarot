import { useApp, type FontSize } from '../context/AppContext'
import { ConnectionBadge } from '../components/ConnectionBadge'
import { OLLAMA_MODEL } from '../services/ollama'
import { clearHistory } from '../services/history'
import { fontOptions, localeLabels, type FontId, type Locale } from '../i18n'
import { useState } from 'react'

const VERSION = '1.0.0'

const changelog = [
  {
    version: '1.0.0',
    lines: [
      '안정판: Stitch형 배우기/AI 레이아웃, 메이저 전체 퀴즈',
      '런북·GitHub Pages 랜딩·접근성 skip-link',
      '로드맵 Phase2–3 완료',
    ],
  },
  {
    version: '0.3.0',
    lines: [
      '콘텐츠·퀴즈 확장, CORS/preview 런북',
      'AI 2열·배우기 사이드바 Stitch 정렬',
    ],
  },
  {
    version: '0.2.0',
    lines: [
      '글꼴·언어(5종) 설정, 상단 저장 버튼, 기록 초기화',
      '홈 Star 실루엣 배경, 바탕화면 바로가기 스크립트',
      '로드맵 v0.2 작업지시 확정',
    ],
  },
  {
    version: '0.1.0',
    lines: [
      '타로 배우기·스프레드·실전·AI 타로·소울카드 첫 공개',
      'Ollama gemma4:12b · TTS · 저장/히스토리',
      '저시력 고대비 덱 · 전체화면 · SVIL 디자인',
    ],
  },
]

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
          {t('settings_speed')} {settings.ttsSpeed}%
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
        <p className="mono">v{VERSION}</p>
        {changelog.map((c) => (
          <div key={c.version} style={{ marginTop: 12 }}>
            <strong className="mono">v{c.version}</strong>
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
