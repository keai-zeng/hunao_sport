import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [playerCount, setPlayerCount] = useState(4)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createGame() {
    if (!nickname.trim()) { setError('请输入昵称'); return }
    setLoading(true)
    setError('')

    try {
      // 生成加入码
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data: game, error: gameErr } = await supabase
        .from('games')
        .insert({ code, status: 'waiting' })
        .select('id')
        .single()

      if (gameErr || !game) throw gameErr ?? new Error('创建失败')

      const { error: playerErr } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          user_id: crypto.randomUUID(),
          nickname: nickname.trim(),
          seat_order: 0,
          is_host: true,
          is_ready: true,
        })

      if (playerErr) throw playerErr

      navigate(`/draft/${game.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  async function joinGame() {
    if (!nickname.trim()) { setError('请输入昵称'); return }
    if (!joinCode.trim()) { setError('请输入加入码'); return }
    setLoading(true)
    setError('')

    try {
      const { data: game, error: gameErr } = await supabase
        .from('games')
        .select('id, status')
        .eq('code', joinCode.trim().toUpperCase())
        .single()

      if (gameErr || !game) throw new Error('未找到该房间')

      const { error: playerErr } = await supabase
        .from('game_players')
        .insert({
          game_id: game.id,
          user_id: crypto.randomUUID(),
          nickname: nickname.trim(),
          seat_order: 0,
          is_host: false,
          is_ready: true,
        })

      if (playerErr) throw playerErr

      if (game.status === 'drafting') {
        navigate(`/draft/${game.id}`)
      } else {
        navigate(`/game/${game.id}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* 标题 */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-3">🎮 胡闹运动会</h1>
        <p className="text-gray-400 text-lg">Magical Athlete Online</p>
      </div>

      {/* 创建/加入卡片 */}
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-6">
        {/* 昵称 */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">你的昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="输入昵称..."
            maxLength={12}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500"
          />
        </div>

        {/* 创建游戏 */}
        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm text-gray-400">玩家人数</span>
            <div className="flex gap-1">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    playerCount === n
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={createGame}
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
          >
            {loading ? '创建中...' : '🎲 创建新游戏'}
          </button>
        </div>

        {/* 加入游戏 */}
        <div className="border-t border-gray-700 pt-4">
          <label className="block text-sm text-gray-400 mb-1">加入码</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="flex-1 px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500 uppercase"
            />
            <button
              onClick={joinGame}
              disabled={loading}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
            >
              {loading ? '...' : '加入'}
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}
      </div>

      <p className="mt-8 text-gray-600 text-sm">
        2-6 人欢乐竞速 · 36 个独特角色 · 千奇百怪的技能
      </p>
    </div>
  )
}
