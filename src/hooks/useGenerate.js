import { useState } from 'react'
import { generatePlan } from '../api/forge'

export function useGenerate() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generate = async (data) => {
    setLoading(true)
    setError(null)
    try {
      const res = await generatePlan(data)
      setPlan(res.plan)
    } catch (e) {
      setError('Сервер не отвечает. Запусти node server.js')
    } finally {
      setLoading(false)
    }
  }

  return { plan, loading, error, generate }
}
