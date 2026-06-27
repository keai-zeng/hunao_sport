import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'

// 模拟角色数据（实际应从 Supabase 加载）
const MOCK_CHARACTERS = [
  { id: 1, nameZh: '炼金术士', nameEn: 'Alchemist', abilityDesc: '掷出1或2时改为移动4格' },
  { id: 5, nameZh: '半人马', nameEn: 'Centaur', abilityDesc: '经过他人时踢退2格' },
  { id: 7, nameZh: '香蕉', nameEn: 'Banana', abilityDesc: '绊倒经过我的赛车手' },
  { id: 10, nameZh: '决斗者', nameEn: 'Duelist', abilityDesc: '同格时发起决斗' },
  { id: 15, nameZh: '巨型宝宝', nameEn: 'Huge Baby', abilityDesc: '无人能与我同格' },
  { id: 20, nameZh: '大长腿', nameEn: 'Legs', abilityDesc: '不掷骰直接走5格' },
  { id: 24, nameZh: '大嘴巴', nameEn: 'M.O.U.T.H.', abilityDesc: '停在恰好1人格时淘汰对方' },
  { id: 26, nameZh: '魔术师', nameEn: 'Magician', abilityDesc: '可重掷最多2次' },
  { id: 32, nameZh: '蹭蹭狗', nameEn: 'Scoocher', abilityDesc: '别人技能触发时移动1格' },
  { id: 14, nameZh: '黏黏怪', nameEn: 'Gunk', abilityDesc: '其他赛车手main move -1' },
  { id: 3, nameZh: '教练', nameEn: 'Coach', abilityDesc: '同格全员main move +1' },
  { id: 27, nameZh: '派对动物', nameEn: 'Party Animal', abilityDesc: '全员向我移动1格' },
]

export default function DraftPage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const [picked, setPicked] = useState<number[]>([])
  const [batch, setBatch] = useState(1)
  const maxPicks = 4

  function pickCharacter(id: number) {
    if (picked.includes(id)) return
    if (picked.length >= maxPicks) return

    const newPicked = [...picked, id]
    setPicked(newPicked)

    if (newPicked.length >= maxPicks) {
      if (batch < 2) {
        setBatch(2)
      } else {
        // 轮抽完成 → 进入比赛
        setTimeout(() => navigate(`/game/${gameId}`), 500)
      }
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">📋 轮抽选角</h1>
            <p className="text-gray-400 mt-1">
              第 {batch}/2 轮 · 已选 {picked.length}/{maxPicks} 个
            </p>
          </div>
          <div className="text-sm text-gray-500">
            房间: {gameId?.slice(0, 8)}...
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-8">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${(picked.length / maxPicks) * 100}%` }}
          />
        </div>

        {/* 角色卡片网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
          {MOCK_CHARACTERS.map(char => {
            const isPicked = picked.includes(char.id)
            return (
              <button
                key={char.id}
                onClick={() => pickCharacter(char.id)}
                disabled={isPicked || picked.length >= maxPicks}
                className={`relative p-4 rounded-xl text-left transition-all ${
                  isPicked
                    ? 'bg-purple-900/50 border-2 border-purple-500 opacity-50'
                    : 'bg-gray-800 border-2 border-gray-700 hover:border-purple-400 hover:bg-gray-750 cursor-pointer'
                }`}
              >
                <div className="text-3xl mb-2">
                  {isPicked ? '✅' : '🃏'}
                </div>
                <div className="font-semibold text-sm">{char.nameZh}</div>
                <div className="text-xs text-gray-500">{char.nameEn}</div>
                <div className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {char.abilityDesc}
                </div>
              </button>
            )
          })}
        </div>

        {/* 已选角色预览 */}
        {picked.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-4">
            <h2 className="text-sm text-gray-400 mb-3">你的队伍</h2>
            <div className="flex gap-2">
              {picked.map(id => {
                const char = MOCK_CHARACTERS.find(c => c.id === id)
                return (
                  <div key={id} className="bg-purple-900/30 rounded-lg px-3 py-2 text-sm">
                    {char?.nameZh ?? id}
                  </div>
                )
              })}
              {Array.from({ length: maxPicks - picked.length }).map((_, i) => (
                <div key={`empty-${i}`} className="border border-dashed border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-600">
                  空位
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
