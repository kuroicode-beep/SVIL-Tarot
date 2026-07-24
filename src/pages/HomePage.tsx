import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

const links = [
  { to: '/learn', label: '타로 배우기', icon: '📖' },
  { to: '/spreads', label: '스프레드', icon: '🃏' },
  { to: '/practice', label: '실전 타로 보기', icon: '✨', wide: true, hint: '나의 해설 + AI 조언' },
  { to: '/ai', label: 'AI 타로', icon: '🤖' },
  { to: '/soul', label: '소울카드', icon: '💫' },
]

export function HomePage() {
  const { enterFullscreen, setLastSpeakText } = useApp()

  useEffect(() => {
    setLastSpeakText('SVIL 타로. 배우기, 스프레드, 실전, AI 타로, 소울카드 메뉴가 있습니다.')
    const timer = window.setTimeout(() => {
      void enterFullscreen()
    }, 400)
    return () => window.clearTimeout(timer)
  }, [enterFullscreen, setLastSpeakText])

  return (
    <main className="page page--center">
      <h1 className="hero-title">SVIL Tarot</h1>
      <p className="hero-sub">배우기 · 스프레드 · 실전 · AI 타로</p>
      <div className="home-grid">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`home-cta${l.wide ? ' home-cta--wide' : ''}`}
          >
            <span aria-hidden="true" style={{ fontSize: 36 }}>
              {l.icon}
            </span>
            <span>{l.label}</span>
            {l.hint && <span className="home-cta__hint">{l.hint}</span>}
          </Link>
        ))}
      </div>
    </main>
  )
}
