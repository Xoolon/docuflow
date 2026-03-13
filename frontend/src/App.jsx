import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useStore } from './store/useStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ConvertPage from './pages/ConvertPage'
import AIPage from './pages/AIPage'
import HistoryPage from './pages/HistoryPage'
import PaymentVerifyPage from './pages/PaymentVerifyPage'
import BuyTokensPage from './pages/BuyTokensPage'
import AdminPage from './pages/AdminPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import UpgradeModal from './components/UpgradeModal'

// ── Route guards ───────────────────────────────────────────────────────────────

function ProtectedRoute({ children }) {
  const token = useStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const token = useStore(s => s.token)
  const user  = useStore(s => s.user)
  if (!token) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />
  return children
}

// Redirect already-logged-in users away from /login
function PublicOnlyRoute({ children }) {
  const token = useStore(s => s.token)
  if (token) return <Navigate to="/dashboard" replace />
  return children
}

// Root redirect — guests go to /convert (public landing), authed users to /dashboard
function RootRedirect() {
  const token = useStore(s => s.token)
  return <Navigate to={token ? '/dashboard' : '/convert'} replace />
}

export default function App() {
  const showUpgradeModal    = useStore(s => s.showUpgradeModal)
  const setShowUpgradeModal = useStore(s => s.setShowUpgradeModal)

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1c1c24',
            color: '#f0f0f8',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00d4aa', secondary: '#0a0a0f' } },
          error:   { iconTheme: { primary: '#ff6b6b', secondary: '#0a0a0f' } },
        }}
      />

      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}

      <Routes>
        {/* ── Root: guests → /convert, authed → /dashboard ─────── */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── Fully public routes (no layout) ──────────────────── */}
        <Route path="/login"   element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/terms"   element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/payment/verify" element={<PaymentVerifyPage />} />

        {/* ── Public app routes — inside Layout, no auth required ─ */}
        {/* /convert is accessible to guests; login prompt fires on submit */}
        <Route element={<Layout />}>
          <Route path="/convert" element={<ConvertPage />} />
        </Route>

        {/* ── Protected app routes — require login ──────────────── */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard"  element={<DashboardPage />} />
          <Route path="/ai"         element={<AIPage />} />
          <Route path="/history"    element={<HistoryPage />} />
          <Route path="/buy-tokens" element={<BuyTokensPage />} />
          <Route element={<AdminRoute><AdminPage /></AdminRoute>}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>

        {/* Catch-all — unknown paths go to root (which then redirects) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}