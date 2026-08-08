// src/pages/LearnPage.tsx — 타로 배우기 화면(단계 목록 · 단계별 카드 학습)
import { useEffect, useMemo, useState } from 'react'
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

  // /learn과 /learn/:stageId가 같은 엘리먼트라 단계를 옮겨도 언마운트되지 않아 idx가 남는다.
  // stage.id로 잡으면 파라미터가 없을 때 stages[0]으로 폴백해 값이 안 바뀌므로, URL 파라미터를 기준으로 초기화한다.
  useEffect(() => setIdx(0), [stageId])

  const card = useMemo(() => getCard(stage.cardIds[Math.min(idx, stage.cardIds.length - 1)]), [stage, idx])

  // 낭독문도 화면 언어를 따라야 해서 정/역방향 라벨을 사전 키로 뺀다.
  const speakLesson = () => {
    const text = `${stage.title}. ${card.nameKo}. ${t('upright')}: ${card.upright}. ${t('reversed')}: ${card.reversed}. ${card.lesson}`
    setLastSpeakText(text)
    void speak(text)
  }

  if (!stageId) {
    return (
      <main className="page">
        <h1>{t('home_learn')}</h1>
        <p className="muted">{t('learn_desc')}</p>
        <div className="list-choice" style={{ marginTop: 20 }}>
          {stages.map((s, i) => (
            <button key={s.id} type="button" onClick={() => nav(`/learn/${s.id}`)}>
              <strong>
                {i + 1}. {s.title}
              </strong>
              <div className="muted">{s.description}</div>
              <div className="muted mono">{t('card_count', { n: s.cardIds.length })}</div>
            </button>
          ))}
        </div>
      </main>
    )
  }

  return (
    <div className="learn-layout">
      <aside className="learn-sidebar" aria-label={t('learn_stage_aria')}>
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
                  <span className="learn-step__label">{t('learn_card_n', { n: i + 1 })}</span>
                  <span className="learn-step__name">
                    {c.nameKo} ({c.nameEn})
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <Link className="btn" to="/learn" style={{ marginTop: 12 }}>
          {t('learn_stage_list')}
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
            {t('prev')}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (idx < stage.cardIds.length - 1) setIdx((v) => v + 1)
              else nav(`/learn/${stage.id}/quiz`)
            }}
          >
            {idx < stage.cardIds.length - 1 ? t('next') : t('learn_take_quiz')}
          </button>
          <Link className="btn" to={`/learn/${stage.id}/quiz`}>
            {t('learn_goto_quiz')}
          </Link>
        </div>
      </main>
    </div>
  )
}
