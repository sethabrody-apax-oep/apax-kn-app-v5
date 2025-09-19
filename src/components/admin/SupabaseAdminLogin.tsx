import React, { useState } from 'react'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface SupabaseAdminLoginProps {
  onLogin: (user: any) => void
}

export default function SupabaseAdminLogin({ onLogin }: SupabaseAdminLoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        
        // Provide user-friendly error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before signing in.')
        } else if (authError.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment before trying again.')
        } else {
          setError(`Authentication failed: ${authError.message}`)
        }
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Authentication failed: No user data received')
        setLoading(false)
        return
      }

      console.log('Supabase auth successful:', authData.user.email)

      // Check if user has admin privileges in user_profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .single()

      if (profileError) {
        console.error('Profile lookup error:', profileError)
        
        // Sign out the user since they don't have admin access
        await supabase.auth.signOut()
        
        if (profileError.code === 'PGRST116') {
          setError('Access denied: No admin profile found for this account.')
        } else {
          setError('Access denied: Unable to verify admin privileges.')
        }
        setLoading(false)
        return
      }

      // Verify user has admin or super_admin role
      if (!profileData || !['admin', 'super_admin'].includes(profileData.role)) {
        console.error('Insufficient privileges:', profileData?.role)
        
        // Sign out the user since they don't have sufficient privileges
        await supabase.auth.signOut()
        
        setError('Access denied: Insufficient privileges. Admin or Super Admin role required.')
        setLoading(false)
        return
      }

      console.log('Admin access granted:', profileData.role)

      // Create admin user object for the application
      const adminUser = {
        id: authData.user.id,
        email: authData.user.email,
        role: profileData.role,
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        isActive: profileData.is_active,
        supabaseUser: authData.user,
        profile: profileData
      }

      // Call the onLogin callback with the authenticated admin user
      onLogin(adminUser)

    } catch (error) {
      console.error('Unexpected authentication error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setError('')
    setLoading(true)

    try {
      // Test basic Supabase connection
      const { data, error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1)

      if (error) {
        setError(`Database connection failed: ${error.message}`)
      } else {
        setError('')
        alert('✅ Supabase connection successful! Database is accessible.')
      }
    } catch (error) {
      setError('Failed to connect to Supabase. Please check your configuration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-navy mb-2">
            KnowledgeNow Event Administration
          </h1>
          <p className="text-brand-gray">
            Authenticate with your Supabase credentials
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-brand-navy mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your admin email"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-brand-navy mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-transparent"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-gray hover:text-brand-navy"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Authentication Error</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Authenticate with Supabase
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 text-brand-navy rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Database Connection
            </button>
          </div>
        </form>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Authentication Requirements:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Valid Supabase user account with confirmed email</li>
            <li>• Admin or Super Admin role in the user_profiles table</li>
            <li>• Active account status (is_active = true)</li>
            <li>• Proper Supabase project configuration</li>
          </ul>
        </div>

        <div className="text-center text-sm text-brand-gray">
          <p>Secure authentication powered by Supabase</p>
          <p className="text-xs mt-1">All credentials are encrypted and transmitted securely</p>
        </div>
      </div>
    </div>
  )
}