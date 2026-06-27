/**
 * useGame — 游戏状态管理 Hook
 *
 * 通过 Supabase Realtime 订阅 game_players、race_participants 等表的变化。
 * 客户端运行游戏引擎，通过 Supabase 同步状态。
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Game, Player, RaceState, GameEvent } from '../lib/types'

interface GameState {
  game: Game | null
  players: Player[]
  currentRace: RaceState | null
  events: GameEvent[]
  loading: boolean
  error: string | null
}

export function useGame(gameId: string | undefined, userId: string | undefined) {
  const [state, setState] = useState<GameState>({
    game: null,
    players: [],
    currentRace: null,
    events: [],
    loading: true,
    error: null,
  })

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // 加载游戏数据
  const loadGame = useCallback(async () => {
    if (!gameId) return

    setState(s => ({ ...s, loading: true, error: null }))

    try {
      // 加载游戏基本信息
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

      if (gameErr) throw gameErr

      // 加载玩家列表
      const { data: players, error: playersErr } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('seat_order')

      if (playersErr) throw playersErr

      setState(s => ({
        ...s,
        game: game as Game,
        players: (players ?? []) as Player[],
        loading: false,
      }))
    } catch (e) {
      setState(s => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : '加载失败',
      }))
    }
  }, [gameId])

  // 订阅 Realtime 变化
  useEffect(() => {
    if (!gameId) return

    loadGame()

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        () => { loadGame() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        () => { loadGame() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'race_participants', filter: `race_id=eq.${gameId}` },
        () => { /* TODO: 增量更新参赛者位置 */ }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_events', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setState(s => ({
            ...s,
            events: [payload.new as GameEvent, ...s.events].slice(0, 100),
          }))
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, loadGame])

  // 更新游戏状态
  const updateGameStatus = useCallback(async (status: string) => {
    if (!gameId) return
    await supabase.from('games').update({ status }).eq('id', gameId)
  }, [gameId])

  // 添加事件
  const addEvent = useCallback(async (event: Omit<GameEvent, 'id'>) => {
    if (!gameId) return
    await supabase.from('game_events').insert({
      ...event,
      game_id: gameId,
    })
  }, [gameId])

  // 玩家准备
  const setReady = useCallback(async () => {
    if (!gameId || !userId) return
    await supabase
      .from('game_players')
      .update({ is_ready: true })
      .eq('game_id', gameId)
      .eq('user_id', userId)
  }, [gameId, userId])

  return {
    ...state,
    userId,
    loadGame,
    updateGameStatus,
    addEvent,
    setReady,
  }
}
