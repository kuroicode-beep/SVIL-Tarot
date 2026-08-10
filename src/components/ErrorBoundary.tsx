// src/components/ErrorBoundary.tsx — 렌더 예외를 잡아 백지 화면을 막는다.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { translate, type Locale } from '../i18n'

type Props = {
  children: ReactNode
  /**
   * 이 값이 바뀌면 오류 상태를 푼다. 라우트 경로를 넣으면 '다른 화면으로 이동'만으로 복구된다.
   * 안 넣으면 오류가 한 번 나면 새로고침 전까지 계속 오류 화면이다(최상위 경계의 동작).
   */
  resetKey?: string
  /**
   * 화면(라우트) 안쪽 경계. 상단바·내비게이션은 살아 있으므로 '설정 초기화' 같은
   * 전역 복구 수단은 빼고, 이 화면만 다시 시도하는 안내로 좁힌다.
   */
  scope?: 'app' | 'route'
}
type State = { hasError: boolean; chunkFailed: boolean; resetKey?: string }

/**
 * 청크 내려받기 실패인지. 라우트를 코드 분할하면서 새로 생긴 실패 종류다.
 * 원인이 '코드 버그'가 아니라 '네트워크·배포 갱신'이라 안내와 복구 방법이 다르다.
 */
function isChunkError(error: Error): boolean {
  const text = `${error.name} ${error.message}`
  return (
    /Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
      text,
    ) || error.name === 'ChunkLoadError'
  )
}

/**
 * 설정이 localStorage에 남아 있어 새로고침만으로는 복구가 안 되는 경우가 있다.
 * 그래서 안내와 함께 '설정 초기화 후 새로고침' 경로를 같이 준다.
 * 이 컴포넌트는 AppProvider 바깥에서도 살아야 하므로 useApp 대신 translate를 직접 쓴다.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, chunkFailed: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, chunkFailed: error instanceof Error && isChunkError(error) }
  }

  // 경로가 바뀌면 오류를 푼다. 안 그러면 화면 하나가 실패한 뒤 다른 화면으로 가도 오류 화면이 남는다.
  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) {
      return { hasError: false, chunkFailed: false, resetKey: props.resetKey }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 개인정보 본문은 남기지 않는다. 스택만 콘솔로 흘린다.
    console.error('[SVIL-Tarot] render error', error.message, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const locale = (document.documentElement.lang || 'ko') as Locale
    const t = (key: string) => translate(locale, key)
    const chunk = this.state.chunkFailed
    return (
      <main className="page">
        <h1>{chunk ? t('err_chunk_title') : t('err_boundary_title')}</h1>
        <p className="error-text" role="alert">
          {chunk ? t('err_chunk_desc') : t('err_boundary_desc')}
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            {t('err_boundary_reload')}
          </button>
          {/* 화면 안쪽 경계에서는 상단바가 살아 있으므로 전역 초기화를 권하지 않는다.
              라벨이 '설정'이면 설정 화면으로 가는 줄 알고 누른다 — 실제로는 접근성 설정을
              전부 지우므로 무엇이 지워지는지 라벨과 확인 창에 그대로 적는다. */}
          {this.props.scope !== 'route' && (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                if (!window.confirm(t('err_boundary_reset_confirm'))) return
                localStorage.removeItem('svil-tarot-settings')
                window.location.reload()
              }}
            >
              {t('err_boundary_reset_settings')}
            </button>
          )}
        </div>
      </main>
    )
  }
}
