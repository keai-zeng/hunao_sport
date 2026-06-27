/**
 * 赛道格子配置（客户端使用，与 supabase/migrations/003_seed_tracks.sql 同步）
 */

export interface TrackSpace {
  spaceIndex: number
  hasArrow: boolean
  arrowDirection: 'forward' | 'backward' | null
  arrowDistance: number | null
  hasStar: boolean
  hasTrip: boolean
  isFinish: boolean
}

/** Mild 赛道：纯 30 格，无任何特殊效果 */
export const MILD_TRACK: TrackSpace[] = Array.from({ length: 31 }, (_, i) => ({
  spaceIndex: i,
  hasArrow: false,
  arrowDirection: null,
  arrowDistance: null,
  hasStar: false,
  hasTrip: false,
  isFinish: i === 30,
}))

/** Wild 赛道：带箭头、星星、绊倒 */
export const WILD_TRACK: TrackSpace[] = [
  { spaceIndex: 0,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },  // 起点
  { spaceIndex: 1,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: true,  hasTrip: false, isFinish: false },  // ⭐
  { spaceIndex: 2,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 3,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 4,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 5,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: true,  isFinish: false },  // 🪨
  { spaceIndex: 6,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 7,  hasArrow: true,  arrowDirection: 'forward',  arrowDistance: 3,    hasStar: false, hasTrip: false, isFinish: false },  // ➡️3
  { spaceIndex: 8,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 9,  hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 10, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 11, hasArrow: true,  arrowDirection: 'forward',  arrowDistance: 1,    hasStar: false, hasTrip: false, isFinish: false },  // ➡️1
  { spaceIndex: 12, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 13, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: true,  hasTrip: false, isFinish: false },  // ⭐
  { spaceIndex: 14, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 15, hasArrow: true,  arrowDirection: 'backward', arrowDistance: 4,    hasStar: false, hasTrip: false, isFinish: false },  // ⬅️4
  { spaceIndex: 16, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: true,  isFinish: false },  // 🪨
  { spaceIndex: 17, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 18, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 19, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 20, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 21, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 22, hasArrow: true,  arrowDirection: 'forward',  arrowDistance: 2,    hasStar: false, hasTrip: false, isFinish: false },  // ➡️2
  { spaceIndex: 23, hasArrow: true,  arrowDirection: 'backward', arrowDistance: 2,    hasStar: false, hasTrip: false, isFinish: false },  // ⬅️2
  { spaceIndex: 24, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 25, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: true,  isFinish: false },  // 🪨
  { spaceIndex: 26, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 27, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 28, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 29, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: false },
  { spaceIndex: 30, hasArrow: false, arrowDirection: null,      arrowDistance: null, hasStar: false, hasTrip: false, isFinish: true  },  // 🏁
]

/** 根据赛道面获取配置 */
export function getTrackSpaces(side: 'mild' | 'wild'): TrackSpace[] {
  return side === 'mild' ? MILD_TRACK : WILD_TRACK
}

/** 获取指定格子的赛道效果 */
export function getTrackSpace(side: 'mild' | 'wild', spaceIndex: number): TrackSpace | undefined {
  return getTrackSpaces(side)[spaceIndex]
}
