import { useEffect, useState } from 'react'
import {
  deleteHistory,
  listHistory,
  type HistoryEntry,
} from '../services/history'
import { SpreadCards } from '../components/TarotCardView'
import { cardImageUrl } from '../lib/cards'
import { useApp } from '../context/AppContext'

const kindLabel: Record<string, string> = {
  practice: '실전',
  ai: 'AI 타로',
  soul: '소울카드',
  learn: '배우기',
}

export function HistoryPage() {
  const [items, setItems] = useState<HistoryEntry[]>([])
  const [open, setOpen] = useState<HistoryEntry | null>(null)
  const { speak, setLastSpeakText } = useApp()

  const reload = async () => {
    setItems(await listHistory())
  }

  useEffect(() => {
    void reload()
  }, [])

  if (open) {
    return (
      <main className="page">
        <h1>{open.title}</h1>
        <p className="mono muted">{new Date(open.createdAt).toLocaleString()}</p>
        <p>
          <span className="status-badge status-badge--warn">{kindLabel[open.kind] ?? open.kind}</span>
        </p>
        {open.cards && open.cards.length > 0 && <SpreadCards cards={open.cards} />}
        {open.userNote && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>나의 해설</h2>
            <p className="ai-result">{open.userNote}</p>
          </div>
        )}
        {open.aiText && (
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>AI / 설명</h2>
            <div className="ai-result">{open.aiText}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setLastSpeakText(open.aiText ?? '')
                  void speak(open.aiText ?? '')
                }}
              >
                읽어주기
              </button>
            </div>
          </div>
        )}
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => setOpen(null)}>
            목록
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              await deleteHistory(open.id)
              setOpen(null)
              await reload()
            }}
          >
            삭제
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <h1>History</h1>
      <p className="muted">저장된 리딩과 소울카드 기록입니다.</p>
      {items.length === 0 ? (
        <div className="panel">
          <p>저장된 기록이 없습니다. 실전·AI 타로·소울카드에서 저장해 보세요.</p>
        </div>
      ) : (
        <div className="list-choice" style={{ marginTop: 16 }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="history-item"
              onClick={() => setOpen(item)}
            >
              <div className="history-thumbs">
                {(item.cards ?? []).slice(0, 3).map((c) => (
                  <img
                    key={c.id + String(c.isReversed)}
                    src={cardImageUrl(c.id)}
                    alt=""
                    style={c.isReversed ? { transform: 'rotate(180deg)' } : undefined}
                  />
                ))}
              </div>
              <div>
                <div>
                  <strong>{item.title}</strong>
                </div>
                <div className="muted">
                  {kindLabel[item.kind] ?? item.kind} ·{' '}
                  <span className="mono">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  )
}
