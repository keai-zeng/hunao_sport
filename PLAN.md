# 开发计划：胡闹运动会 线上版

## 概述

将桌游《胡闹运动会》（魔法运动员 / Magical Athlete）做成线上版本，供 2-6 人使用。偏向同步在线体验，每回合 3 分钟超时。

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | React 18 + Vite + TypeScript | 单页应用 |
| 后端/数据库 | Supabase | PostgreSQL + 实时订阅 + 认证 |
| 样式 | Tailwind CSS | 快速 UI |
| 状态管理 | React Context + useReducer | 游戏状态 |
| 动画 | framer-motion | 骰子、移动、卡片动画 |
| 部署 | Vercel（前端）+ Supabase（后端）| 免费层足够 |

---

## 阶段一：项目初始化

### 1.1 创建前端项目
- Vite 创建 React + TypeScript 项目
- 依赖：tailwindcss, @supabase/supabase-js, react-router-dom, framer-motion
- 配置 Tailwind、路径别名

### 1.2 创建 Supabase 项目
- 注册 Supabase，获取 API keys
- 配置前端 .env 环境变量

---

## 阶段二：数据库设计

### 2.1 数据库迁移脚本

核心表：

**characters** — 36 角色静态数据
| 字段 | 类型 | 说明 |
|------|------|------|
| id | int PK | 1-36 |
| name_zh | text | 中文名 |
| name_en | text | 英文名 |
| ability_name | text | 技能名称 |
| ability_desc | text | 技能描述 |
| trigger_type | enum | ON_ROLL / ON_PASS / ON_STOP / ON_OTHER_ABILITY / BEFORE_MAIN_MOVE / AFTER_MAIN_MOVE / ON_SHARE_SPACE / PASSIVE / BEFORE_RACE / ON_LEAD |
| effect_type | enum | MOVE_SELF / MOVE_OTHER / WARP / TRIP / REROLL / ELIMINATE / BOOST_MAIN_MOVE / REDUCE_MAIN_MOVE / PREDICT / SKIP_MAIN_MOVE / DUEL / SWAP / COPY_ABILITY / SCORE_CHIP / TURN_ORDER / BLOCK_SPACE |
| effect_params | jsonb | { magnitude, direction, condition } |

**games** — 游戏房间
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| code | text unique | 6位加入码 |
| status | enum | waiting / drafting / selecting_racer / racing / race_end / finished |
| variant | enum | standard / two_player / three_player_double |
| current_race | int | 1-4 |
| track_side | enum | mild / wild（赛程 Mild→Wild→Mild→Wild） |
| current_player_id | uuid FK | 当前回合玩家 |
| draft_batch | int | 1-2（共 2 批蛇形轮抽） |
| draft_direction | enum | forward / backward |
| created_at | timestamptz | |

**game_players** — 玩家-游戏关联
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK | |
| user_id | uuid FK | |
| nickname | text | |
| seat_order | int | 顺时针座位顺序 |
| draft_position | int | 蛇形选秀序号 |
| total_score | int | 累计积分（金银铜总和） |
| is_host | boolean | |
| is_ready | boolean | |

**player_racers** — 轮抽获得的角色
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK | |
| player_id | uuid FK | |
| character_id | int FK | |
| used_in_race | int | 0=未用, 1-4=第几场用了 |

**race_states** — 每场比赛状态
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| game_id | uuid FK | |
| race_number | int | 1-4 |
| status | enum | selecting / racing / finished |
| first_place_player_id | uuid FK | nullable |
| second_place_player_id | uuid FK | nullable |

**race_participants** — 每场比赛的参赛角色
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| race_id | uuid FK | |
| player_id | uuid FK | |
| character_id | int FK | |
| position | int | 当前格子 0-30 |
| is_tripped | boolean | 绊倒状态（跳过下次 main move） |
| is_eliminated | boolean | 是否已淘汰 |
| finish_order | int | nullable, 冲线顺序（1=金牌, 2=银牌） |

**track_spaces** — 🆕 赛道格子配置
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| track_side | enum | mild / wild |
| space_index | int | 0-29（赛道格，不含终点 30） |
| has_arrow | boolean | |
| arrow_direction | enum | forward / backward |
| arrow_distance | int | |
| has_star | boolean | 铜分 +1 |
| has_trip | boolean | 绊倒格 |

> Mild 赛道所有特殊效果字段均为 false。Wild 赛道按布局填充。

**game_events** — 事件日志
| 字段 | 类型 | 说明 |
|------|------|------|
| id | bigserial PK | |
| game_id | uuid FK | |
| race_id | uuid FK | |
| sequence | int | 事件链序号 |
| event_type | enum | ROLL / MAIN_MOVE / STEP / PASS / STOP / TRACK_EFFECT / ABILITY_TRIGGER / EFFECT / TRIP / WARP / ELIMINATE / FINISH / SCORE |
| source_player_id | uuid FK | |
| target_player_id | uuid FK | nullable |
| payload | jsonb | |

### 2.2 填充角色数据
- 36 个完整角色，中英文名称、能力描述、触发类型、效果参数
- 数据来源：`魔法运动员（Magical Athlete）中文规则手册.md`

### 2.3 填充赛道数据
- Mild 赛道：30 格全空
- Wild 赛道：按指定布局填充箭头/星星/绊倒格

### 2.4 开启 Realtime
- 对 games、race_participants、game_events 表开启实时订阅

---

## 阶段三：核心游戏逻辑

### 3.1 骰子系统
- D6 掷骰 + framer-motion 动画
- 支持重掷（Magician 最多 2 次，Dicemonger 每人每回合 1 次）

### 3.2 移动系统
- 直线赛道 31 个位置（pos 0 起点 ~ pos 30 终点）
- 逐格移动、检测触发
- **区分移动类型**：
  - `main_move`：掷骰后的主要移动
  - `ability_move`：技能触发的移动
  - `warp`：传送（不触发经过/停止检测）
  - `arrow_move`：箭头强制移动（独立于 main move）
- 移动 0 不算移动

### 3.3 技能事件引擎（核心）

**三级优先级**（非纯 FIFO）：

```
赛道格效果 → 当前玩家技能 → 其他玩家技能（顺时针）
```

- 同一优先级内按 FIFO 处理
- 循环检测：同技能同回合触发超限 → 完成一次循环后强制结束
- main move 结束后统一处理 pass/stop 触发

事件类型链：
```
ROLL → MAIN_MOVE → [STEP → PASS? → STOP?] → TRACK_EFFECT → ABILITY_TRIGGER → EFFECT → [连锁...] → TURN_END
```

### 3.4 回合管理
- 首场比赛：掷骰决定起始玩家，顺时针轮流
- 后续比赛：上一场排名最后/最先淘汰的玩家先走
- Skipper 掷出 1 时可插入回合顺序
- 每回合流程：掷骰 → main move → 赛道格效果 → 能力连锁 → 回合结束
- **3 分钟超时**自动掷骰移动
- 淘汰检测、冲线判定（第 1 名金牌，第 2 名银牌 + 比赛立即结束）

### 3.5 计分系统
- 🥇 金牌：第 1-4 场分别为 3/4/4/5 分
- 🥈 银牌：第 1-4 场分别为 1/2/2/1 分
- ⭐ 星星：每次 +1 铜分
- 😢 可爱输家：触发时 +1 分
- 🪨 西西弗斯：赛前领 4 分，掷 6 扣 1 分

---

## 阶段四：轮抽系统

### 4.1 蛇形轮抽逻辑
1. 所有人掷骰，最高者先选（平局看次高，全平重掷）
2. 翻 2×人数 张角色卡（3人→6, 4人→8, 5人→10, 6人→12）
3. 蛇形选秀：顺时针 1→N，再逆时针 N→1，每人选 2 张
4. 从起始者左边的人开始第二轮蛇形，再翻 2×人数 张，每人再选 2 张
5. 最终每人 4 个角色

### 4.2 变体轮抽
- 2 人：翻 8 张蛇形 ABBAABBA，再反向一轮，每人 8 角色
- 3 人双角色：翻 6 张蛇形，共 4 轮，每人 8 角色

### 4.3 轮抽 UI
- 角色卡网格展示 + 当前选秀者高亮
- 蛇形顺序指示器 + 已选角色预览
- 选秀倒计时

---

## 阶段五：比赛前选人

- 每场比赛前，从**未使用过**的角色中暗选 1 个
- 同时揭晓：所有人提交后统一推送
- 2 人/3 人变体：每场暗选 2 个角色
- 角色标记放在起点（第 0 格）

---

## 阶段六：UI 页面

### 6.1 大厅页
- 创建游戏（选变体）+ 输入加入码加入
- 等待玩家列表 + 准备按钮

### 6.2 轮抽页
- 角色卡网格 + 蛇形选秀 UI + 已选预览

### 6.3 比赛页
- 赛道视图（Mild 纯色 / Wild 带箭头⭐🪨标记）
- 骰子区域 + 掷骰动画
- 角色能力面板 + 当前回合状态
- 事件日志实时滚动
- 回合倒计时（3 分钟）

### 6.4 计分板
- 金银铜分排行 + 每场名次记录

### 6.5 浏览器通知
- 轮到你的回合时提醒

---

## 阶段七：部署上线

### 7.1 Supabase Auth
- 匿名登录 + 昵称（anon key + 本地 UUID，昵称存 game_players）

### 7.2 部署
- 前端 → Vercel
- Supabase 后端

---

## 项目文件结构

```
src/
├── lib/
│   ├── supabase.ts              # Supabase 客户端
│   ├── gameEngine.ts            # 回合管理、移动、触发检测
│   ├── eventEngine.ts           # 🆕 三级优先级事件引擎
│   ├── draftEngine.ts           # 蛇形轮抽（2批×2选）
│   ├── trackData.ts             # 🆕 Mild/Wild 赛道格子配置
│   └── abilities/               # 36个角色技能实现
├── components/
│   ├── Lobby/                   # 创建/加入/等待
│   ├── Draft/                   # 轮抽界面
│   └── Game/                    # 赛道/骰子/事件日志/计分/角色面板
├── hooks/                       # useGame, useRealtime, useAuth, useTimer
├── pages/                       # HomePage, DraftPage, GamePage, ResultPage
└── supabase/migrations/         # SQL 迁移脚本
```

---

## 关键设计决策

1. **事件优先级**：赛道格 → 当前玩家 → 其他玩家（顺时针），同级 FIFO
2. **赛道 30 格**（pos 0-30，共 31 个位置），Mild 无特效、Wild 带箭头/星星/绊倒
3. **偏同步在线**，3 分钟回合超时
4. **主要移动（main move）** 是独立概念，与技能移动/传送/箭头移动严格区分
5. **计分三层**：金牌 3/4/4/5 + 银牌 1/2/2/1 + 铜牌每次星星 +1
6. **支持 3 种变体**：标准(2-6人)、2人双角色、3人双角色
7. **初期客户端运行事件引擎**，后期可迁 Supabase Edge Functions 防作弊
8. **36 个角色全部实现**，非逐步扩充
