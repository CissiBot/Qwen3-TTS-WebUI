import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { AUTH_DISABLED, LOCAL_AUTH_TOKEN, LOCAL_AUTH_USER, authApi } from '@/lib/api'
import type { User, LoginRequest, AuthState } from '@/types/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('auth')
  const [token, setToken] = useState<string | null>(() => AUTH_DISABLED ? LOCAL_AUTH_TOKEN : null)
  const [user, setUser] = useState<User | null>(() => AUTH_DISABLED ? LOCAL_AUTH_USER : null)
  const [isLoading, setIsLoading] = useState(!AUTH_DISABLED)
  const navigate = useNavigate()

  useEffect(() => {
    if (AUTH_DISABLED) {
      localStorage.setItem('token', LOCAL_AUTH_TOKEN)
      setToken(LOCAL_AUTH_TOKEN)
      setUser(LOCAL_AUTH_USER)
      setIsLoading(false)
      return
    }

    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token')
        if (storedToken) {
          setToken(storedToken)
        }

        const currentUser = await authApi.getCurrentUser()
        if (!storedToken) {
          localStorage.setItem('token', LOCAL_AUTH_TOKEN)
          setToken(LOCAL_AUTH_TOKEN)
        }
        setUser(currentUser)
      } catch (error) {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (credentials: LoginRequest) => {
    if (AUTH_DISABLED) {
      localStorage.setItem('token', LOCAL_AUTH_TOKEN)
      setToken(LOCAL_AUTH_TOKEN)
      setUser(LOCAL_AUTH_USER)
      navigate('/')
      return
    }

    try {
      const response = await authApi.login(credentials)
      const newToken = response.access_token

      localStorage.setItem('token', newToken)
      setToken(newToken)

      const currentUser = await authApi.getCurrentUser()
      setUser(currentUser)

      toast.success(t('loginSuccess'))
      navigate('/')
    } catch (error: any) {
      const message = error.response?.data?.detail || error.message || t('loginFailedCheckCredentials')
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    if (AUTH_DISABLED || token === LOCAL_AUTH_TOKEN) {
      toast.info('本地免登录模式已启用，无需退出登录')
      navigate('/')
      return
    }

    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    toast.success(t('logoutSuccess'))
    navigate('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        isAuthenticated: AUTH_DISABLED || (!!token && !!user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
