import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

/** URL `?customer=` 로 서비스 화면 고객을 프리필한다. */
export function useCustomerQueryParam(): [string, (id: string) => void] {
  const [params] = useSearchParams()
  const fromUrl = params.get('customer') ?? ''
  const [customerId, setCustomerId] = useState(fromUrl)

  useEffect(() => {
    if (fromUrl) setCustomerId(fromUrl)
  }, [fromUrl])

  return [customerId, setCustomerId]
}
