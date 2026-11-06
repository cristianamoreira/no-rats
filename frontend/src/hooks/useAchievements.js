import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

/**
 * Hook para gerenciar achievements do usuário.
 * Busca achievements desbloqueadas, marca como visto, e fornece stats.
 */
export function useAchievements(token) {
  const [achievements, setAchievements] = useState([])
  const [stats, setStats] = useState(null)
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const api = axios.create({
    baseURL: '/api',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  /**
   * Busca achievements do usuário
   */
  const fetchAchievements = useCallback(async () => {
    if (!token) return

    try {
      setLoading(true)
      setError(null)

      const response = await api.get('/user/achievements/')
      setAchievements(response.data || [])
    } catch (err) {
      console.error('Failed to fetch achievements:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [token, api])

  /**
   * Busca estatísticas de achievements
   */
  const fetchStats = useCallback(async () => {
    if (!token) return

    try {
      const response = await api.get('/user/achievements/stats/')
      setStats(response.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [token, api])

  /**
   * Busca progresso em relação a achievements bloqueados
   */
  const fetchProgress = useCallback(async () => {
    if (!token) return

    try {
      const response = await api.get('/user/achievements/progress/')
      setProgress(response.data || {})
    } catch (err) {
      console.error('Failed to fetch progress:', err)
    }
  }, [token, api])

  /**
   * Marca um achievement como visto (dismiss toast)
   */
  const markSeen = useCallback(
    async (achievementId) => {
      if (!token) return

      try {
        await api.post(`/user/achievements/${achievementId}/seen/`)

        // Atualiza state localmente
        setAchievements((prev) =>
          prev.map((a) =>
            a.id === achievementId ? { ...a, seen: true } : a
          )
        )
      } catch (err) {
        console.error('Failed to mark achievement as seen:', err)
      }
    },
    [token, api]
  )

  /**
   * Busca todos os templates de achievements
   */
  const fetchAllAchievements = useCallback(async () => {
    try {
      const response = await api.get('/achievements/')
      return response.data || []
    } catch (err) {
      console.error('Failed to fetch all achievements:', err)
      return []
    }
  }, [api])

  /**
   * Busca achievements não vistos (aqueles que desbloquearam mas não viram notificação)
   */
  const fetchUnseenAchievements = useCallback(async () => {
    if (!token) return []

    try {
      const response = await api.get('/user/achievements/?unseen=true')
      return response.data || []
    } catch (err) {
      console.error('Failed to fetch unseen achievements:', err)
      return []
    }
  }, [token, api])

  /**
   * Efeito: Busca inicial de dados ao montar ou mudar token
   */
  useEffect(() => {
    if (token) {
      fetchAchievements()
      fetchStats()
      fetchProgress()

      // Poll a cada 5 segundos para novas achievements
      const interval = setInterval(() => {
        fetchAchievements()
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [token, fetchAchievements, fetchStats, fetchProgress])

  return {
    // Data
    achievements,
    stats,
    progress,
    error,
    loading,

    // Methods
    fetchAchievements,
    fetchStats,
    fetchProgress,
    markSeen,
    fetchAllAchievements,
    fetchUnseenAchievements,

    // Helpers
    unseenCount: achievements.filter((a) => !a.seen).length,
    totalUnlocked: achievements.length,
  }
}
