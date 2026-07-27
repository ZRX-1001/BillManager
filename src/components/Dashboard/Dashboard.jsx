import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from 'recharts'
import { useApp } from '../../context/AppContext'
import { getCurrentMonth, getMonthRange, getToday, formatCurrency } from '../../utils/helpers'
import { getDateRangeStats, getCategoryBreakdown, getDailyTrend, getBudgetProgress } from '../../utils/stats'
import styles from './Dashboard.module.css'

// ===== Module definition =====
const ALL_MODULES = [
  { key: 'pie',     title: '分类占比', icon: '📈' },
  { key: 'bar',     title: '分类对比', icon: '📊' },
  { key: 'line',    title: '每日趋势', icon: '📉' },
  { key: 'heatmap',  title: '日历热力', icon: '📅' },
  { key: 'weekday',  title: '周消费分布', icon: '📊' },
  { key: 'histogram',title: '金额分布', icon: '📊' },
  { key: 'topexp',   title: '大额支出', icon: '🏆' },
  { key: 'budget',   title: '预算进度', icon: '🎯' },
]

function getLayoutKey(accountId) {
  return `dashboard-layout-${accountId}`
}

function loadLayout(accountId) {
  const defaults = { order: ALL_MODULES.map(m => m.key), hidden: [] }
  try {
    const raw = localStorage.getItem(getLayoutKey(accountId))
    if (raw) {
      const saved = JSON.parse(raw)
      // Merge: remove keys no longer in ALL_MODULES, add new ones at end
      const validKeys = new Set(ALL_MODULES.map(m => m.key))
      const order = []
      for (const k of saved.order || []) { if (validKeys.has(k) && !order.includes(k)) order.push(k) }
      for (const k of defaults.order) { if (!order.includes(k)) order.push(k) }
      const hidden = (saved.hidden || []).filter(k => validKeys.has(k))
      return { order, hidden }
    }
  } catch {}
  return defaults
}

function saveLayout(accountId, layout) {
  localStorage.setItem(getLayoutKey(accountId), JSON.stringify(layout))
}

// ===== Tooltips =====
const PieTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    const d = payload[0].payload
    return (<div className={styles.tooltip}>{d.icon} {d.name}: {formatCurrency(d.amount)}</div>)
  }
  return null
}

const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (<div className={styles.tooltip}>{label}: {formatCurrency(payload[0].value)}</div>)
  }
  return null
}

const BarTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (<div className={styles.tooltip}><strong>{label}</strong><br/>{payload.map((p, i) => (<div key={i} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</div>))}</div>)
  }
  return null
}

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(ym) { return ym.replace('-', '年') + '月' }

// ===== Draggable wrapper =====
function ModuleWrapper({ module, editMode, dragHandlers, onHide, children }) {
  return (
    <div
      className={`${styles.module} ${editMode ? styles.moduleEditing : ''}`}
      draggable={editMode}
      {...dragHandlers}
    >
      {editMode && (
        <div className={styles.moduleBar}>
          <span className={styles.dragHandle} title="拖动排序">⋮⋮</span>
          <span className={styles.moduleLabel}>{module.icon} {module.title}</span>
          <button className={styles.hideBtn} onClick={onHide} title="隐藏">✕</button>
        </div>
      )}
      {children}
    </div>
  )
}

// ===== Main =====
export default function Dashboard() {
  const { state } = useApp()
  const accountId = state.activeAccountId

  // Layout state
  const [layout, setLayout] = useState(() => loadLayout(accountId))
  const [editMode, setEditMode] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)

  // Reload layout on account switch
  useEffect(() => { setLayout(loadLayout(accountId)); setEditMode(false) }, [accountId])

  const persist = useCallback((newLayout) => {
    setLayout(newLayout)
    saveLayout(accountId, newLayout)
  }, [accountId])

  const visibleKeys = layout.order.filter(k => !layout.hidden.includes(k))
  const hiddenModules = ALL_MODULES.filter(m => layout.hidden.includes(m.key))

  // Filter state
  const [monthStr, setMonthStr] = useState(getCurrentMonth())
  const [useRange, setUseRange] = useState(false)
  const [rangeStart, setRangeStart] = useState(getToday())
  const [rangeEnd, setRangeEnd] = useState(getToday())
  const [selectedCats, setSelectedCats] = useState(null)

  const dateRange = useMemo(() => {
    if (useRange) return { start: rangeStart, end: rangeEnd }
    return getMonthRange(monthStr)
  }, [useRange, monthStr, rangeStart, rangeEnd])

  const filteredExpenses = useMemo(() => {
    let list = state.expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end)
    if (selectedCats) list = list.filter(e => selectedCats.has(e.category))
    return list
  }, [state.expenses, dateRange, selectedCats])

  const stats = useMemo(() => getDateRangeStats(filteredExpenses, dateRange.start, dateRange.end), [filteredExpenses, dateRange])
  const breakdown = useMemo(() => getCategoryBreakdown(filteredExpenses, state.categories), [filteredExpenses, state.categories])
  const trend = useMemo(() => getDailyTrend(filteredExpenses, monthStr, dateRange.start, dateRange.end), [filteredExpenses, monthStr, dateRange])
  const budgets = useMemo(() => getBudgetProgress(state.categories, filteredExpenses, monthStr), [state.categories, filteredExpenses, monthStr])
  // Calendar heatmap data
  const heatmapData = useMemo(() => {
    const dailyMap = {}
    filteredExpenses.forEach(e => { dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount })
    const [y, m] = monthStr.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const firstDow = new Date(y, m - 1, 1).getDay() // 0=Sun
    const maxVal = Math.max(1, ...Object.values(dailyMap))
    const cells = []
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ day: d, date: ds, amount: dailyMap[ds] || 0, intensity: (dailyMap[ds] || 0) / maxVal })
    }
    return { year: y, month: m, firstDow, cells, maxVal }
  }, [filteredExpenses, monthStr])

  // Weekday distribution
  const weekdayData = useMemo(() => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const totals = new Array(7).fill(0)
    const counts = new Array(7).fill(0)
    filteredExpenses.forEach(e => {
      const dow = new Date(e.date).getDay()
      totals[dow] += e.amount
      counts[dow]++
    })
    const maxVal = Math.max(1, ...totals)
    return days.map((name, i) => ({ name, total: totals[i], count: counts[i], pct: maxVal > 0 ? totals[i] / maxVal : 0 }))
  }, [filteredExpenses])

  // Amount histogram
  const histogramData = useMemo(() => {
    const buckets = [
      { label: '0-10', min: 0, max: 10 },
      { label: '10-30', min: 10, max: 30 },
      { label: '30-50', min: 30, max: 50 },
      { label: '50-100', min: 50, max: 100 },
      { label: '100-200', min: 100, max: 200 },
      { label: '200+', min: 200, max: Infinity },
    ]
    const maxCount = Math.max(1, ...buckets.map((_, i) => {
      const b = buckets[i]
      return filteredExpenses.filter(e => e.amount >= b.min && e.amount < b.max).length
    }))
    return buckets.map(b => {
      const count = filteredExpenses.filter(e => e.amount >= b.min && e.amount < b.max).length
      return { ...b, count, pct: count / maxCount }
    })
  }, [filteredExpenses])

  // Top expenses
  const topExpenses = useMemo(() =>
    [...filteredExpenses].sort((a, b) => b.amount - a.amount).slice(0, 10),
    [filteredExpenses]
  )

  const toggleCat = (catId) => {
    setSelectedCats(prev => {
      if (prev === null) return new Set([catId])
      const next = new Set(prev)
      if (next.has(catId)) { next.delete(catId); return next.size === 0 || next.size === state.categories.length ? null : next }
      else { next.add(catId); return next }
    })
  }
  const isCatSelected = (catId) => selectedCats === null || selectedCats.has(catId)

  // Drag handlers
  const onDragStart = (idx) => { setDragIdx(idx) }
  const onDragOver = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newOrder = [...layout.order]
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(idx, 0, moved)
    const newLayout = { ...layout, order: newOrder }
    setLayout(newLayout)
    setDragIdx(idx)
  }
  const onDragEnd = () => {
    if (dragIdx !== null) saveLayout(accountId, layout)
    setDragIdx(null)
  }

  // Hide / restore
  const hideModule = (key) => {
    persist({ ...layout, hidden: [...layout.hidden, key] })
  }
  const restoreModule = (key) => {
    persist({ ...layout, hidden: layout.hidden.filter(k => k !== key) })
  }

  // Auto-exit edit mode on click outside (handled by key press Escape)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setEditMode(false) }
    if (editMode) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editMode])

  // Render a module by key
  const renderModule = (key) => {
    switch (key) {
      case 'pie':
        return breakdown.length > 0 ? (
          <div><h3 className={styles.sectionTitle}>📈 分类占比</h3>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={breakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="amount">{breakdown.map(e => <Cell key={e.id} fill={e.color} stroke="none" />)}</Pie><Tooltip content={<PieTooltip />} /></PieChart></ResponsiveContainer>
              <div className={styles.legend}>{breakdown.map(cat => (<div key={cat.id} className={`${styles.legendItem} ${!isCatSelected(cat.id) ? styles.legendDimmed : ''}`} onClick={() => toggleCat(cat.id)}><span className={styles.legendDot} style={{ background: cat.color }} /><span>{cat.icon} {cat.name}</span><span className={styles.legendPct}>{((cat.amount / stats.total) * 100).toFixed(1)}%</span></div>))}</div>
            </div>
          </div>
        ) : <div className={styles.emptyChart}><span>📭</span><p>暂无数据</p></div>
      case 'bar':
        return breakdown.length > 0 ? (
          <div><h3 className={styles.sectionTitle}>📊 分类对比</h3>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height={Math.max(180, breakdown.length * 40)}><BarChart data={breakdown} layout="vertical" margin={{ left: 40, right: 60, top: 5, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} /><XAxis type="number" tick={{ fontSize: 11, fill: '#999' }} /><YAxis type="category" dataKey="name" tick={({ x, y, payload }) => { const cat = breakdown.find(c => c.name === payload.value); return (<text x={x - 8} y={y + 4} textAnchor="end" fontSize={13} fill="var(--text)">{cat?.icon} {payload.value}</text>) }} /><Tooltip content={<BarTooltip />} /><Bar dataKey="amount" radius={[0, 6, 6, 0]}>{breakdown.map(e => <Cell key={e.id} fill={e.color} />)}</Bar></BarChart></ResponsiveContainer>
            </div>
          </div>
        ) : null
      case 'line':
        return trend.length > 0 && trend.some(d => d.amount > 0) ? (
          <div><h3 className={styles.sectionTitle}>📉 每日趋势</h3>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height={200}><LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} interval={Math.max(0, Math.floor(trend.length / 8))} /><YAxis tick={{ fontSize: 10, fill: '#999' }} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="amount" stroke="#6c5ce7" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#6c5ce7' }} /></LineChart></ResponsiveContainer>
            </div>
          </div>
        ) : null
      case 'heatmap':
        return heatmapData.cells.length > 0 ? (
          <div><h3 className={styles.sectionTitle}>📅 日历热力</h3>
            <div className={styles.heatmap}>
              <div className={styles.heatmapHeader}>
                {['日','一','二','三','四','五','六'].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className={styles.heatmapGrid}>
                {Array.from({ length: heatmapData.firstDow }, (_, i) => <span key={'e'+i} />)}
                {heatmapData.cells.map(c => (
                  <span key={c.day} className={styles.heatCell}
                    style={{ background: c.amount > 0 ? `rgba(108,92,231,${0.1 + c.intensity * 0.85})` : 'var(--tag-bg)' }}
                    title={`${c.date}: ${formatCurrency(c.amount)}`}
                  >{c.day}</span>
                ))}
              </div>
              <div className={styles.heatLegend}>
                <span>低</span><span className={styles.heatSwatch} style={{background:'rgba(108,92,231,0.1)'}}/>
                <span className={styles.heatSwatch} style={{background:'rgba(108,92,231,0.4)'}}/>
                <span className={styles.heatSwatch} style={{background:'rgba(108,92,231,0.7)'}}/>
                <span className={styles.heatSwatch} style={{background:'rgba(108,92,231,0.95)'}}/>
                <span>高</span>
              </div>
            </div>
          </div>
        ) : null
      case 'weekday':
        return weekdayData.some(d => d.total > 0) ? (
          <div><h3 className={styles.sectionTitle}>📊 周消费分布</h3>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekdayData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      return (<div className={styles.tooltip}><strong>{label}</strong><br/>总支出: {formatCurrency(payload[0].payload.total)}<br/>笔数: {payload[0].payload.count} 笔</div>)
                    }
                    return null
                  }} />
                  <Bar dataKey="total" radius={[4,4,0,0]}>{weekdayData.map((d, i) => (
                    <Cell key={i} fill={[6,0].includes(i) ? '#a29bfe' : '#6c5ce7'} />
                  ))}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null
      case 'histogram':
        return histogramData.some(d => d.count > 0) ? (
          <div><h3 className={styles.sectionTitle}>📊 金额分布</h3>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={histogramData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#999' }} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (active && payload?.length) {
                      return (<div className={styles.tooltip}><strong>{label}元</strong><br/>{payload[0].payload.count} 笔支出</div>)
                    }
                    return null
                  }} />
                  <Bar dataKey="count" fill="#6c5ce7" radius={[4,4,0,0]} name="笔数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null
      case 'topexp':
        return topExpenses.length > 0 ? (
          <div><h3 className={styles.sectionTitle}>🏆 大额支出 Top 10</h3>
            <div className={styles.topList}>
              {topExpenses.map((e, i) => {
                const cat = state.categories.find(c => c.id === e.category) || {}
                return (
                  <div key={e.id} className={styles.topItem}>
                    <span className={styles.topRank}>#{i + 1}</span>
                    <span className={styles.topCat} style={{background: (cat.color || '#999') + '20', color: cat.color}}>{cat.icon} {cat.name}</span>
                    <span className={styles.topDesc}>{e.description || e.date}</span>
                    <span className={styles.topAmount}>{formatCurrency(e.amount, state.settings.currencySymbol)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null
      case 'budget':
        return budgets.length > 0 ? (
          <div><h3 className={styles.sectionTitle}>🎯 预算进度</h3>
            <div className={styles.budgetList}>{budgets.map(b => (<div key={b.id} className={styles.budgetItem}><div className={styles.budgetHeader}><span>{b.icon} {b.name}</span><span className={b.overBudget ? styles.overBudget : ''}>{formatCurrency(b.spent, state.settings.currencySymbol)} / {formatCurrency(b.budget, state.settings.currencySymbol)}</span></div><div className={styles.progressBar}><div className={`${styles.progressFill} ${b.overBudget ? styles.progressOver : ''}`} style={{ width: `${Math.min(b.percentage, 100)}%`, background: b.overBudget ? 'var(--danger)' : b.color }} /></div><div className={styles.budgetPercent}>{b.overBudget ? '⚠️ 已超预算' : `${b.percentage}%`}</div></div>))}</div>
          </div>
        ) : null
      default: return null
    }
  }

  return (
    <div className={styles.container}>
      {/* ===== Filter Bar (always visible, not customizable) ===== */}
      <div className={styles.filterBar}>
        <div className={styles.monthRow}>
          <button className={styles.arrowBtn} onClick={() => setMonthStr(addMonths(monthStr, -1))}>◀</button>
          <span className={styles.monthLabel}>{monthLabel(monthStr)}</span>
          <button className={styles.arrowBtn} onClick={() => setMonthStr(addMonths(monthStr, 1))}>▶</button>
          <button className={`${styles.rangeToggle} ${useRange ? styles.rangeActive : ''}`} onClick={() => setUseRange(!useRange)}>日期范围</button>
          <button
            className={`${styles.editToggle} ${editMode ? styles.editActive : ''}`}
            onClick={() => setEditMode(!editMode)}
            title="自定义布局"
          >
            🔧
          </button>
        </div>
        {useRange && (
          <div className={styles.rangeRow}>
            <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} />
            <span>至</span>
            <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} />
          </div>
        )}
        <div className={styles.catTags}>
          <button className={`${styles.catTag} ${selectedCats === null ? styles.catTagActive : ''}`} onClick={() => setSelectedCats(null)}>全部</button>
          {state.categories.map(cat => (
            <button key={cat.id} className={`${styles.catTag} ${isCatSelected(cat.id) ? styles.catTagActive : ''}`}
              style={isCatSelected(cat.id) ? { background: cat.color, color: '#fff', borderColor: cat.color } : {}}
              onClick={() => toggleCat(cat.id)}>{cat.icon} {cat.name}</button>
          ))}
        </div>
      </div>

      {/* ===== Summary Cards (fixed, not customizable) ===== */}
      <div className={styles.cards}>
        <div className={styles.card}><span className={styles.cardIcon}>💳</span><div className={styles.cardLabel}>总支出</div><div className={styles.cardValue}>{formatCurrency(stats.total, state.settings.currencySymbol)}</div></div>
        <div className={styles.card}><span className={styles.cardIcon}>📊</span><div className={styles.cardLabel}>日均支出</div><div className={styles.cardValue}>{formatCurrency(stats.dailyAvg, state.settings.currencySymbol)}</div></div>
        <div className={styles.card}><span className={styles.cardIcon}>📝</span><div className={styles.cardLabel}>记账笔数</div><div className={styles.cardValue}>{stats.count} 笔</div></div>
        <div className={styles.card}><span className={styles.cardIcon}>🔥</span><div className={styles.cardLabel}>最高单笔</div><div className={styles.cardValue}>{stats.count > 0 ? formatCurrency(Math.max(...filteredExpenses.map(e => e.amount)), state.settings.currencySymbol) : '--'}</div></div>
      </div>

      {/* ===== Customizable Modules ===== */}
      <div className={styles.chartGrid}>
        {visibleKeys.map((key, idx) => {
          const mod = ALL_MODULES.find(m => m.key === key)
          if (!mod) return null
          const content = renderModule(key)
          if (!content) return null // empty module = no render
          return (
            <ModuleWrapper
              key={key}
              module={mod}
              editMode={editMode}
              dragHandlers={{
                onDragStart: () => onDragStart(idx),
                onDragOver: (e) => onDragOver(e, idx),
                onDragEnd: onDragEnd,
              }}
              onHide={() => hideModule(key)}
            >
              {content}
            </ModuleWrapper>
          )
        })}
      </div>

      {/* ===== Hidden module restore ===== */}
      {hiddenModules.length > 0 && (
        <div className={styles.hiddenBar}>
          <span className={styles.hiddenLabel}>已隐藏：</span>
          {hiddenModules.map(mod => (
            <button key={mod.key} className={styles.restoreChip} onClick={() => restoreModule(mod.key)}>
              {mod.icon} {mod.title} ↶
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
