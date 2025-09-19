import React, { useState } from 'react'
import { Shield, Database } from 'lucide-react'
import SupabaseAdminLogin from './SupabaseAdminLogin'

interface AdminLoginProps {
  onLogin: (user?: any) => void
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [authMode, setAuthMode] = useState<'supabase' | 'legacy'>('supabase')

  const handleSupabaseLogin = (user: any) => {
    console.log('Supabase authentication successful:', user)
    onLogin(user)
  }

  const handleLegacyLogin = () => {
    console.log('Legacy authentication used')
    onLogin()
  }

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLegacySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simple hardcoded admin check (kept as fallback)
    if (password === 'D8ogYNjzR3&C') {
      handleLegacyLogin()
    } else {
      setError('Invalid password')
    }
    
    setLoading(false)
  }

  if (authMode === 'supabase') {
    return <SupabaseAdminLogin onLogin={handleSupabaseLogin} />
  }

  // Legacy login component (kept as fallback)
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img 
              src="/Apax logos_RGB_Apax_RGB.png" 
              alt="Apax Partners" 
              className="h-12 w-auto"
            />
          </div>
          <h1 className="text-3xl font-bold text-brand-navy mb-2 text-center">
            KnowledgeNow Event Administration
          </h1>
          <p className="text-brand-gray text-center">
            Legacy admin access (fallback mode)
          </p>
          
          <button
            onClick={() => setAuthMode('supabase')}
            className="inline-flex items-center text-sector-services hover:text-sector-healthcare font-semibold text-sm"
          >
            <Database className="w-4 h-4 mr-1" />
            Switch to Supabase Authentication
          </button>
        </div>

        <form onSubmit={handleLegacySubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-brand-navy mb-2 text-center">
              Legacy Admin Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent text-center"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 py-3 px-4 rounded-lg font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-lg text-center"
          >
            {loading ? 'Signing in...' : 'Access Admin Panel (Legacy)'}
          </button>
        </form>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This is legacy authentication mode. 
            For production use, please switch to Supabase Authentication above.
          </p>
        </div>
      </div>
    </div>
  )
}