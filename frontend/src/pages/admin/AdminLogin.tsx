import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import Wordmark from '../../components/Wordmark'

export default function AdminLogin() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/admin/overview" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin/overview')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-noir flex items-center justify-center px-6">
      <div className="bg-cream w-full max-w-sm p-8">
        <div className="text-center mb-1"><Wordmark className="text-3xl" /></div>
        <div className="eyebrow text-stone text-center mb-8">Owner dashboard</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-xs text-stone mb-1.5">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" autoComplete="username" />
          </label>
          <label className="block">
            <span className="block text-xs text-stone mb-1.5">Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field" autoComplete="current-password" />
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-noir text-cream text-[11px] uppercase tracking-[0.16em] px-6 py-3.5 hover:bg-rose-dark transition-colors disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
