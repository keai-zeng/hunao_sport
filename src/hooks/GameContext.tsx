/**
 * GameContext — 全局游戏状态上下文
 *
 * 提供 user、game 状态给所有页面组件。
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface GameContextValue {
  user: ReturnType<typeof useAuth>['user']
  login: (nickname: string) => { id: string; nickname: string }
  logout: () => void
  isLoggedIn: boolean
}

const GameCtx = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const { user, login, logout, isLoggedIn } = useAuth()

  return (
    <GameCtx.Provider value={{ user, login, logout, isLoggedIn }}>
      {children}
    </GameCtx.Provider>
  )
}

export function useGameContext() {
  const ctx = useContext(GameCtx)
  if (!ctx) throw new Error('useGameContext must be used within GameProvider')
  return ctx
}
