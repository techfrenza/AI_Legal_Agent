import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getDocument,
  analyseContract,
  checkCompliance,
  getAnalysisHistory,
  type ContractAnalysis,
  type ComplianceAnalysis,
} from '../api'

type Tab = 'contract' | 'compliance' | 'history'

export default function AnalysisPage() {
  const { docId } = useParams<{ docId: string }>()
  const id = Number(docId)
  const navigate = useNavigate()

  const [docTitle, setDocTitle] = useState('')
  const [tab, setTab] = useState<Tab>('contract')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contractResult, setContractResult] = useState<ContractAnalysis | null>(null)
  const [complianceResult, setComplianceResult] = useState<ComplianceAnalysis | null>(null)
  const [history, setHistory] = useState<{ id: number; analysis_type: string; created_at: string; result: unknown }[]>([])
  const [regulations, setRegulations] = useState(['GDPR', 'HIPAA', 'CCPA'])

  useEffect(() => {
    getDocument(id).then((d) => setDocTitle(d.title)).catch(() => setError('Document not found'))
  }, [id])

  async function runContract() {
    setLoading(true); setError(null)
    try { setContractResult(await analyseContract(id)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed') }
    finally { setLoading(false) }
  }

  async function runCompliance() {
    setLoading(true); setError(null)
    try { setComplianceResult(await checkCompliance(id, regulations)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Compliance check failed') }
    finally { setLoading(false) }
  }

  async function loadHistory() {
    setLoading(true)
    try { setHistory(await getAnalysisHistory(id)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setLoading(false) }
  }

  const riskColor = (level: string) =>
    ({ high: '#dc2626', medium: '#d97706', low: '#16a34a' }[level] ?? '#6b7280')

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12, background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>
        ← Back
      </button>
      <h2>Analysis — {docTitle}</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['contract', 'compliance', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'history') loadHistory() }}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: tab === t ? '3px solid #2563eb' : '3px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 400,
              textTransform: 'capitalize',
            }}
          >
            {t === 'contract' ? 'Contract Review' : t === 'compliance' ? 'Compliance Check' : 'History'}
          </button>
        ))}
      </div>

      {tab === 'contract' && (
        <div>
          <button
            onClick={runContract}
            disabled={loading}
            style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 20 }}
          >
            {loading ? 'Analysing…' : 'Run Contract Analysis'}
          </button>

          {contractResult && (
            <div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Risk Score</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: contractResult.risk_score >= 7 ? '#dc2626' : contractResult.risk_score >= 4 ? '#d97706' : '#16a34a' }}>
                    {contractResult.risk_score}/10
                  </div>
                </div>
                <div style={{ flex: 3, padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Summary</div>
                  <div>{contractResult.summary}</div>
                </div>
              </div>

              <h3>Clauses ({contractResult.clauses.length})</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Title</th>
                    <th style={{ padding: '8px 12px' }}>Type</th>
                    <th style={{ padding: '8px 12px' }}>Risk</th>
                    <th style={{ padding: '8px 12px' }}>Text</th>
                  </tr>
                </thead>
                <tbody>
                  {contractResult.clauses.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{c.title}</td>
                      <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 13 }}>{c.type}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: riskColor(c.risk_level) + '20', color: riskColor(c.risk_level), fontSize: 12, fontWeight: 600 }}>
                          {c.risk_level}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 13, color: '#374151', maxWidth: 300 }}>{c.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {contractResult.risks.length > 0 && (
                <>
                  <h3>Risks</h3>
                  <ul>
                    {contractResult.risks.map((r, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        <span style={{ color: riskColor(r.severity), fontWeight: 600 }}>[{r.severity}]</span>{' '}
                        {r.description} <span style={{ color: '#9ca3af', fontSize: 12 }}>({r.clause_title})</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {contractResult.recommendations.length > 0 && (
                <>
                  <h3>Recommendations</h3>
                  <ul>
                    {contractResult.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'compliance' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {['GDPR', 'HIPAA', 'CCPA', 'SOX', 'PCI-DSS'].map((reg) => (
              <label key={reg} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={regulations.includes(reg)}
                  onChange={(e) =>
                    setRegulations((prev) => e.target.checked ? [...prev, reg] : prev.filter((r) => r !== reg))
                  }
                />
                {reg}
              </label>
            ))}
          </div>
          <button
            onClick={runCompliance}
            disabled={loading || regulations.length === 0}
            style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 20 }}
          >
            {loading ? 'Checking…' : 'Run Compliance Check'}
          </button>

          {complianceResult && (
            <div>
              <div style={{ padding: 16, marginBottom: 16, borderRadius: 6, background: complianceResult.overall_pass ? '#f0fdf4' : '#fef2f2', border: `1px solid ${complianceResult.overall_pass ? '#86efac' : '#fca5a5'}` }}>
                <strong>{complianceResult.overall_pass ? '✅ Overall: PASS' : '❌ Overall: FAIL'}</strong>
                <p style={{ margin: '4px 0 0', color: '#374151' }}>{complianceResult.summary}</p>
              </div>

              {Object.entries(complianceResult.regulations).map(([name, result]) => (
                <div key={name} style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ padding: '10px 16px', background: result.pass ? '#f0fdf4' : '#fef2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{name}</strong>
                    <span style={{ fontWeight: 700, color: result.pass ? '#16a34a' : '#dc2626' }}>
                      {result.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  {result.issues.length > 0 && (
                    <div style={{ padding: '8px 16px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Issues:</div>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {result.issues.map((issue, i) => <li key={i} style={{ fontSize: 13 }}>{issue}</li>)}
                      </ul>
                    </div>
                  )}
                  {result.recommendations.length > 0 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Recommendations:</div>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {result.recommendations.map((r, i) => <li key={i} style={{ fontSize: 13 }}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div>
          {loading ? <p>Loading…</p> : history.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No analysis history yet.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} style={{ marginBottom: 12, padding: 12, border: '1px solid #e5e7eb', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ textTransform: 'capitalize' }}>{h.analysis_type.replace('_', ' ')}</strong>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(h.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
