/**
 * SupabaseGameStore — 在线联机模式状态管理
 *
 * 通过 Supabase 同步游戏状态，每个客户端本地运行 GameEngine。
 * 当前回合玩家执行操作后写入数据库，Realtime 推送给其他人。
 */

import { supabase } from './supabase'
import { GameEngine } from './gameEngine'
import { registerAllAbilities } from './abilities'
import { ALL_CHARACTERS } from './localGameStore'
import type { RaceParticipant } from './types'

export class SupabaseGameStore {
  private engine = new GameEngine()
  gameId: string | null = null
  currentUserId: string | null = null

  constructor() {
    registerAllAbilities(this.engine)
  }

  // ============================================================
  // 创建/加入
  // ============================================================

  /** 创建游戏房间 */
  async createGame(nickname: string, _playerCount: number): Promise<{ gameId: string; code: string }> {
    this.currentUserId = crypto.randomUUID()
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: game, error } = await supabase
      .from('games')
      .insert({ code, status: 'waiting' })
      .select('id')
      .single()

    if (error || !game) throw error ?? new Error('创建失败')

    await supabase.from('game_players').insert({
      game_id: game.id,
      user_id: this.currentUserId,
      nickname,
      seat_order: 0,
      is_host: true,
      is_ready: true,
    })

    this.gameId = game.id
    return { gameId: game.id, code }
  }

  /** 加入游戏房间 */
  async joinGame(nickname: string, joinCode: string): Promise<string> {
    this.currentUserId = crypto.randomUUID()

    const { data: game, error } = await supabase
      .from('games')
      .select('id, status')
      .eq('code', joinCode.toUpperCase())
      .single()

    if (error || !game) throw new Error('未找到该房间')

    const { data: existing } = await supabase
      .from('game_players')
      .select('seat_order')
      .eq('game_id', game.id)
      .order('seat_order', { ascending: false })
      .limit(1)

    const seatOrder = (existing?.[0]?.seat_order ?? -1) + 1

    await supabase.from('game_players').insert({
      game_id: game.id,
      user_id: this.currentUserId,
      nickname,
      seat_order: seatOrder,
      is_host: false,
      is_ready: true,
    })

    this.gameId = game.id
    return game.id
  }

  // ============================================================
  // 轮抽
  // ============================================================

  /** 开始轮抽（Host 调用） */
  async startDraft(): Promise<void> {
    if (!this.gameId) return

    // 随机选 2×人数 张角色
    const { data: players } = await supabase
      .from('game_players')
      .select('id')
      .eq('game_id', this.gameId)

    const count = players?.length ?? 2
    const chars = [...ALL_CHARACTERS].sort(() => Math.random() - 0.5).slice(0, count * 4)

    for (let idx = 0; idx < (players?.length ?? 0); idx++) {
      const p = players![idx]
      for (let i = 0; i < 4; i++) {
        const c = chars[idx * 4 + i] || chars[0]
        await supabase.from('player_racers').insert({
          game_id: this.gameId,
          player_id: p.id,
          character_id: c.id,
          used_in_race: 0,
        })
      }
    }

    await supabase.from('games').update({ status: 'drafting' }).eq('id', this.gameId)
  }

  /** 获取玩家的轮抽角色 */
  async getMyRacers(playerId: string) {
    if (!this.gameId) return []
    const { data } = await supabase
      .from('player_racers')
      .select('character_id')
      .eq('game_id', this.gameId)
      .eq('player_id', playerId)
    return (data ?? []).map(r => ALL_CHARACTERS.find(c => c.id === r.character_id)!).filter(Boolean)
  }

  // ============================================================
  // 比赛
  // ============================================================

  /** 赛前选人 */
  async selectRacer(playerId: string, characterId: number, raceNumber: number): Promise<void> {
    if (!this.gameId) return

    await supabase.from('player_racers').update({ used_in_race: raceNumber })
      .eq('game_id', this.gameId)
      .eq('player_id', playerId)
      .eq('character_id', characterId)

    // 写入参赛者
    const { data: race } = await supabase
      .from('race_states')
      .select('id')
      .eq('game_id', this.gameId)
      .eq('race_number', raceNumber)
      .single()

    const raceId = race?.id ?? crypto.randomUUID()
    if (!race) {
      await supabase.from('race_states').insert({
        id: raceId, game_id: this.gameId, race_number: raceNumber, status: 'racing',
      })
    }

    await supabase.from('race_participants').upsert({
      race_id: raceId,
      player_id: playerId,
      character_id: characterId,
      position: 0,
      is_tripped: false,
      is_eliminated: false,
    }, { onConflict: 'race_id,player_id' })
  }

  /** 获取当前比赛参赛者 */
  async getParticipants(raceNumber: number): Promise<RaceParticipant[]> {
    if (!this.gameId) return []

    const { data: race } = await supabase
      .from('race_states')
      .select('id')
      .eq('game_id', this.gameId)
      .eq('race_number', raceNumber)
      .single()

    if (!race) return []

    const { data } = await supabase
      .from('race_participants')
      .select('*, game_players!inner(nickname)')
      .eq('race_id', race.id)

    return (data ?? []).map(p => ({
      id: p.id,
      playerId: p.player_id,
      characterId: p.character_id,
      character: ALL_CHARACTERS.find(c => c.id === p.character_id)!,
      position: p.position,
      isTripped: p.is_tripped,
      isEliminated: p.is_eliminated,
      finishOrder: p.finish_order,
    }))
  }

  /** 更新参赛者位置（回合结束后写入） */
  async updateParticipant(participant: RaceParticipant, raceNumber: number): Promise<void> {
    if (!this.gameId) return

    const { data: race } = await supabase
      .from('race_states')
      .select('id')
      .eq('game_id', this.gameId)
      .eq('race_number', raceNumber)
      .single()

    if (!race) return

    await supabase.from('race_participants').update({
      position: participant.position,
      is_tripped: participant.isTripped,
      is_eliminated: participant.isEliminated,
      finish_order: participant.finishOrder,
    }).eq('race_id', race.id).eq('player_id', participant.playerId)
  }

  /** 记录事件 */
  async logEvent(event: Record<string, unknown>): Promise<void> {
    if (!this.gameId) return
    await supabase.from('game_events').insert({
      game_id: this.gameId,
      ...event,
    })
  }

  /** 更新当前回合玩家 */
  async setCurrentPlayer(playerId: string): Promise<void> {
    if (!this.gameId) return
    await supabase.from('games').update({ current_player_id: playerId }).eq('id', this.gameId)
  }

  /** 设置比赛结果 */
  async setRaceResult(raceNumber: number, firstId: string | null, secondId: string | null): Promise<void> {
    if (!this.gameId) return
    await supabase.from('race_states').update({
      status: 'finished',
      first_place_player_id: firstId,
      second_place_player_id: secondId,
    }).eq('game_id', this.gameId).eq('race_number', raceNumber)
  }

  /** 获取游戏玩家列表 */
  async getPlayers() {
    if (!this.gameId) return []
    const { data } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', this.gameId)
      .order('seat_order')
    return data ?? []
  }

  /** 获取比赛结果汇总 */
  async getRaceResults() {
    if (!this.gameId) return []
    const { data } = await supabase
      .from('race_states')
      .select('*')
      .eq('game_id', this.gameId)
      .order('race_number')
    return data ?? []
  }

  /** 获取游戏引擎实例 */
  getEngine(): GameEngine {
    return this.engine
  }
}

/** 全局单例 */
export const onlineStore = new SupabaseGameStore()
