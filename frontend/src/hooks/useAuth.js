import { useState, useCallback } from 'react'
import { login as loginApi } from '../api/auth'

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback(async (email, password) => {
    const data = await loginApi({ email, password })
    const { token: newToken, user: newUser } = data
    localStorage.setItem('token', newToken)
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser))
      setUser(newUser)
    }
    setToken(newToken)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }, [])

  return {
    login,
    logout,
    isAuthenticated: !!token,
    user,
    token,
  }
}
