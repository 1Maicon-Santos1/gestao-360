import { createContext, useContext, useEffect, useState } from 'react'

const APP_AUTH_KEY = 'fh_auth'
const CORRECT_PASSWORD = '3641'

interface AuthContextType {
  isAuthenticated: boolean
  loading: boolean
  login: (password: string) => boolean
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  login: () => false,
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem(APP_AUTH_KEY) === 'true')
    setLoading(false)
  }, [])

  const login = (password: string): boolean => {
    if (password !== CORRECT_PASSWORD) return false
    localStorage.setItem(APP_AUTH_KEY, 'true')
    setIsAuthenticated(true)
    return true
  }

  const signOut = () => {
    localStorage.removeItem(APP_AUTH_KEY)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
