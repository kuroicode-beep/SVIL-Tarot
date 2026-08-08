// src/components/ErrorBoundary.tsx — 렌더 예외를 잡아 백지 화면을 막는다.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { translate, type Locale } from '../i18n'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/**
 * 설정이 localStorage에 남아 있어 새로고침만으로는 복구가 안 되는 경우가 있다.
 * 그래서 안내와 함께 '설정 초기화 후 새로고침' 경로를 같이 준다.
 * 이 컴포넌트는 AppProvider 바깥에서도 살아야 하므로 useApp 대신 translate를 직접 쓴다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 개인정보 본문은 남기지 않는다. 스택만 콘솔로 흘린다.
    console.error('[SVIL-Tarot] render error', error.message, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const locale = (document.documentElement.lang || 'ko') as Locale
    const t = (key: string) => translate(locale, key)
    return (
      <main className="page">
        <h1>{t('err_boundary_title')}</h1>
        <p className="error-text" role="alert">
          {t('err_boundary_desc')}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            {t('err_boundary_reload')}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              localStorage.removeItem('svil-tarot-settings')
              window.location.reload()
            }}
          >
            {t('settings_title')}
          </button>
        </div>
      </main>
    )
  }
}
