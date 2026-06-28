import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../hooks/StoreContext'
import { supabase } from '../lib/supabase'
import { onlineStore } from '../lib/supabaseGameStore'

type Step = 'menu' | 'local_setup' | 'local_adding' | 'local_ready' | 'online_setup'

export default function HomePage() {
  const navigate = useNavigate()
  const store = useStore()

  const [step, setStep] = useState<Step>('menu')
  const [nickname, setNickname] = useState('')
  const [players, setPlayers] = useState<string[]>([])
  const [playerCount, setPlayerCount] = useState(4)
  const [joinCode, setJoinCode] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [onlinePlayers, setOnlinePlayers] = useState<{ id: string; nickname: string }[]>([])

  // 在线模式：订阅玩家加入
  useEffect(() => {
    if (!onlineStore.gameId || !gameCode) return

    // 先加载已有玩家
    supabase.from('game_players').select('id, nickname')
      .eq('game_id', onlineStore.gameId)
      .order('seat_order')
      .then(({ data }) => {
        if (data) setOnlinePlayers(data.map(p => ({ id: p.id, nickname: p.nickname })))
      })

    // 实时订阅新玩家
    const channel = supabase
      .channel(`waiting:${onlineStore.gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${onlineStore.gameId}`,
      }, (payload) => {
        setOnlinePlayers(prev => {
          if (prev.find(p => p.id === payload.new.id)) return prev
          return [...prev, { id: payload.new.id, nickname: payload.new.nickname }]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameCode])

  // ==================== 本地模式 ====================
  function localStart() {
    store.state.players = []
    store.state.draftPicks = new Map()
    setPlayers([])
    setStep('local_adding')
  }

  function localAddPlayer() {
    if (!nickname.trim()) return
    store.addPlayer(nickname.trim())
    setPlayers(prev => [...prev, nickname.trim()])
    setNickname('')
    if (players.length + 1 >= playerCount) setStep('local_ready')
  }

  function localStartGame() {
    store.startDraft()
    navigate('/draft/local')
  }

  // ==================== 在线模式 ====================
  async function onlineCreate() {
    if (!nickname.trim()) { setError('请输入昵称'); return }
    setLoading(true)
    setError('')
    try {
      const { code } = await onlineStore.createGame(nickname.trim(), playerCount)
      setGameCode(code)
      setStep('online_setup')
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  async function onlineJoin() {
    if (!nickname.trim()) { setError('请输入昵称'); return }
    if (!joinCode.trim()) { setError('请输入加入码'); return }
    setLoading(true)
    setError('')
    try {
      await onlineStore.joinGame(nickname.trim(), joinCode.trim())
      setGameCode(joinCode.trim().toUpperCase())  // 显示等待室
    } catch (e) {
      setError(e instanceof Error ? e.message : '加入失败')
    } finally {
      setLoading(false)
    }
  }

  // ==================== 渲染 ====================
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold mb-3">🎮 胡闹运动会</h1>
        <p className="text-gray-400 text-lg">Magical Athlete Online</p>
      </div>

      {/* ===== 主菜单 ===== */}
      {step === 'menu' && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-4">
          <button onClick={() => setStep('local_setup')}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-purple-600/20">
            🖥️ 本地热座（同一台电脑）
          </button>
          <button onClick={() => setStep('online_setup')}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-blue-600/20">
            🌐 在线联机（多人异地）
          </button>
          <p className="text-xs text-gray-600 text-center pt-2">
            在线联机需要配置 Supabase · 本地热座无需任何配置
          </p>
        </div>
      )}

      {/* ===== 本地模式 ===== */}
      {step === 'local_setup' && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-6">
          <button onClick={() => setStep('menu')} className="text-sm text-gray-500 hover:text-gray-400">← 返回</button>
          <div>
            <label className="block text-sm text-gray-400 mb-3">玩家人数</label>
            <div className="flex gap-2">
              {[2,3,4,5,6].map(n => (
                <button key={n} onClick={() => setPlayerCount(n)}
                  className={`flex-1 py-3 rounded-lg text-lg font-semibold transition-colors ${playerCount === n ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                  {n}人
                </button>
              ))}
            </div>
          </div>
          <button onClick={localStart}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors">
            🎲 开始本地游戏
          </button>
        </div>
      )}

      {step === 'local_adding' && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-4">
          <button onClick={() => setStep('local_setup')} className="text-sm text-gray-500 hover:text-gray-400">← 返回</button>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">添加玩家</h2>
            <span className="text-sm text-gray-400">{players.length}/{playerCount}</span>
          </div>
          <div className="flex gap-2">
            <input type="text" value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && localAddPlayer()}
              placeholder={`玩家${players.length + 1} 昵称...`} maxLength={12}
              className="flex-1 px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500" autoFocus />
            <button onClick={localAddPlayer} disabled={!nickname.trim()}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-semibold transition-colors">加入</button>
          </div>
          {players.length > 0 && (
            <div className="space-y-2 mt-4">
              {players.map((name, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-lg">
                  <span className="text-gray-500 text-sm">#{i+1}</span><span>{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'local_ready' && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-6 text-center">
          <div className="text-6xl mb-2">🎉</div>
          <h2 className="text-xl font-semibold">{playerCount} 位玩家就绪</h2>
          <div className="space-y-2 text-left">
            {players.map((name, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-700 rounded-lg">
                <span className="text-gray-500 text-sm">#{i+1}</span><span>{name}</span>
              </div>
            ))}
          </div>
          <button onClick={localStartGame}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors text-lg">
            🃏 开始轮抽选角
          </button>
          <button onClick={() => setStep('local_setup')} className="w-full py-2 text-sm text-gray-500 hover:text-gray-400">重新设置</button>
        </div>
      )}

      {/* ===== 在线模式 ===== */}
      {step === 'online_setup' && !gameCode && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-5">
          <button onClick={() => setStep('menu')} className="text-sm text-gray-500 hover:text-gray-400">← 返回</button>
          <h2 className="text-xl font-bold flex items-center gap-2">🌐 在线联机</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-3">玩家人数</label>
            <div className="flex gap-2">
              {[2,3,4,5,6].map(n => (
                <button key={n} onClick={() => setPlayerCount(n)}
                  className={`flex-1 py-3 rounded-lg text-lg font-semibold transition-all ${
                    playerCount === n
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}>
                  {n}人
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">你的昵称</label>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder="输入昵称..." maxLength={12}
              className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500" />
          </div>

          <button onClick={onlineCreate} disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl font-semibold text-lg transition-colors shadow-lg shadow-blue-600/20">
            {loading ? '创建中...' : '🌐 创建在线房间'}
          </button>

          <div className="border-t border-gray-700 pt-5">
            <label className="block text-sm text-gray-400 mb-1">加入码</label>
            <div className="flex gap-2">
              <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="输入6位加入码" maxLength={6}
                className="flex-1 px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 uppercase text-lg tracking-widest text-center font-mono" />
              <button onClick={onlineJoin} disabled={loading}
                className="px-8 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-semibold text-lg transition-colors">
                {loading ? '...' : '加入'}
              </button>
            </div>
          </div>
          {error && <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm">{error}</div>}
            {error && <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-2 text-red-300 text-sm">{error}</div>}
          </div>
      )}

      {/* ===== 在线模式：房间已创建 ===== */}
      {step === 'online_setup' && gameCode && (
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md space-y-5 text-center">
          <div className="text-6xl mb-2">🌐</div>
          <h2 className="text-xl font-semibold">房间已创建</h2>
          <div className="bg-gray-700 rounded-xl p-4">
            <div className="text-sm text-gray-400 mb-1">加入码</div>
            <div className="text-4xl font-mono font-bold tracking-widest text-blue-400">{gameCode}</div>
          </div>

          {/* 玩家列表 */}
          <div className="bg-gray-700 rounded-xl p-4 text-left">
            <div className="text-sm text-gray-400 mb-3">
              已加入 ({onlinePlayers.length}人)
            </div>
            <div className="space-y-2">
              {onlinePlayers.map((p, i) => {
                const isMe = p.id === onlineStore.currentUserId
                return (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2 bg-gray-600 rounded-lg">
                    <span className="text-gray-500 text-sm w-6">#{i + 1}</span>
                    <span className="flex-1">{p.nickname}</span>
                    {isMe && (
                      <button
                        onClick={async () => {
                          await supabase.from('game_players').update({ is_ready: true })
                            .eq('id', p.id)
                        }}
                        className="text-xs px-3 py-1 bg-green-600 hover:bg-green-500 rounded transition-colors"
                      >
                        准备
                      </button>
                    )}
                    {!isMe && <span className="text-xs text-green-400">✅ 已准备</span>}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => navigate(`/draft/${onlineStore.gameId}`)}
            disabled={onlinePlayers.length < 2}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {onlinePlayers.length < 2 ? `等待玩家加入... (${onlinePlayers.length}/?)` : '▶️ 开始游戏'}
          </button>
        </div>
      )}

      <p className="mt-8 text-gray-600 text-sm">2-6 人欢乐竞速 · 36 个独特角色 · 千奇百怪的技能</p>
    </div>
  )
}
