import { ConnectionBadge } from '../components/ConnectionBadge'
import { useApp, type FontSize } from '../context/AppContext'
import { OLLAMA_MODEL } from '../services/ollama'

const VERSION = '0.1.0'

const changelog = [
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
    setTtsVoice,
    setTtsSpeed,
    ollamaOk,
    ttsOk,
    voices,
    refreshStatus,
    ttsError,
  } = useApp()

  return (
    <main className="page">
      <h1>설정</h1>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>연결 상태</h2>
        <div className="btn-row">
          <ConnectionBadge label="Ollama" ok={ollamaOk} />
          <ConnectionBadge label="TTS" ok={ttsOk} />
          <button type="button" className="btn" onClick={() => void refreshStatus()}>
            다시 확인
          </button>
        </div>
        <p className="muted mono" style={{ marginTop: 12 }}>
          Ollama 모델: {OLLAMA_MODEL} · http://127.0.0.1:11434
        </p>
        <p className="muted mono">TTS: http://127.0.0.1:8765 (qwen3)</p>
        {ttsError && <p className="error-text">{ttsError}</p>}
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>글자 크기</h2>
        <div className="chip-row">
          {(
            [
              ['sm', '작음 16px'],
              ['md', '보통 18px'],
              ['lg', '큼 20px'],
            ] as [FontSize, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              className={`chip${settings.fontSize === v ? ' is-on' : ''}`}
              onClick={() => setFontSize(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>TTS</h2>
        <label className="label" htmlFor="voice">
          보이스
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
          속도 {settings.ttsSpeed}%
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
        <h2 style={{ marginTop: 0 }}>히스토리 / 업데이트 내역</h2>
        <p className="mono">버전 {VERSION}</p>
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
