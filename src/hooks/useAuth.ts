/**
 * useAuth — 匿名登录 Hook
 *
 * 使用 localStorage 持久化用户身份，搭配 Supabase anon key。
 */

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'hunao_user'

interface User {
  id: string
  nickname: string
}

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function saveUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(loadUser)
  const [loading, setLoading] = useState(false)

  /** 使用昵称登录（首次自动生成 UUID） */
  const login = useCallback((nickname: string): User => {
    const id = crypto.randomUUID()
    const newUser = { id, nickname: nickname.trim() }
    saveUser(newUser)
    setUser(newUser)
    return newUser
  }, [])

  /** 更新昵称 */
  const updateNickname = useCallback((nickname: string) => {
    if (!user) return
    const updated = { ...user, nickname: nickname.trim() }
    saveUser(updated)
    setUser(updated)
  }, [user])

  /** 登出 */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  // 自动加载
  useEffect(() => {
    setLoading(true)
    const saved = loadUser()
    if (saved) setUser(saved)
    setLoading(false)
  }, [])

  return { user, loading, login, updateNickname, logout, isLoggedIn: !!user }
}
