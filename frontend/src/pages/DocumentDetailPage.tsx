import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDocument, updateDocument, type Document } from '../api'
import DocumentEditor from '../components/DocumentEditor'

export default function DocumentDetailPage() {
  const { docId } = useParams<{ docId: string }>()
  const id = Number(docId)
  const navigate = useNavigate()
  const [doc, setDoc] = useState<Document | null>(null)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDocument(id)
      .then((d) => { setDoc(d); setContent(d.content) })
      .catch(() => setError('Document not found'))
  }, [id])

  async function handleSave() {
    await updateDocument(id, { content })
  }

  if (error) return <div style={{ color: 'red' }}>{error}</div>
  if (!doc) return <div>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => navigate('/documents')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>
          ← Documents
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>{doc.title}</h2>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>{doc.jurisdiction}</span>
        <button
          onClick={() => navigate(`/analysis/${doc.id}`)}
          style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
        >
          Analyse
        </button>
      </div>
      <DocumentEditor content={content} onChange={setContent} onSave={handleSave} />
    </div>
  )
}
