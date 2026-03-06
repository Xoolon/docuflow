import { create } from 'zustand'
import api from '../utils/api'

export const useStore = create((set, get) => ({
  // ── Auth ──────────────────────────────────────────────────────────────────
  user:  JSON.parse(localStorage.getItem('docuflow_user') || 'null'),
  token: localStorage.getItem('docuflow_token') || null,

  setAuth: (user, token) => {
    localStorage.setItem('docuflow_token', token)
    localStorage.setItem('docuflow_user', JSON.stringify(user))
    set({ user, token })
  },

  logout: () => {
    localStorage.removeItem('docuflow_token')
    localStorage.removeItem('docuflow_user')
    set({ user: null, token: null })
  },

  // Pull fresh user data (token balance etc.) from /auth/me
  refreshUser: async () => {
    try {
      const res  = await api.get('/auth/me')
      const user = res.data
      localStorage.setItem('docuflow_user', JSON.stringify(user))
      set({ user })
      return user
    } catch (err) {
      // Only force logout on explicit 401 — NOT on network errors or 500s
      // A network error would wipe the session and blank the page
      if (err?.response?.status === 401) {
        get().logout()
      }
      // Otherwise silently keep stale user data — page still renders
    }
  },

  // Instantly decrement displayed balance without waiting for a network call
  deductTokensOptimistic: (amount) => {
    const { user } = get()
    if (!user) return
    const updated = {
      ...user,
      tokens_balance: Math.max(0, (user.tokens_balance ?? 0) - amount),
    }
    localStorage.setItem('docuflow_user', JSON.stringify(updated))
    set({ user: updated })
  },

  // ── UI ────────────────────────────────────────────────────────────────────
  showUpgradeModal:    false,
  setShowUpgradeModal: (v) => set({ showUpgradeModal: v }),
}))