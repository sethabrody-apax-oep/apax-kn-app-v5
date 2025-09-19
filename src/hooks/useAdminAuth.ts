import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'super_admin'
  firstName?: string
  lastName?: string
  isActive: boolean
  supabaseUser?: any
  profile?: any
}

interface UseAdminAuthReturn {
  isAuthenticated: boolean
  currentUser: AdminUser | null
  loading: boolean
  signOut: () => Promise<void>
  setAdminUser: (user: AdminUser | null) => void
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    checkAuthSession()
  }, [])

  const checkAuthSession = async () => {
    try {
      setLoading(true)
      
      // Check if user is already authenticated with Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Error checking auth session:', error)
        setIsAuthenticated(false)
        setCurrentUser(null)
        setLoading(false)
        return
      }

      if (session?.user) {
        console.log('Found existing session for user:', session.user.email)
        
        // Verify admin privileges
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single()

        if (profileError || !profileData || !['admin', 'super_admin'].includes(profileData.role)) {
          console.log('User does not have admin privileges, signing out')
          await supabase.auth.signOut()
          setIsAuthenticated(false)
          setCurrentUser(null)
        } else {
          console.log('User has admin privileges:', profileData.role)
          const adminUser: AdminUser = {
            id: session.user.id,
            email: session.user.email || '',
            role: profileData.role,
            firstName: profileData.first_name || '',
            lastName: profileData.last_name || '',
            isActive: profileData.is_active,
            supabaseUser: session.user,
            profile: profileData
          }
          
          setCurrentUser(adminUser)
          setIsAuthenticated(true)
        }
      } else {
        console.log('No existing session found')
        setIsAuthenticated(false)
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('Error checking auth session:', error)
      setIsAuthenticated(false)
      setCurrentUser(null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      console.log('Signing out admin user')
      await supabase.auth.signOut()
      setIsAuthenticated(false)
      setCurrentUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      // Force local logout even if Supabase signout fails
      setIsAuthenticated(false)
      setCurrentUser(null)
    }
  }

  const setAdminUser = (user: AdminUser | null) => {
    setCurrentUser(user)
    setIsAuthenticated(!!user)
  }

  return {
    isAuthenticated,
    currentUser,
    loading,
    signOut,
    setAdminUser
  }
}