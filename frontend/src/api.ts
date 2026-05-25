const BASE = '/api'

function getKey(): string {
  return localStorage.getItem('api_key') ?? ''
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': getKey(),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(detail || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Documents
export interface Document {
  id: number
  title: string
  content: string
  jurisdiction: string
  created_at: string
  updated_at: string
}

export const listDocuments = () => req<Document[]>('GET', '/documents/')
export const getDocument = (id: number) => req<Document>('GET', `/documents/${id}`)
export const createDocument = (d: { title: string; content: string; jurisdiction: string }) =>
  req<Document>('POST', '/documents/', d)
export const updateDocument = (id: number, d: Partial<Document>) =>
  req<Document>('PUT', `/documents/${id}`, d)
export const deleteDocument = (id: number) => req<void>('DELETE', `/documents/${id}`)

// Analysis
export interface ContractAnalysis {
  analysis_id: number
  clauses: { title: string; type: string; text: string; risk_level: string }[]
  risks: { description: string; severity: string; clause_title: string }[]
  risk_score: number
  summary: string
  recommendations: string[]
}

export interface ComplianceAnalysis {
  analysis_id: number
  regulations: Record<string, { pass: boolean; issues: string[]; recommendations: string[] }>
  overall_pass: boolean
  summary: string
}

export const analyseContract = (docId: number) =>
  req<ContractAnalysis>('POST', `/analysis/contract/${docId}`)
export const checkCompliance = (docId: number, regulations?: string[]) =>
  req<ComplianceAnalysis>('POST', `/analysis/compliance/${docId}`, { regulations: regulations ?? ['GDPR', 'HIPAA', 'CCPA'] })
export const getAnalysisHistory = (docId: number) =>
  req<{ id: number; analysis_type: string; created_at: string; result: unknown }[]>('GET', `/analysis/history/${docId}`)

// Templates
export interface Template {
  id: number
  name: string
  jurisdiction: string
  content: string
  created_at: string
}

export const listTemplates = () => req<Template[]>('GET', '/templates/')
export const getTemplate = (id: number) => req<Template>('GET', `/templates/${id}`)
export const getTemplateVariables = (id: number) =>
  req<{ variables: string[] }>('GET', `/templates/${id}/variables`)
export const createTemplate = (t: { name: string; jurisdiction: string; content: string }) =>
  req<Template>('POST', '/templates/', t)
export const generateDocument = (
  tmplId: number,
  body: { title: string; variables: Record<string, string>; enhance_with_ai: boolean },
) => req<Document>('POST', `/templates/${tmplId}/generate`, body)
export const deleteTemplate = (id: number) => req<void>('DELETE', `/templates/${id}`)
