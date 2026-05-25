import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Notification {
  id: number
  type: string
  document_id?: number
  document_title?: string
  risk_score?: number
  regulations?: string[]
  read: boolean
  timestamp: string
}

let _idSeq = 0

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const navigate = useNavigate()

  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.host}/ws/notifications`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data)
      const note: Notification = {
        id: ++_idSeq,
        timestamp: new Date().toISOString(),
        read: false,
        ...payload,
      }
      setNotifications((prev) => [note, ...prev].slice(0, 50))
    }

    return () => ws.close()
  }, [])

  function markRead(id: number) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  function handleClick(n: Notification) {
    markRead(n.id)
    if (n.document_id) {
      navigate(`/documents/${n.document_id}`)
    }
    setOpen(false)
  }

  function label(n: Notification): string {
    if (n.type === 'analysis_complete')
      return `✅ Analysis done: "${n.document_title}" — risk ${n.risk_score}/10`
    if (n.type === 'compliance_violation')
      return `⚠️ Violation in "${n.document_title}": ${(n.regulations ?? []).join(', ')}`
    return n.type
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: 'relative',
          background: 'none',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: 18,
        }}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#dc2626',
              color: '#fff',
              borderRadius: '50%',
              fontSize: 10,
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            width: 360,
            maxHeight: 400,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {notifications.length === 0 ? (
            <div style={{ padding: 16, color: '#6b7280' }}>No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f3f4f6',
                  background: n.read ? '#fff' : '#eff6ff',
                  fontWeight: n.read ? 'normal' : 600,
                  fontSize: 13,
                }}
              >
                <div>{label(n)}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  {new Date(n.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
