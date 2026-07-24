import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { deckUrl } from '../lib/cards'

export function HomePage() {
  const { setLastSpeakText, t } = useApp()

  const links = [
    { to: '/learn', labelKey: 'home_learn', icon: '📖' },
    { to: '/spreads', labelKey: 'home_spreads', icon: '🃏' },
    {
      to: '/practice',
      labelKey: 'home_practice',
      icon: '✨',
      wide: true,
      hintKey: 'home_practice_hint',
    },
    { to: '/ai', labelKey: 'home_ai', icon: '🤖' },
    { to: '/soul', labelKey: 'home_soul', icon: '💫' },
  ]

  // 전체화면은 사용자 제스처가 필요해 자동 진입은 브라우저가 차단한다. 상단바 버튼으로 진입한다.
  useEffect(() => {
    setLastSpeakText(`${t('brand')}. ${t('tagline')}`)
  }, [setLastSpeakText, t])

  return (
    <main className="page page--center home-page">
      <div className="home-silhouette" aria-hidden="true">
        <img src={deckUrl('17_The_Star_00001_.webp')} alt="" />
      </div>
      <h1 className="hero-title">{t('brand')}</h1>
      <p className="hero-sub">{t('tagline')}</p>
      <div className="home-grid" id="main">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={`home-cta${l.wide ? ' home-cta--wide' : ''}`}
          >
            <span aria-hidden="true" style={{ fontSize: 36 }}>
              {l.icon}
            </span>
            <span>{t(l.labelKey)}</span>
            {l.hintKey && <span className="home-cta__hint">{t(l.hintKey)}</span>}
          </Link>
        ))}
      </div>
    </main>
  )
}
