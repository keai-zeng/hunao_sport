/**
 * StoreContext — 提供 LocalGameStore 单例给所有页面
 */

import { createContext, useContext, useRef, type ReactNode } from 'react'
import { LocalGameStore } from '../lib/localGameStore'

const StoreCtx = createContext<LocalGameStore | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useRef(new LocalGameStore()).current
  return <StoreCtx.Provider value={store}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
