import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'

export default function AdminLogin() {
  const { token, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('owner@sultane.pk')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/admin/orders" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin/orders')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Is the API running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-maroon flex items-center justify-center px-6">
      <div className="bg-cream w-full max-w-sm p-8">
        <div className="font-display text-2xl tracking-[0.18em] text-maroon mb-1 text-center">SULTANÉ</div>
        <div className="text-[11px] uppercase tracking-[0.14em] text-stone text-center mb-8">The owner&rsquo;s desk</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-stone mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line bg-cream px-4 py-3 text-sm focus:outline-none focus:border-maroon"
            />
          </div>
          <div>
            <label className="block text-xs text-stone mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line bg-cream px-4 py-3 text-sm focus:outline-none focus:border-maroon"
            />
          </div>
          {error && <p className="text-xs text-maroon">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-maroon text-cream text-xs uppercase tracking-[0.08em] font-medium px-6 py-3.5 hover:bg-maroon-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
