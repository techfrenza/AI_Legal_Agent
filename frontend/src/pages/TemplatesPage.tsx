import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listTemplates,
  getTemplate,
  getTemplateVariables,
  createTemplate,
  generateDocument,
  deleteTemplate,
  type Template,
} from '../api'

type View = 'list' | 'create' | 'generate'

export default function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<Template[]>([])
  const [view, setView] = useState<View>('list')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newJurisdiction, setNewJurisdiction] = useState('US')
  const [newContent, setNewContent] = useState('')

  // Generate form state
  const [selectedTmpl, setSelectedTmpl] = useState<Template | null>(null)
  const [variables, setVariables] = useState<string[]>([])
  const [varValues, setVarValues] = useState<Record<string, string>>({})
  const [genTitle, setGenTitle] = useState('')
  const [enhanceAI, setEnhanceAI] = useState(false)

  async function load() {
    setLoading(true)
    try { setTemplates(await listTemplates()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!newName.trim() || !newContent.trim()) return
    setLoading(true); setError(null)
    try {
      await createTemplate({ name: newName.trim(), jurisdiction: newJurisdiction, content: newContent })
      setNewName(''); setNewContent(''); setNewJurisdiction('US')
      setView('list')
      load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function openGenerate(id: number) {
    setLoading(true); setError(null)
    try {
      const [tmpl, vars] = await Promise.all([getTemplate(id), getTemplateVariables(id)])
      setSelectedTmpl(tmpl)
      setVariables(vars.variables)
      setVarValues(Object.fromEntries(vars.variables.map((v) => [v, ''])))
      setGenTitle(`${tmpl.name} — `)
      setView('generate')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleGenerate() {
    if (!selectedTmpl || !genTitle.trim()) return
    setLoading(true); setError(null)
    try {
      const doc = await generateDocument(selectedTmpl.id, {
        title: genTitle.trim(),
        variables: varValues,
        enhance_with_ai: enhanceAI,
      })
      navigate(`/documents/${doc.id}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this template?')) return
    await deleteTemplate(id)
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  if (view === 'create') return (
    <div>
      <h2>New Template</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Template name" style={inputStyle} />
        <select value={newJurisdiction} onChange={(e) => setNewJurisdiction(e.target.value)} style={inputStyle}>
          <option value="US">US</option>
          <option value="EU">EU</option>
          <option value="UK">UK</option>
        </select>
        <div style={{ fontSize: 13, color: '#6b7280' }}>
          Use <code>{'{{variable_name}}'}</code> for placeholders. Example: <code>{'{{client_name}}'}</code>
        </div>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Template content (markdown with {{variables}})..."
          style={{ ...inputStyle, height: '40vh', fontFamily: 'monospace', resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCreate} disabled={loading} style={btnPrimary}>
            {loading ? 'Saving…' : 'Save Template'}
          </button>
          <button onClick={() => setView('list')} style={btnSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  )

  if (view === 'generate' && selectedTmpl) return (
    <div>
      <h2>Generate from: {selectedTmpl.name}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Document title
          <input value={genTitle} onChange={(e) => setGenTitle(e.target.value)} style={{ ...inputStyle, marginTop: 4 }} />
        </label>
        {variables.map((v) => (
          <label key={v} style={{ fontSize: 13, fontWeight: 600 }}>
            {v.replace(/_/g, ' ')}
            <input
              value={varValues[v] ?? ''}
              onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
              placeholder={v}
              style={{ ...inputStyle, marginTop: 4 }}
            />
          </label>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={enhanceAI} onChange={(e) => setEnhanceAI(e.target.checked)} />
          Enhance with AI (Claude will improve the filled document)
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleGenerate} disabled={loading} style={btnPrimary}>
            {loading ? 'Generating…' : 'Generate Document'}
          </button>
          <button onClick={() => setView('list')} style={btnSecondary}>Cancel</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>Templates</h2>
        <button onClick={() => setView('create')} style={btnPrimary}>+ New Template</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {loading ? <p>Loading…</p> : templates.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No templates yet. Create one to get started.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {templates.map((t) => (
            <div key={t.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Jurisdiction: {t.jurisdiction}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openGenerate(t.id)} style={btnPrimary}>Use Template</button>
                <button onClick={() => handleDelete(t.id)} style={{ ...btnSecondary, color: '#b91c1c', borderColor: '#fca5a5' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: 14,
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
}
