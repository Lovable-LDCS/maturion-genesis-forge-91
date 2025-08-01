import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { Tables } from '@/integrations/supabase/types'
import { logSecurityEvent } from '@/lib/security'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: any | null
  loading: boolean
  isSessionValid: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: any) => Promise<{ error: any }>
  validateSession: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSessionValid, setIsSessionValid] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const validateSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        setIsSessionValid(false)
        logSecurityEvent('SESSION_VALIDATION_FAILED', { 
          error: error?.message,
          timestamp: new Date().toISOString()
        })
        return false
      }

      // Validate token expiry
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at < now) {
        setIsSessionValid(false)
        logSecurityEvent('SESSION_EXPIRED', { 
          expiresAt: session.expires_at,
          currentTime: now
        })
        return false
      }

      setIsSessionValid(true)
      return true
    } catch (error) {
      setIsSessionValid(false)
      logSecurityEvent('SESSION_VALIDATION_ERROR', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  const loadProfile = async (userId: string) => {
    try {
      // Validate session before loading profile
      const sessionIsValid = await validateSession()
      if (!sessionIsValid) {
        setProfile(null)
        setLoading(false)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile:', error)
        logSecurityEvent('PROFILE_LOAD_ERROR', { 
          userId, 
          error: error.message 
        })
      } else {
        setProfile(profile)
        // Log successful profile validation
        logSecurityEvent('PROFILE_VALIDATED', { 
          userId,
          profileExists: !!profile
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      logSecurityEvent('PROFILE_LOAD_EXCEPTION', { 
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // Log sign-in attempt
      logSecurityEvent('SIGN_IN_ATTEMPT', { 
        email: email.substring(0, 3) + '***', // Partially redacted for privacy
        timestamp: new Date().toISOString()
      })

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        logSecurityEvent('SIGN_IN_FAILED', { 
          email: email.substring(0, 3) + '***',
          error: error.message
        })
      } else if (data.user) {
        logSecurityEvent('SIGN_IN_SUCCESS', { 
          userId: data.user.id,
          email: email.substring(0, 3) + '***'
        })
        setIsSessionValid(true)
      }

      return { error }
    } catch (error) {
      logSecurityEvent('SIGN_IN_EXCEPTION', { 
        email: email.substring(0, 3) + '***',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return { error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    })

    // Profile will be created automatically by the database trigger

    return { error }
  }

  const signOut = async () => {
    const userId = user?.id
    await supabase.auth.signOut()
    setIsSessionValid(false)
    
    if (userId) {
      logSecurityEvent('SIGN_OUT', { 
        userId,
        timestamp: new Date().toISOString()
      })
    }
  }

  const updateProfile = async (updates: any) => {
    if (!user) return { error: 'No user logged in' }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)

      if (!error) {
        // Reload profile after update
        await loadProfile(user.id)
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    session,
    profile,
    loading,
    isSessionValid,
    signIn,
    signUp,
    signOut,
    updateProfile,
    validateSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}