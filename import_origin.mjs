import fs from 'fs'
import path from 'path'

const ORIGIN_DIR = './origin'
const OUTPUT_FILE = './记账数据_导入.json'

const CATEGORIES = {
  food:          { id: 'food', name: '餐饮', icon: '🍚', color: '#FF6B6B' },
  transport:     { id: 'transport', name: '交通', icon: '🚌', color: '#4ECDC4' },
  shopping:      { id: 'shopping', name: '购物', icon: '🛒', color: '#45B7D1' },
  housing:       { id: 'housing', name: '住房', icon: '🏠', color: '#96CEB4' },
  entertainment: { id: 'entertainment', name: '娱乐', icon: '🎮', color: '#FFEAA7' },
  medical:       { id: 'medical', name: '医疗', icon: '💊', color: '#DDA0DD' },
  education:     { id: 'education', name: '教育', icon: '📚', color: '#98D8C8' },
  snacks:        { id: 'snacks', name: '零食', icon: '🍿', color: '#F8B500' },
  gift:          { id: 'gift', name: '礼物', icon: '🎁', color: '#FF85A2' },
  payfor:        { id: 'payfor', name: '代付', icon: '🤝', color: '#74B9FF' },
  redpacket:     { id: 'redpacket', name: '红包', icon: '🧧', color: '#E74C3C' },
  other:         { id: 'other', name: '其他', icon: '💡', color: '#B8B8B8' },
}

// Classification: first-match-wins
const RULES = [
  [/^红包/, 'redpacket'],
  [/^(给|帮).*(带|买)/, 'payfor'],
  [/^带饭.*(帮|超模|于|祝|唐|王)/, 'payfor'],
  [/^(于|祝)[\d.+]/, 'payfor'],
  [/^(米饭|香蕉|超模|wtq).*(帮|带|买)/, 'payfor'],
  [/^超模.*(买饭|带)/, 'payfor'],
  [/^(礼物|礼品)/, 'gift'],
  [/^wtq/, 'gift'],
  [/^(药|止咳|退烧|感冒|创可|碘伏|棉签|口罩|体温)/, 'medical'],
  [/^(书费|打印|考试费|报名费|买书|六级|四级|api|token|网盘会员|计算器|尺子|橡皮|买书)/, 'education'],
  [/^api/, 'education'],
  [/^token/, 'education'],
  [/^(车费|地铁|打车|坐车|乘车|共享单车|骑车|自行车|地铁卡|车票|候补|观光|火车|机票|公交|滴滴)/, 'transport'],
  [/^(水费|电费|洗澡|热水|饮用水|淋浴|插线板|床帘)/, 'housing'],
  [/^(买水|水[^费]|矿泉水|纯净水|苏打水|白开水)/, 'food'],
  [/^(游戏|台球|麻将|羽毛|脱口秀|网费|丝之歌|刀皮|网咖|KTV|唱歌|桌游|蹦迪|酒吧|棋牌)/, 'entertainment'],
  [/^(娱乐|门票|观光|景区)/, 'entertainment'],
  [/^网费/, 'entertainment'],
  [/^(手机膜|充电线|梳子|袜子|香薰|牙膏|沐浴露|洗发水|短袖|doro|键帽|腕力球|洗鞋|优惠卡|联动|鞋架|香皂)/, 'shopping'],
  [/^(零食|薯片|锅巴|笋|酸奶|瑞士卷|麻薯|月饼|冰杯|西米露|提拉米|方糕|冰激凌|雪糕|炒酸奶|蛋糕|蜜瓜|榴莲酥|甜点)/, 'snacks'],
  [/^(购物|手机膜|充电线|梳子|袜子|香薰|牙膏|沐浴露|洗发水|短袖|doro|键帽|腕力球|洗鞋|优惠卡|联动|鞋架|香皂)/, 'shopping'],
  [/^(洗衣|洗衣服|干洗|pdd|拼多多|淘宝|京东|天猫|抖音)/, 'shopping'],
  [/^(伞|指甲|发卡|橡皮|梳|镜|U盘|插线板|计算器|尺子|手机壳)/, 'shopping'],
  [/^(早饭|午饭|晚饭|夜宵|早|午|晚|夜|饭|面|粉|线|馄饨|饺子|汉堡|披萨|烧烤|火锅|烤肉|自助|麻辣烫|炸鸡|鸡排|kfc|KFC|肯德基|麦当劳|塔斯汀|华莱士|必胜客|喜仕屋|米村|沙县|兰州|岐山|大排|黄焖|猪脚|咖喱|瓦香|卤肉|叉烧|烧腊|牛肉|羊肉|鸡肉|鸭|鱼|虾|蟹|蛋|菜|肉|汤|粥|饼|包|馒|卷|饭团|便当|盒饭|小吃|煎饼|烤冷面|凉皮|香肠|炒饭|炒面|炒粉|盖浇|盖饭|拌面|拌饭|焖面|烩|拉面|刀削|biang|宝岛|裕禧|膳当家|老娘舅|袁记|千里香|暖锅|吃饭|砂锅|米线|肠|章鱼|丸子|麻食|糖葫芦|鸡锅|鸡)/, 'food'],
  [/^(中午|晚上|早晨|上午|下午|中午饭|傍晚|宵夜)/, 'food'],
  [/^(饮料|奶茶|可乐|雪碧|蜜雪|冰城|茶百道|瑞幸|星巴克|咖啡|红茶|绿茶|柠檬|百香|金桔|西瓜|牛乳|芋泥|豆奶|豆浆|牛奶|酒|啤|阿萨姆|水动|红牛|冰杯|方糕)/, 'food'],
  [/^(方便面|泡面|火鸡面)/, 'food'],
  [/^(可口可乐)/, 'food'],
  [/^可乐/, 'food'],
  [/^雪碧/, 'food'],
  [/^打印/, 'education'],
  [/^电费/, 'housing'],
  [/^水费/, 'housing'],
  [/^热水/, 'housing'],
  [/^开水/, 'housing'],
  [/^饮料/, 'food'],
  [/^奶茶/, 'food'],
  [/^冰/, 'snacks'],
  [/^雪糕/, 'snacks'],
  [/^烤肠/, 'food'],
  [/^肠/, 'food'],
  [/^考肠/, 'food'],
  [/^炒年糕/, 'food'],
  [/^米饭/, 'food'],
  [/^烧饼/, 'food'],
  [/^贴膜/, 'shopping'],
  [/^纸/, 'shopping'],
  [/^鸡排/, 'shopping'],
  [/^正新/, 'shopping'],
  [/^键盘/, 'shopping'],
  [/^门票/, 'entertainment'],
  [/^旅游/, 'transport'],
  [/^莲子/, 'snacks'],
  [/^小菜/, 'food'],
  [/^疯狂/, 'food'],
  [/^带饭/, 'payfor'],
  [/^kfc/i, 'food'],
  [/./, 'other'],
]

function classify(text) {
  for (const [pattern, cat] of RULES) {
    if (pattern.test(text)) return cat
  }
  return 'other'
}

// Parse a single line: extract description + amount(s)
function parseLine(text) {
  const raw = text.trim()
  if (!raw) return null

  // Skip investment lines only
  if (/^(投资|理财|股票|基金)/.test(raw)) {
    return { skip: true, reason: 'investment' }
  }

  // Check if this is a treated/gifted entry (no money spent)
  const hasDigits = /\d/.test(raw)
  // Lines with no digits mentioning 请客/请喝/送/赠 = treated/gifted
  const isTreated = !hasDigits && /(请客|请喝|赠送|请[我你他她]的?|送|赠)/.test(raw)

  // Handle *N notation: "洗衣2.55*2" → amount = 2.55 * 2
  const starMatch = raw.match(/(\d+\.?\d*)\s*\*\s*(\d+)/g)
  let processed = raw
  if (starMatch) {
    for (const s of starMatch) {
      const [num, mult] = s.split('*').map(x => parseFloat(x.trim()))
      const total = Math.round(num * mult * 100) / 100
      processed = processed.replace(s, String(total))
    }
  }

  // Extract amounts
  // Strategy: find the last sequence of numbers and operators (+ * =)
  const priceSection = processed.match(/[\d.+*=]+$/)?.[0] || ''

  let desc = processed.slice(0, processed.length - priceSection.length).trim()
  desc = desc.replace(/[+=]+$/g, '').trim()

  if (!desc) {
    desc = raw.replace(/[（(].*[)）]/g, '').trim()
    desc = desc.replace(/[\d.+*= ]+$/g, '').trim()
  }

  // Extract amounts from price section
  const amountStr = priceSection
  const amounts = []
  const parts = amountStr.split('+')
  for (const part of parts) {
    const clean = part.split('=')[0].trim()
    const num = parseFloat(clean)
    if (!isNaN(num) && num > 0 && num < 100000) {
      amounts.push(Math.round(num * 100) / 100)
    }
  }

  if (amounts.length === 0) {
    const nums = raw.match(/(\d+\.?\d*)/g)
    if (nums) {
      for (const n of nums) {
        const num = parseFloat(n)
        if (!isNaN(num) && num > 0 && num < 100000) {
          amounts.push(num)
        }
      }
    }
  }

  // Handle treated/gifted: if no amount found, use 0
  if (isTreated) {
    if (amounts.length === 0) {
      amounts.push(0)
    }
    // Prefix description with marker
    if (/请客/.test(raw)) desc = '【请客】' + (desc || raw)
    else if (/赠送|送的/.test(raw)) desc = '【赠送】' + (desc || raw)
    else desc = '【请客】' + (desc || raw)
  }

  if (amounts.length === 0) {
    return { skip: true, reason: 'no amount' }
  }

  return {
    skip: false,
    desc: desc || raw.replace(/[\d.+*= ]+$/g, '').trim() || raw,
    amounts,
    rawLine: desc || raw,
    cat: classify(raw),
  }
}

// ===== Main parser =====
let idCounter = 0
function generateId() {
  idCounter++
  return 'imp' + Date.now().toString(36) + String(idCounter)
}

function readAllFiles() {
  const results = []
  const years = fs.readdirSync(ORIGIN_DIR)

  for (const yearDir of years) {
    const yearPath = path.join(ORIGIN_DIR, yearDir)
    if (!fs.statSync(yearPath).isDirectory()) continue
    const year = parseInt(yearDir)
    if (isNaN(year)) continue

    const files = fs.readdirSync(yearPath).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(yearPath, file), 'utf-8')
      const lines = content.split('\n')

      let currentMonth = null
      let currentDay = null

      for (const line of lines) {
        const t = line.trim()
        if (!t) continue

        // Check date header: "M.D" where M=1-12, D=1-31
        const dm = t.match(/^(\d{1,2})\.(\d{1,2})$/)
        if (dm) {
          const m = parseInt(dm[1]), d = parseInt(dm[2])
          if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
            currentMonth = m
            currentDay = d
            continue
          }
        }

        if (currentMonth === null || currentDay === null) continue

        const parsed = parseLine(t)
        if (!parsed || parsed.skip) continue

        const dateStr = `${year}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

        for (const amount of parsed.amounts) {
          if (amount < 0 || amount >= 90000) continue
          results.push({
            id: generateId(),
            amount: amount,
            category: parsed.cat,
            date: dateStr,
            description: parsed.desc || parsed.rawLine,
            createdAt: new Date().toISOString(),
          })
        }
      }
    }
  }

  return results
}

// ===== Run =====
console.log('Reading origin files...')
const expenses = readAllFiles()
console.log(`Parsed ${expenses.length} expense entries\n`)

// Summary by category
const catStats = {}
for (const e of expenses) {
  if (!catStats[e.category]) catStats[e.category] = { count: 0, total: 0 }
  catStats[e.category].count++
  catStats[e.category].total += e.amount
}
console.log('Category breakdown:')
const ordered = Object.entries(catStats).sort((a, b) => b[1].total - a[1].total)
for (const [cat, s] of ordered) {
  const name = CATEGORIES[cat]?.name || cat
  console.log(`  ${name}: ${s.count} 条, ¥${s.total.toFixed(2)}`)
}

const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)
console.log(`\n总计: ${expenses.length} 条, ¥${grandTotal.toFixed(2)}`)

// Show some samples per category
console.log('\n--- Sample entries per category ---')
for (const [catId, cat] of Object.entries(CATEGORIES)) {
  const samples = expenses.filter(e => e.category === catId).slice(0, 3)
  if (samples.length > 0) {
    console.log(`\n${cat.icon} ${cat.name}:`)
    for (const s of samples) {
      console.log(`  ${s.date}  ¥${s.amount.toFixed(2)}  ${s.description}`)
    }
  }
}

// Build output
const output = {
  version: 1,
  exportedAt: new Date().toISOString(),
  expenses: expenses.sort((a, b) => a.date.localeCompare(b.date)),
  categories: Object.values(CATEGORIES),
  settings: { currency: 'CNY', currencySymbol: '¥' },
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8')
console.log(`\n\n✅ Wrote ${OUTPUT_FILE}`)
console.log('Import this file via Settings → 数据管理 → 导入 JSON')
