// src/components/OllamaControl.tsx — 상단바에 상시 노출되는 Ollama 서버 상태와 모델 올리기/내리기.
import { useCallback, useEffect, useRef, useState } from 'react'
import { isModelLoaded, loadModel, unloadModel } from '../services/ollama'
import { useApp } from '../context/AppContext'

/**
 * 브라우저는 로컬 프로세스를 띄우거나 죽일 수 없다.
 * 그래서 '시작/중지'가 실제로 뜻하는 것은 **모델을 VRAM에 올리고 내리는 것**이고,
 * 서버 자체가 꺼져 있으면 실행할 명령을 텍스트로 알려 주는 데까지가 최선이다.
 */
export function OllamaControl() {
  const { ollamaOk, refreshStatus, t } = useApp()
  const [loaded, setLoaded] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<'load' | 'unload' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const syncLoaded = useCallback(async () => {
    if (!ollamaOk) {
      setLoaded(null)
      return
    }
    const v = await isModelLoaded()
    if (aliveRef.current) setLoaded(v)
  }, [ollamaOk])

  useEffect(() => {
    void syncLoaded()
  }, [syncLoaded])

  // 서버가 살아 있는 동안만 주기 확인한다. 꺼져 있으면 매번 실패 요청을 보낼 이유가 없다.
  useEffect(() => {
    if (!ollamaOk) return
    const id = window.setInterval(() => void syncLoaded(), 20_000)
    return () => window.clearInterval(id)
  }, [ollamaOk, syncLoaded])

  const run = async (kind: 'load' | 'unload') => {
    setError(null)
    setBusy(kind)
    try {
      if (kind === 'load') await loadModel()
      else await unloadModel()
      await refreshStatus()
      await syncLoaded()
    } catch {
      if (aliveRef.current) setError(kind === 'load' ? t('ai_load_failed') : t('ai_unload_failed'))
    } finally {
      if (aliveRef.current) setBusy(null)
    }
  }

  // 상태는 색이 아니라 텍스트로 읽힌다. 점은 보조 신호일 뿐이다.
  const statusClass =
    ollamaOk === null ? 'status-badge--warn' : ollamaOk ? 'status-badge--ok' : 'status-badge--bad'
  const statusText =
    ollamaOk === null
      ? t('status_checking')
      : !ollamaOk
        ? t('status_bad')
        : loaded === null
          ? t('status_ok')
          : loaded
            ? t('ai_model_loaded')
            : t('ai_model_unloaded')

  return (
    <div className="ollama-control">
      <span className={`status-badge ${statusClass}`} role="status">
        AI: {statusText}
      </span>

      {ollamaOk ? (
        <>
          <button
            type="button"
            className="btn ollama-control__btn"
            aria-busy={busy === 'load' || undefined}
            aria-disabled={busy !== null || loaded === true || undefined}
            onClick={() => {
              if (busy !== null || loaded === true) return
              void run('load')
            }}
          >
            {busy === 'load' ? t('ai_loading') : t('ai_load')}
          </button>
          <button
            type="button"
            className="btn ollama-control__btn"
            aria-busy={busy === 'unload' || undefined}
            aria-disabled={busy !== null || loaded === false || undefined}
            onClick={() => {
              if (busy !== null || loaded === false) return
              void run('unload')
            }}
          >
            {busy === 'unload' ? t('ai_unloading') : t('ai_unload')}
          </button>
        </>
      ) : (
        // 서버가 꺼져 있으면 브라우저가 할 수 있는 게 없다. 실행할 명령을 그대로 보여 준다.
        <span className="ollama-control__hint mono">{t('ai_start_hint')}</span>
      )}

      <button
        type="button"
        className="btn ollama-control__btn"
        onClick={() => void (async () => {
          await refreshStatus()
          await syncLoaded()
        })()}
      >
        {t('settings_refresh')}
      </button>

      {error && (
        <span className="error-text ollama-control__error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
