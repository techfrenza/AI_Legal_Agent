import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listDocuments,
  createDocument,
  deleteDocument,
  type Document,
} from '../api'

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [jurisdiction, setJurisdiction] = useState('US')
  const navigate = useNavigate()

  async function load() {
    try {
      setDocs(await listDocuments())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!title.trim()) return
    try {
      const doc = await createDocument({ title: title.trim(), content: '', jurisdiction })
      setTitle('')
      navigate(`/documents/${doc.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this document?')) return
    await deleteDocument(id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div>
      <h2>Documents</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New document title"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }}
        />
        <select
          value={jurisdiction}
          onChange={(e) => setJurisdiction(e.target.value)}
          style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: 4 }}
        >
          <option value="US">US</option>
          <option value="EU">EU</option>
          <option value="UK">UK</option>
        </select>
        <button
          onClick={handleCreate}
          style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
        >
          + New
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : docs.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No documents yet. Create one above.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Title</th>
              <th style={{ padding: '8px 12px' }}>Jurisdiction</th>
              <th style={{ padding: '8px 12px' }}>Updated</th>
              <th style={{ padding: '8px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 12px' }}>
                  <a
                    href={`/documents/${doc.id}`}
                    onClick={(e) => { e.preventDefault(); navigate(`/documents/${doc.id}`) }}
                    style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                  >
                    {doc.title}
                  </a>
                </td>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{doc.jurisdiction}</td>
                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 13 }}>
                  {new Date(doc.updated_at).toLocaleString()}
                </td>
                <td style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => navigate(`/analysis/${doc.id}`)}
                    style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}
                  >
                    Analyse
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    style={{ padding: '4px 10px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontSize: 12, color: '#b91c1c' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
