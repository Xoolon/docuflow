import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useStore } from './store/useStore'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ConvertPage from './pages/ConvertPage'
import AIPage from './pages/AIPage'
import HistoryPage from './pages/HistoryPage'
import PaymentVerifyPage from './pages/PaymentVerifyPage'
import BuyTokensPage from './pages/BuyTokensPage'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import AdminPage from './pages/AdminPage'
import UpgradeModal from './components/UpgradeModal'

function ProtectedRoute({ children }) {
  const token = useStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
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
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/payment/verify" element={<PaymentVerifyPage />} />
           <Route path="/terms"          element={<TermsPage />} />
        <Route path="/privacy"        element={<PrivacyPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<DashboardPage />} />
          <Route path="convert"    element={<ConvertPage />} />
          <Route path="ai"         element={<AIPage />} />
          <Route path="history"    element={<HistoryPage />} />
          <Route path="buy-tokens" element={<BuyTokensPage />} />
          <Route path="admin"      element={<AdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <SpeedInsights />
    </BrowserRouter>
  )
}