import { useState } from 'react'

interface DocumentEditorProps {
  content: string
  onChange: (content: string) => void
  onSave: () => Promise<void>
}

export default function DocumentEditor({ content, onChange, onSave }: DocumentEditorProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)
      await onSave()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save document')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error && (
        <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#b91c1c', borderRadius: 4 }}>
          {error}
        </div>
      )}
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          height: '60vh',
          fontFamily: 'monospace',
          fontSize: 14,
          padding: 12,
          border: '1px solid #d1d5db',
          borderRadius: 4,
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
        placeholder="Document content (markdown supported)..."
      />
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          alignSelf: 'flex-end',
          padding: '8px 20px',
          background: saved ? '#16a34a' : '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Document'}
      </button>
    </div>
  )
}
