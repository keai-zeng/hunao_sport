/**
 * 积分系统 — 金银铜分计算
 */

import type { ScoreBreakdown, RaceState, Player } from './types'
import { GOLD_VALUES, SILVER_VALUES } from './types'

// ============================================================
// 比赛计分
// ============================================================

/** 根据比赛编号获取金牌分值 */
export function getGoldPoints(raceNumber: number): number {
  return GOLD_VALUES[raceNumber - 1] ?? 0
}

/** 根据比赛编号获取银牌分值 */
export function getSilverPoints(raceNumber: number): number {
  return SILVER_VALUES[raceNumber - 1] ?? 0
}

/** 计算单场比赛的玩家得分 */
export function calculateRaceScores(
  race: RaceState,
  bronzeScores: Map<string, number>  // playerId → 铜分
): Map<string, number> {
  const scores = new Map<string, number>()

  // 金牌
  if (race.firstPlacePlayerId) {
    scores.set(race.firstPlacePlayerId, getGoldPoints(race.raceNumber))
  }

  // 银牌
  if (race.secondPlacePlayerId) {
    scores.set(race.secondPlacePlayerId, getSilverPoints(race.raceNumber))
  }

  // 铜牌（星星、可爱输家等）
  for (const [playerId, bronze] of bronzeScores) {
    scores.set(playerId, (scores.get(playerId) ?? 0) + bronze)
  }

  return scores
}

// ============================================================
// 总分统计
// ============================================================

/** 汇总多名玩家的总分 */
export function calculateTotalScores(
  raceResults: Array<{
    raceNumber: number
    race: RaceState
    bronzeScores: Map<string, number>
  }>,
  players: Player[]
): Map<string, ScoreBreakdown> {
  const totals = new Map<string, ScoreBreakdown>()

  for (const player of players) {
    totals.set(player.id, { gold: 0, silver: 0, bronze: 0, total: 0 })
  }

  for (const { raceNumber, race, bronzeScores } of raceResults) {
    // 金牌
    if (race.firstPlacePlayerId) {
      const b = totals.get(race.firstPlacePlayerId)
      if (b) b.gold += getGoldPoints(raceNumber)
    }

    // 银牌
    if (race.secondPlacePlayerId) {
      const b = totals.get(race.secondPlacePlayerId)
      if (b) b.silver += getSilverPoints(raceNumber)
    }

    // 铜牌
    for (const [playerId, bronze] of bronzeScores) {
      const b = totals.get(playerId)
      if (b) b.bronze += bronze
    }
  }

  // 计算总分
  for (const [, b] of totals) {
    b.total = b.gold + b.silver + b.bronze
  }

  return totals
}

// ============================================================
// 排名
// ============================================================

/** 按总分从高到低排序 */
export function rankPlayers(
  scores: Map<string, ScoreBreakdown>
): Array<{ playerId: string; score: ScoreBreakdown; rank: number }> {
  const entries = [...scores.entries()]
    .map(([playerId, score]) => ({ playerId, score }))
    .sort((a, b) => b.score.total - a.score.total)

  // 处理平局（共享排名）
  let currentRank = 1
  return entries.map((entry, i) => {
    if (i > 0 && entry.score.total < entries[i - 1].score.total) {
      currentRank = i + 1
    }
    return { ...entry, rank: currentRank }
  })
}

/** 判断是否平局（最高分有多人） */
export function isTie(scores: Map<string, ScoreBreakdown>): boolean {
  const sorted = [...scores.values()].sort((a, b) => b.total - a.total)
  return sorted.length >= 2 && sorted[0].total === sorted[1].total
}
