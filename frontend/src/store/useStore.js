import { create } from 'zustand'
import api from '../utils/api'

// ── Token expiry helpers ────────────────────────────────────────────────────
// JWT payload is base64url — decode it to check the `exp` claim client-side
// so we never need a round-trip to validate a fresh session.
function _parseJwt(token) {
  try {
    const payload = token.split('.')[1]
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

function _isTokenExpired(token) {
  if (!token) return true
  const payload = _parseJwt(token)
  if (!payload?.exp) return true
  // Add a 60-second buffer so we refresh slightly before actual expiry
  return Date.now() / 1000 > payload.exp - 60
}

// Read persisted auth — return null if the stored JWT is already expired
function _loadPersistedAuth() {
  const token = localStorage.getItem('docuflow_token')
  const user  = JSON.parse(localStorage.getItem('docuflow_user') || 'null')
  if (!token || !user || _isTokenExpired(token)) {
    // Clear stale data silently
    localStorage.removeItem('docuflow_token')
    localStorage.removeItem('docuflow_user')
    return { token: null, user: null }
  }
  return { token, user }
}

const { token: _initialToken, user: _initialUser } = _loadPersistedAuth()

export const useStore = create((set, get) => ({
  // ── Auth ───────────────────────────────────────────────────────────────────
  user:  _initialUser,
  token: _initialToken,

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

  // Refresh user data from server — NEVER clears session on network failure.
  // Only logs out on an explicit 401 (token revoked / invalid).
  refreshUser: async () => {
    const { token } = get()
    // Don't even try if we have no token or it's already expired
    if (!token || _isTokenExpired(token)) {
      get().logout()
      return null
    }
    try {
      const res  = await api.get('/auth/me')
      const user = res.data
      localStorage.setItem('docuflow_user', JSON.stringify(user))
      set({ user })
      return user
    } catch (err) {
      // 401 = token rejected by server → logout
      if (err?.response?.status === 401) {
        get().logout()
        return null
      }
      // Any other error (network, 500, timeout) → keep existing session intact
      // The user stays logged in and sees their cached data
      return get().user
    }
  },

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

  // ── UI ─────────────────────────────────────────────────────────────────────
  showUpgradeModal:    false,
  setShowUpgradeModal: (v) => set({ showUpgradeModal: v }),
}))