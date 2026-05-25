import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import NotificationBell from './components/NotificationBell'
import DocumentsPage from './pages/DocumentsPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import AnalysisPage from './pages/AnalysisPage'
import TemplatesPage from './pages/TemplatesPage'

function LoginScreen() {
  const { setApiKey } = useAuth()
  const [key, setKey] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16 }}>
      <h1 style={{ fontSize: 24, margin: 0 }}>⚖️ AI Legal Agent</h1>
      <p style={{ color: '#6b7280', margin: 0 }}>Enter your API key to continue</p>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && key && setApiKey(key)}
        placeholder="API key"
        style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 6, width: 280, fontSize: 16 }}
      />
      <button
        onClick={() => key && setApiKey(key)}
        style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15 }}
      >
        Sign In
      </button>
    </div>
  )
}

const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 6,
  textDecoration: 'none',
  color: isActive ? '#2563eb' : '#374151',
  fontWeight: isActive ? 600 : 400,
  background: isActive ? '#eff6ff' : 'transparent',
})

function Layout() {
  const { isAuthenticated, setApiKey } = useAuth()
  if (!isAuthenticated) return <LoginScreen />
  return (
    <div style={{ minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        <span style={{ fontWeight: 700, fontSize: 18, marginRight: 16 }}>⚖️ Legal Agent</span>
        <NavLink to="/documents" style={navLinkStyle}>Documents</NavLink>
        <NavLink to="/templates" style={navLinkStyle}>Templates</NavLink>
        <div style={{ flex: 1 }} />
        <NotificationBell />
        <button
          onClick={() => setApiKey('')}
          style={{ marginLeft: 12, padding: '6px 12px', background: 'none', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
        >
          Sign out
        </button>
      </nav>
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/documents" replace />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:docId" element={<DocumentDetailPage />} />
          <Route path="/analysis/:docId" element={<AnalysisPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AuthProvider>
  )
}
