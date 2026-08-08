// src/components/ReadingPlayer.tsx — 장문 리딩 결과를 문장 단위로 낭독·강조해 읽던 위치(주시점)를 잃지 않게 하는 플레이어

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'

// 반각 부호(. ! ? …)는 "뒤에 오는 공백·줄바꿈"이 있을 때만 경계로 본다.
// split('.')이나 부호 자체로 자르면 3.14 · a.m. 같은 표기가 통째로 쪼개진다.
// 반면 전각 부호(。！？)는 일본어·중국어에서 뒤에 공백을 두지 않는 게 정상이라
// 공백을 요구하면 ja·zh 리딩 전체가 한 문장으로 뭉쳐 플레이어가 무용지물이 된다. 그래서 \s*로 푼다.
const SENTENCE_BOUNDARY = /(?<=[.!?…])\s+|(?<=[。！？])\s*|\n+/

function splitSentences(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const parts = trimmed
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  // 문장부호가 하나도 없는 한 덩어리 글이면 통째로 한 문장으로 다룬다.
  return parts.length > 0 ? parts : [trimmed]
}

export function ReadingPlayer({ text, title }: { text: string; title?: string }) {
  const { t, speak, stopSpeak, ttsError } = useApp()
  const headingId = useId()

  const sentences = useMemo(() => splitSentences(text), [text])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  // 순차 재생의 취소 판별용 세대 카운터.
  // speaking/playing state를 보면 async 루프의 클로저가 옛 값을 들고 있어
  // 중지 직후에도 다음 문장이 새 나간다. ref는 즉시 최신값이 보인다.
  const runRef = useRef(0)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  // 렌더마다 최신 오류를 담아 두는 거울. async 루프 안에서는 state를 직접 못 읽는다.
  // 오류의 표현 형태(문자열/객체)는 컨텍스트 사정이라 여기서는 유무만 본다.
  const ttsErrorRef = useRef<unknown>(ttsError)
  ttsErrorRef.current = ttsError
  const mountedRef = useRef(false)

  const stop = useCallback(() => {
    runRef.current += 1
    setPlaying(false)
    stopSpeak()
  }, [stopSpeak])

  const play = useCallback(
    async (from: number) => {
      const myRun = ++runRef.current
      setPlaying(true)
      for (let i = from; i < sentences.length; i += 1) {
        if (runRef.current !== myRun) return
        setIndex(i)
        await speak(sentences[i])
        if (runRef.current !== myRun) return
        // speak()는 TTS 오류를 내부에서 삼키고 정상 resolve한다. 그대로 두면 서버가 죽었을 때
        // 문장 수십 개를 순식간에 훑고 지나간다. 한 틱 양보해 오류 상태가 반영된 뒤 확인하고 멈춘다.
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 0)
        })
        if (runRef.current !== myRun) return
        if (ttsErrorRef.current) break
      }
      if (runRef.current === myRun) setPlaying(false)
    },
    [sentences, speak],
  )

  // 문장 이동은 곧 "그 지점부터 듣기"다. 재생 중이 아니면 강조 위치만 옮긴다.
  const jump = useCallback(
    (target: number, autoPlay: boolean) => {
      const clamped = Math.max(0, Math.min(target, sentences.length - 1))
      stop()
      setIndex(clamped)
      if (autoPlay) void play(clamped)
    },
    [sentences.length, stop, play],
  )

  const toggle = useCallback(() => {
    if (playing) stop()
    else void play(index)
  }, [playing, stop, play, index])

  // 본문이 바뀌면 이전 문장 위치·재생은 의미가 없다. 첫 마운트에서는 남의 낭독을 끊지 않는다.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    runRef.current += 1
    setIndex(0)
    setPlaying(false)
    stopSpeak()
  }, [sentences, stopSpeak])

  useEffect(
    () => () => {
      runRef.current += 1
      stopSpeak()
    },
    [stopSpeak],
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.code !== 'Space') return
      // Shift+Space는 브라우저 기본 '위로 스크롤'이고, Shift·Ctrl+Space는 한글 IME 한/영 전환이다.
      // 조합키가 눌린 Space까지 가로채면 저시력·한글 사용자의 기본 조작을 빼앗는다.
      if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
      // 키를 누르고 있으면 keydown이 연타로 들어와 재생·중지가 초당 수십 번 뒤집힌다.
      if (e.repeat) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      // 입력 중에는 공백이 글자여야 한다. 버튼 위 공백은 브라우저 기본 클릭과 겹쳐
      // 토글이 두 번 일어나므로 함께 가로채지 않는다.
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      if (el?.isContentEditable) return
      e.preventDefault()
      toggle()
    }
    // window 전역으로 걸면 이 플레이어가 붙은 8개 화면에서 Space 스크롤이 통째로 막힌다.
    // Space 스크롤은 저시력·운동장애 사용자의 기본 조작이라 빼앗으면 안 된다(WCAG 2.1.4).
    // 그래서 포커스가 플레이어 안에 있을 때만 가로챈다.
    const root = rootRef.current
    if (!root) return
    root.addEventListener('keydown', onKeyDown)
    return () => root.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  // 낭독이 화면 밖으로 내려가면 주시점을 잃는다. 재생 중일 때만 최소한으로 따라간다.
  useEffect(() => {
    if (!playing) return
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [index, playing])

  if (sentences.length === 0) return null

  const last = sentences.length - 1

  return (
    <section ref={rootRef} className="reading-player panel" aria-labelledby={headingId}>
      <h3 id={headingId} className="label">
        {title ?? t('player_title')}
      </h3>

      <div className="reading-player__controls">
        <button
          type="button"
          className="btn btn--primary"
          onClick={toggle}
          aria-pressed={playing}
        >
          <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
          {playing ? t('player_pause') : t('player_play')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => jump(index - 1, playing)}
          disabled={index === 0}
        >
          <span aria-hidden="true">⏮</span>
          {t('player_prev')}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => jump(index + 1, playing)}
          disabled={index >= last}
        >
          <span aria-hidden="true">⏭</span>
          {t('player_next')}
        </button>
        <button type="button" className="btn" onClick={() => jump(0, true)}>
          <span aria-hidden="true">⟲</span>
          {t('player_restart')}
        </button>
        <span className="mono muted">
          {t('player_progress', { current: index + 1, total: sentences.length })}
        </span>
      </div>

      <ol className="reading-player__list" aria-label={t('player_list_label')}>
        {sentences.map((sentence, i) => {
          const active = i === index
          return (
            <li key={`${i}-${sentence.slice(0, 12)}`}>
              <button
                type="button"
                ref={active ? activeRef : null}
                className={
                  active
                    ? 'reading-player__line reading-player__line--active'
                    : 'reading-player__line'
                }
                aria-current={active ? 'true' : undefined}
                aria-label={t('player_line_label', { n: i + 1, text: sentence })}
                onClick={() => jump(i, true)}
              >
                {/* 현재 문장을 색만으로 알리지 않도록 글리프를 함께 둔다. 비활성은 자리맞춤용 점. */}
                <span aria-hidden="true">{active ? '▶' : '·'}</span>
                <span className="mono">{i + 1}</span>
                <span>{sentence}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
