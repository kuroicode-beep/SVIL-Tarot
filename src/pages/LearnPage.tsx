import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import lessons from '../data/lessons.json'
import { getCard } from '../lib/cards'
import { TarotCardView } from '../components/TarotCardView'
import { useApp } from '../context/AppContext'

type Stage = (typeof lessons.stages)[number]

export function LearnPage() {
  const { stageId } = useParams()
  const nav = useNavigate()
  const { speak, setLastSpeakText, t } = useApp()
  const stages = lessons.stages as Stage[]
  const stage = stages.find((s) => s.id === stageId) ?? stages[0]
  const [idx, setIdx] = useState(0)

  const card = useMemo(() => getCard(stage.cardIds[Math.min(idx, stage.cardIds.length - 1)]), [stage, idx])

  const speakLesson = () => {
    const text = `${stage.title}. ${card.nameKo}. 정방향: ${card.upright}. 역방향: ${card.reversed}. ${card.lesson}`
    setLastSpeakText(text)
    void speak(text)
  }

  if (!stageId) {
    return (
      <main className="page" id="main">
        <h1>{t('home_learn')}</h1>
        <p className="muted">단계별로 카드를 익히고, 퀴즈로 확인합니다.</p>
        <div className="list-choice" style={{ marginTop: 20 }}>
          {stages.map((s, i) => (
            <button key={s.id} type="button" onClick={() => nav(`/learn/${s.id}`)}>
              <strong>
                {i + 1}. {s.title}
              </strong>
              <div className="muted">{s.description}</div>
              <div className="muted mono">카드 {s.cardIds.length}장</div>
            </button>
          ))}
        </div>
      </main>
    )
  }

  return (
    <div className="learn-layout" id="main">
      <aside className="learn-sidebar" aria-label="학습 단계">
        <p className="learn-sidebar__title">{stage.title}</p>
        <div className="learn-sidebar__list">
          {stage.cardIds.map((id, i) => {
            const c = getCard(id)
            const active = i === idx
            return (
              <button
                key={id}
                type="button"
                className={`learn-step${active ? ' is-active' : ''}`}
                onClick={() => setIdx(i)}
                aria-current={active ? 'step' : undefined}
              >
                <span className="learn-step__num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>
                  <span className="learn-step__label">카드 {i + 1}</span>
                  <span className="learn-step__name">
                    {c.nameKo} ({c.nameEn})
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <Link className="btn" to="/learn" style={{ marginTop: 12 }}>
          단계 목록
        </Link>
      </aside>

      <main className="learn-main">
        <div className="lesson-badge">Lesson · {stage.title}</div>
        <h1>
          {card.nameKo}{' '}
          <span className="muted" style={{ fontSize: '1rem' }}>
            ({card.nameEn})
          </span>
        </h1>
        <p className="progress mono">
          {idx + 1} / {stage.cardIds.length}
        </p>

        <div className="learn-bento">
          <div className="learn-bento__card">
            <TarotCardView cardId={card.id} large />
          </div>
          <div className="learn-bento__text panel">
            <p>
              <strong>{t('upright')}</strong>: {card.upright}
            </p>
            <p>
              <strong>{t('reversed')}</strong>: {card.reversed}
            </p>
            <p>{card.lesson}</p>
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="btn" onClick={speakLesson}>
            {t('nav_tts')}
          </button>
          <button
            type="button"
            className="btn"
            disabled={idx === 0}
            onClick={() => setIdx((v) => Math.max(0, v - 1))}
          >
            이전
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (idx < stage.cardIds.length - 1) setIdx((v) => v + 1)
              else nav(`/learn/${stage.id}/quiz`)
            }}
          >
            {idx < stage.cardIds.length - 1 ? '다음' : '퀴즈 풀기'}
          </button>
          <Link className="btn" to={`/learn/${stage.id}/quiz`}>
            퀴즈로 바로가기
          </Link>
        </div>
      </main>
    </div>
  )
}
